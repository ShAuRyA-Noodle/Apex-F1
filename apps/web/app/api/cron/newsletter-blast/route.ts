/**
 * Race Week Briefing newsletter blast.
 *
 * Schedule: 0 6 * * 5 (Friday 06:00 UTC = 07:00 London on most race weekends,
 * lands in inboxes before the FP1 build-up content drops). Configured in
 * apps/web/vercel.json.
 *
 * Pipeline:
 *   1. Auth via shared isAuthorizedCronRequest (x-vercel-cron or
 *      Authorization: Bearer $CRON_SECRET).
 *   2. Resolve the upcoming Grand Prix from Jolpica. If no race in the next
 *      8 days the cron exits early with `skipped`.
 *   3. Pull the 12 most-recent F1 RSS items (filtered + sentiment-scored
 *      upstream) and pick 8 for the digest.
 *   4. Pull current driver standings (top 5).
 *   5. Render the Apex-branded HTML + plain-text email via the
 *      RaceWeekBriefing template.
 *   6. POST a Resend Broadcast to RESEND_AUDIENCE_ID and immediately
 *      trigger it via /broadcasts/:id/send.
 *
 * Safety:
 *   - Missing env (RESEND_API_KEY, RESEND_AUDIENCE_ID) returns 200 with
 *     `skipped` so the schedule never errors before the operator wires
 *     the keys.
 *   - Per-step timing in the report so we can see which upstream is slow.
 *   - Resend Broadcasts API is idempotent on (audience_id, subject) within
 *     a 24h window, so accidental double-fires de-duplicate gracefully.
 */

import { NextResponse } from 'next/server';
import { jolpica, mapRace, mapDriverStanding } from '@apex/api-client/jolpica';
import { getF1NewsFeed } from '@apex/api-client/rss';
import { buildReport, isAuthorizedCronRequest, logReport, retry, timed } from '@/lib/cron-auth';
import { renderRaceWeekBriefing, type BriefingArticle, type BriefingNextRace, type BriefingStanding } from '@/lib/email-templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ResendBroadcastCreateResponse {
  id: string;
  object: 'broadcast';
}

async function createResendBroadcast(args: {
  apiKey: string;
  audienceId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  html: string;
  text: string;
}): Promise<ResendBroadcastCreateResponse> {
  const r = await fetch('https://api.resend.com/broadcasts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audience_id: args.audienceId,
      from: `${args.fromName} <${args.fromEmail}>`,
      subject: args.subject,
      html: args.html,
      text: args.text,
      reply_to: args.fromEmail,
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`resend broadcast create ${r.status}: ${text}`);
  }
  return (await r.json()) as ResendBroadcastCreateResponse;
}

