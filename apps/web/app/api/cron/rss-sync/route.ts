/**
 * RSS + multi-source news sync cron.
 *
 * Fires every 5 minutes — keeps the Next.js fetch cache primed for every
 * news provider so /latest and the homepage rails always serve fresh data
 * regardless of human traffic. The Next.js cache layer dedupes upstream
 * requests within the revalidate window, so a single cron tick is exactly
 * one request per provider — never more.
 *
 * Schedule: every 5 min via apps/web/vercel.json.
 * Auth: Vercel cron header OR Bearer CRON_SECRET.
 * Idempotent: re-running mid-window is a no-op (cache hits).
 *
 * Persistence: Phase C writes new articles to Supabase. Until DB lands,
 * the route returns counts so manual runs can be inspected.
 */

import { NextResponse } from 'next/server';
import { getF1NewsFeed } from '@apex/api-client/rss';
import { revalidatePath, revalidateTag } from 'next/cache';
import { buildReport, isAuthorizedCronRequest, logReport, retry, timed } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const start = Date.now();

  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const counts: Record<string, number> = {};
  let total = 0;
  let error: string | undefined;
  let fetchMs = 0;

  try {
    const [items, ms] = await timed(() => retry(() => getF1NewsFeed({ limit: 120, revalidate: 300 })));
    fetchMs = ms;
    total = items.length;
    for (const it of items) {
      const key = it.source ?? 'unknown';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    try {
      revalidatePath('/latest');
      revalidatePath('/');
      revalidateTag('news-feed', 'page');
    } catch {
      /* revalidate APIs only available in handler context */
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const report = buildReport(start, {
    ok: !error,
    route: 'rss-sync',
    results: { total, sources: counts, fetchMs },
    ...(error ? { error } : {}),
  });
  logReport(report);
  return NextResponse.json(report, { status: error ? 500 : 200 });
}
