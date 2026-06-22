/**
 * YouTube provider — two-tier strategy.
 *
 *  Tier 1 (preferred): YouTube Data API v3 via ./data-client
 *      Activated when process.env.YOUTUBE_API_KEY is set. Gives real view
 *      counts, exact durations, subscriber counts, and channel thumbnails.
 *      Quota-budgeted: render-path uses /videos (1 unit) + /channels (1 unit),
 *      both with long Next.js caches. /search is cron-only.
 *
 *  Tier 2 (fallback): channel-RSS via youtube.com/feeds/videos.xml
 *      Activated automatically when YOUTUBE_API_KEY is missing. Free, no key,
 *      no quota — but no view counts, no duration, no subscriber data. UI
 *      degrades gracefully via the `enriched` discriminator in mappers.ts.
 *
 *  getF1Videos() picks the tier at call time. Per project rule #1 (NO mock
 *  data), if the Data API errors out and RSS also returns empty, the function
 *  returns [] and the caller renders the empty state.
 */

import { getRssFeed, type RssItem } from '../rss';
import {
  getChannelStats,
  getPlaylistItems,
  getVideoDetails,
  hasYouTubeApiKey,
  type YTPlaylistItem,
} from './data-client';
import {
  channelStatsMap,
  sortNewestFirst,
  toEnrichedVideo,
  type YouTubeVideoEnriched,
} from './mappers';

// ─── RSS-baseline types (unchanged public surface) ──────────────────────────

export interface YouTubeVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channelName: string;
  publishedAt: string;
  publishedMs: number;
  description?: string;
}

export interface YouTubeChannelSource {
  name: string;
  channelId: string;
}

// Public channel-RSS feeds. No API key required.
export const YT_F1_CHANNELS: YouTubeChannelSource[] = [
  { name: 'FORMULA 1', channelId: 'UCB_qr75-ydFVKSF9Dmo6izg' },
  { name: 'Chain Bear', channelId: 'UCK01ZhWlMV4kHANXFhGUUKQ' },
  { name: 'WTF1', channelId: 'UCqzwM8m2-mLPjQwQTvCJp_g' },
  { name: 'Tommo F1', channelId: 'UCpf4kPmiMUjKHr-W-rOLg2A' },
  { name: 'Driver61', channelId: 'UCcQrxs2sUEdOlVfsNNxgX6w' },
];

// ─── Re-exports ─────────────────────────────────────────────────────────────

export * from './data-client';
export * from './mappers';

// ─── RSS path ───────────────────────────────────────────────────────────────

function videoIdFromAtomLink(link: string): string {
  const m = link.match(/[?&]v=([\w-]+)/);
  return m?.[1] ?? '';
}

function bestThumb(videoId: string, fallback?: string): string {
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return fallback ?? '';
}

async function fetchChannelFeed(
  ch: YouTubeChannelSource,
  revalidate: number,
): Promise<YouTubeVideo[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
  const items = await getRssFeed(
    { name: ch.name, url, homepage: 'https://www.youtube.com' },
    { revalidate },
  );
  return items.map((it: RssItem): YouTubeVideo => {
    const videoId = videoIdFromAtomLink(it.link);
    return {
      videoId,
      title: it.title,
      url: it.link,
      thumbnailUrl: bestThumb(videoId, it.imageUrl),
      channelName: ch.name,
      publishedAt: it.pubDate,
      publishedMs: it.pubDateMs,
      description: it.description,
    };
  });
}

/** Aggregate via channel-RSS only. Always works, no key required. */
async function getF1VideosViaRss(opts: {
  limit?: number;
  channels?: YouTubeChannelSource[];
  revalidate?: number;
}): Promise<YouTubeVideo[]> {
  const channels = opts.channels ?? YT_F1_CHANNELS;
  const revalidate = opts.revalidate ?? 1800;
  const results = await Promise.all(channels.map((c) => fetchChannelFeed(c, revalidate)));
  const merged = results.flat();
  merged.sort((a, b) => b.publishedMs - a.publishedMs);
  return opts.limit ? merged.slice(0, opts.limit) : merged;
}