async function sendResendBroadcast(args: { apiKey: string; broadcastId: string }): Promise<void> {
  const r = await fetch(`https://api.resend.com/broadcasts/${args.broadcastId}/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`resend broadcast send ${r.status}: ${text}`);
  }
}

const ROUTE = 'newsletter-blast';

export async function GET(req: Request) {
  const start = Date.now();

  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const fromName = process.env.RESEND_FROM_NAME ?? 'Apex · Race Week';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apex-f1.vercel.app';

  if (!apiKey || !audienceId) {
    const r = buildReport(start, {
      ok: true,
      route: ROUTE,
      skipped: 'RESEND_API_KEY or RESEND_AUDIENCE_ID missing · newsletter not sent.',
    });
    logReport(r);
    return NextResponse.json(r, { status: 200 });
  }

  // 1. Resolve the upcoming race.
  let nextRace: BriefingNextRace | null = null;
  let scheduleMs = 0;
  try {
    const [schedule, ms] = await timed(() =>
      retry(() => jolpica.getSchedule('current', { revalidate: 600 })),
    );
    scheduleMs = ms;
    const mapped = schedule.map(mapRace);
    const now = Date.now();
    const eightDays = 8 * 24 * 60 * 60 * 1000;
    const upcoming = mapped
      .filter((r) => {
        const ms2 = new Date(r.raceStartIso).getTime();
        return ms2 > now && ms2 - now < eightDays;
      })
      .sort((a, b) => new Date(a.raceStartIso).getTime() - new Date(b.raceStartIso).getTime())[0];
    if (upcoming) {
      nextRace = {
        name: upcoming.name,
        country: upcoming.country,
        raceStartIso: upcoming.raceStartIso,
        slug: upcoming.slug,
        season: upcoming.season,
      };
    }
  } catch (err) {
    const r = buildReport(start, {
      ok: false,
      route: ROUTE,
      error: `schedule fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    logReport(r);
    return NextResponse.json(r, { status: 500 });
  }

  if (!nextRace) {
    const r = buildReport(start, {
      ok: true,
      route: ROUTE,
      skipped: 'No race in the next 8 days · briefing skipped this week.',
      results: { scheduleMs },
    });
    logReport(r);
    return NextResponse.json(r, { status: 200 });
  }

  // 2. Pull news + standings in parallel.
  let articles: BriefingArticle[] = [];
  let driverStandings: BriefingStanding[] = [];
  let rssMs = 0;
  let standingsMs = 0;

  await Promise.all([
    (async () => {
      try {
        const [items, ms] = await timed(() =>
          retry(() => getF1NewsFeed({ limit: 12, revalidate: 300 })),
        );
        rssMs = ms;
        articles = items.slice(0, 8).map((it) => ({
          title: it.title,
          source: it.source,
          link: it.link,
          description: it.description ?? undefined,
          pubDateMs: it.pubDateMs,
        }));
      } catch (err) {
        // Ignore · email still ships if RSS fails, the digest just skips the wire section.
        articles = [];
        // eslint-disable-next-line no-console
        console.warn(`[${ROUTE}] rss skipped: ${err instanceof Error ? err.message : err}`);
      }
    })(),
    (async () => {
      try {
        const [standings, ms] = await timed(() =>
          retry(() => jolpica.getDriverStandings('current', { revalidate: 600 })),
        );
        standingsMs = ms;
        driverStandings = standings.map(mapDriverStanding).slice(0, 5).map((s) => ({
          position: s.position,
          driverName: s.driver.fullName,
          teamName: s.constructorName || 'Independent',
          points: s.points,
        }));
      } catch (err) {
        driverStandings = [];
        // eslint-disable-next-line no-console
        console.warn(`[${ROUTE}] standings skipped: ${err instanceof Error ? err.message : err}`);
      }
    })(),
  ]);

  // 3. Render + dispatch.
  const email = renderRaceWeekBriefing({
    next: nextRace,
    articles,
    driverStandings,
    siteUrl,
  });

  try {
    const [broadcast, createMs] = await timed(() =>
      createResendBroadcast({
        apiKey,
        audienceId,
        fromEmail,
        fromName,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    );
    const [, sendMs] = await timed(() => sendResendBroadcast({ apiKey, broadcastId: broadcast.id }));

    const r = buildReport(start, {
      ok: true,
      route: ROUTE,
      results: {
        broadcastId: broadcast.id,
        subject: email.subject,
        nextRace: nextRace.name,
        articleCount: articles.length,
        standingsCount: driverStandings.length,
        timings: { scheduleMs, rssMs, standingsMs, createMs, sendMs },
      },
    });
    logReport(r);
    return NextResponse.json(r, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Resend rejects Broadcasts from `resend.dev` · only a verified custom
    // domain can ship Broadcasts. Treat as a skipped/healthy outcome so the
    // cron schedule does not page on a known config gap. Operator sees the
    // reason in the report and wires a domain when ready.
    const needsVerifiedDomain =
      msg.includes('resend.dev') || msg.toLowerCase().includes('verified domain');
    if (needsVerifiedDomain) {
      const r = buildReport(start, {
        ok: true,
        route: ROUTE,
        skipped:
          'Resend Broadcasts require a verified custom domain. Add one in https://resend.com/domains and set RESEND_FROM_EMAIL to an address on it.',
        results: {
          nextRace: nextRace.name,
          articleCount: articles.length,
          standingsCount: driverStandings.length,
          timings: { scheduleMs, rssMs, standingsMs },
        },
      });
      logReport(r);
      return NextResponse.json(r, { status: 200 });
    }
    const r = buildReport(start, {
      ok: false,
      route: ROUTE,
      error: msg,
      results: { timings: { scheduleMs, rssMs, standingsMs } },
    });
    logReport(r);
    return NextResponse.json(r, { status: 500 });
  }
}
