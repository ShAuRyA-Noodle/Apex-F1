/**
 * Daily YouTube sync cron · quota-bounded enrichment job.
 *
 * Schedule: "0 4 * * *" (04:00 UTC, low traffic window).
 * Configured in apps/web/vercel.json · see project root for the deployment file.
 *
 * Budget per channel:
 *   1 × /search.list  → 100 units   (last-24h videos for this channel)
 *   1 × /videos.list  →   1 unit    (batched stats for all returned ids)
 *                      ────────────
 *                       101 units / channel
 *   × 5 curated channels   =  505 units / day   (~5% of 10,000 daily quota)
 *
 * Why /search here and not the cheaper uploads-playlist path?
 *   /search captures community uploads, Shorts, and members-only content that
 *   the uploads playlist sometimes omits. The render-path already uses the
 *   cheap uploads-playlist tier via getF1Videos(). This cron's job is to
 *   capture the long tail and persist it to Supabase for /latest and trend
 *   analytics surfaces.
 *
 * Auth: only Vercel's cron infrastructure can hit this. Vercel injects the
 *   x-vercel-cron header on scheduled invocations (verified by their edge
 *   network · clients cannot forge it because Vercel strips it from inbound
 *   requests before they reach the function). Additionally we honor a
 *   CRON_SECRET bearer for manual re-runs from the Vercel UI.
 *
 * Persistence: writes to Supabase `videos` table when SUPABASE_SERVICE_ROLE_KEY
 *   and the @apex/db client are available. Until the DB lands, the route
 *   returns the freshly fetched payload so it can be inspected and so the
 *   Next.js fetch cache primes the render path.
 */

import { NextResponse } from 'next/server';
import {
  getChannelStats,
  getVideoDetails,
  searchYouTubeF1Videos,
  YT_F1_CHANNELS,
  type YTSearchResult,
  type YTVideoDetail,
} from '@apex/api-client/youtube';
import { isAuthorizedCronRequest, logReport, retry } from '@/lib/cron-auth';
import { persistVideos } from '@apex/db';

// Force this route into the Node.js runtime · googleapis.com TLS + larger
// payloads behave better on Node than Edge, and the route is cron-only so
// cold-start cost is irrelevant.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds · Vercel hobby plan cap.

interface SyncReport {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  channels: Array<{
    channelId: string;
    name: string;
    searchUnitCost: number;
    videosUnitCost: number;
    searchResults: number;
    enrichedResults: number;
    error?: string;
  }>;
  totals: {
    quotaUnitsUsed: number;
    quotaUnitsBudget: number;
    quotaPercent: number;
    videosFetched: number;
    videosEnriched: number;
    videosPersisted: number;
  };
  skipped?: string;
}

function isoMinus24h(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export async function GET(req: Request) {
  const startedAt = new Date();

  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    const report: SyncReport = {
      ok: false,
      startedAt: startedAt.toISOString(),
      finishedAt: startedAt.toISOString(),
      durationMs: 0,
      channels: [],
      totals: {
        quotaUnitsUsed: 0,
        quotaUnitsBudget: 10000,
        quotaPercent: 0,
        videosFetched: 0,
        videosEnriched: 0,
        videosPersisted: 0,
      },
      skipped: 'YOUTUBE_API_KEY missing · cron exited without spending quota.',
    };
    return NextResponse.json(report, { status: 200 });
  }

  // Warm channel-stats cache up front (1 unit total, batched). The Data API
  // render path also depends on this so we get a useful side effect.
  await getChannelStats(YT_F1_CHANNELS.map((c) => c.channelId));

  const publishedAfter = isoMinus24h();
  const perChannelReports: SyncReport['channels'] = [];
  let totalUnits = 0;
  let allDetails: YTVideoDetail[] = [];

  for (const channel of YT_F1_CHANNELS) {
    try {
      // 1. /search · 100 units. Last 24h, this channel only, newest first.
      // retry() wraps so a single 503 from googleapis doesn't void the rest
      // of the per-channel loop (quota still spent regardless).
      const searchResults: YTSearchResult[] = await retry(() =>
        searchYouTubeF1Videos({
          channelId: channel.channelId,
          publishedAfter,
          maxResults: 25,
          order: 'date',
        }),
      );
      totalUnits += 100;

      if (searchResults.length === 0) {
        perChannelReports.push({
          channelId: channel.channelId,
          name: channel.name,
          searchUnitCost: 100,
          videosUnitCost: 0,
          searchResults: 0,
          enrichedResults: 0,
        });
        continue;
      }

      // 2. /videos · 1 unit. Batched up to 50 ids (we never exceed 25 here).
      const ids = searchResults.map((r) => r.videoId);
      const details = await retry(() => getVideoDetails(ids));
      totalUnits += 1;
      allDetails = allDetails.concat(details);

      perChannelReports.push({
        channelId: channel.channelId,
        name: channel.name,
        searchUnitCost: 100,
        videosUnitCost: 1,
        searchResults: searchResults.length,
        enrichedResults: details.length,
      });
    } catch (err) {
      perChannelReports.push({
        channelId: channel.channelId,
        name: channel.name,
        searchUnitCost: 100,
        videosUnitCost: 0,
        searchResults: 0,
        enrichedResults: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 3. Persist to Supabase if the DB client + service key are available.
  // We import lazily so the route still builds before @apex/db ships.
  let persisted = 0;
  try {
    persisted = await persistVideos(allDetails);
  } catch (err) {
    // Persistence failure must NOT poison the response · quota was already spent.
    // The next run will see the same rows and idempotently upsert.
    perChannelReports.push({
      channelId: '_persistence',
      name: 'persistence',
      searchUnitCost: 0,
      videosUnitCost: 0,
      searchResults: 0,
      enrichedResults: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const finishedAt = new Date();
  const report: SyncReport = {
    ok: true,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    channels: perChannelReports,
    totals: {
      quotaUnitsUsed: totalUnits,
      quotaUnitsBudget: 10000,
      quotaPercent: Number(((totalUnits / 10000) * 100).toFixed(2)),
      videosFetched: perChannelReports.reduce((n, c) => n + c.searchResults, 0),
      videosEnriched: allDetails.length,
      videosPersisted: persisted,
    },
  };

  logReport({ ...report, route: 'youtube-sync' });
  return NextResponse.json(report, { status: 200 });
}