// ─── Data API path ──────────────────────────────────────────────────────────

/**
 * Quota-cheap latest-uploads via the channel's "uploads" playlist:
 *   /channels.list (1 unit, batched, cached 7d)  → uploads playlist ids
 *   /playlistItems.list (1 unit/channel, cached 1h) → recent video ids
 *   /videos.list (1 unit, batched 50, cached 24h) → durations + stats
 *
 * Total at warm cache: 0 units. Cold: ~ N+1+1 units for N channels. With our
 * 5-channel curated set that is 7 units in the worst case — versus 500 units
 * if we used /search per channel. /search is reserved for the cron route.
 */
async function getF1VideosViaDataApi(opts: {
  limit?: number;
  channels?: YouTubeChannelSource[];
}): Promise<YouTubeVideoEnriched[]> {
  const channels = opts.channels ?? YT_F1_CHANNELS;
  const perChannel = Math.max(opts.limit ?? 16, 8);

  // 1. Channel stats — gives us uploads playlist id + subscriber/thumb decoration.
  const stats = await getChannelStats(channels.map((c) => c.channelId));
  if (stats.length === 0) return [];
  const statsById = channelStatsMap(stats);

  // 2. Pull recent items from each channel's uploads playlist.
  const playlistResults = await Promise.all(
    stats
      .filter((s) => s.uploadsPlaylistId)
      .map((s) => getPlaylistItems(s.uploadsPlaylistId, perChannel)),
  );
  const playlistItems: YTPlaylistItem[] = playlistResults.flat();
  if (playlistItems.length === 0) return [];

  // 3. Fetch durations + statistics in batches of 50.
  const allVideoIds = playlistItems.map((p) => p.videoId).filter(Boolean);
  const details = await getVideoDetails(allVideoIds);
  if (details.length === 0) return [];

  // 4. Map → enriched UI shape, sort newest first, apply limit.
  const enriched = details.map((d) => toEnrichedVideo(d, statsById));
  const sorted = sortNewestFirst(enriched);
  return opts.limit ? sorted.slice(0, opts.limit) : sorted;
}

// ─── Public entry point ─────────────────────────────────────────────────────

export interface GetF1VideosOpts {
  limit?: number;
  channels?: YouTubeChannelSource[];
  /** Revalidate hint for the RSS fallback path. Ignored on Data API path. */
  revalidate?: number;
  /** Force RSS path even if YOUTUBE_API_KEY is set (useful for tests). */
  forceRss?: boolean;
}

/**
 * Aggregate latest videos across the curated F1 channel set.
 *
 *   - When YOUTUBE_API_KEY is present (and forceRss is false): returns
 *     YouTubeVideoEnriched[] — real view counts, exact duration, subscriber
 *     counts. Components should narrow with `isEnriched(v)`.
 *   - When the key is missing OR the Data API call returns empty (quota /
 *     network error): falls back to channel-RSS and returns YouTubeVideo[].
 *     UI gets fewer fields but the page still renders.
 *
 * Return type is the discriminated-union AnyYouTubeVideo[] so callers can
 * keep one rendering code path.
 */
export async function getF1Videos(
  opts: GetF1VideosOpts = {},
): Promise<Array<YouTubeVideo | YouTubeVideoEnriched>> {
  const useDataApi = !opts.forceRss && hasYouTubeApiKey();

  if (useDataApi) {
    const enriched = await getF1VideosViaDataApi({
      limit: opts.limit,
      channels: opts.channels,
    });
    if (enriched.length > 0) return enriched;
    // Data API returned nothing (quota, key invalid, channels missing). Fall through.
  }

  return getF1VideosViaRss({
    limit: opts.limit,
    channels: opts.channels,
    revalidate: opts.revalidate,
  });
}
