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
import { buildReport, isAuthorizedCronRequest } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const start = Date.now();

  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let counts: Record<string, number> = {};
  let total = 0;
  let error: string | undefined;

  try {
    const items = await getF1NewsFeed({ limit: 120, revalidate: 300 });
    total = items.length;
    for (const it of items) {
      const key = it.source ?? 'unknown';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    // Push freshness into Next.js cache by busting any tagged surfaces.
    try {
      revalidatePath('/latest');
      revalidatePath('/');
      // Next.js 16 requires a profile arg on revalidateTag.
      revalidateTag('news-feed', 'page');
    } catch {
      // revalidate APIs only available in handler context; ignore failures
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(
    buildReport(start, {
      ok: !error,
      results: { total, sources: counts },
      ...(error ? { error } : {}),
    }),
    { status: error ? 500 : 200 },
  );
}
