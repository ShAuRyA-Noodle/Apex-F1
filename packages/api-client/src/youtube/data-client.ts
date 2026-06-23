/**
 * YouTube Data API v3 client.
 *
 * Quota model:
 *   Default project quota = 10,000 units/day.
 *     /search.list      → 100 units per call (expensive, cron-only)
 *     /videos.list      → 1 unit per call, up to 50 ids batched
 *     /channels.list    → 1 unit per call, up to 50 ids batched
 *     /playlistItems.list → 1 unit per call
 *
 * Budgeting rules enforced here:
 *   1. /search is NEVER called from a render path. The only caller allowed is the
 *      daily cron route (apps/web/app/api/cron/youtube-sync/route.ts). The cron
 *      writes results to Supabase; render code reads from cache or DB.
 *   2. /videos and /channels are cheap (1 unit) and wrapped in long-lived
 *      Next.js fetch caches so render-path traffic does not burn quota.
 *   3. Every call is wrapped in try/catch. On error we return [] so a quota
 *      exhaustion never breaks the page; the channel-RSS fallback path picks
 *      up in apps/web via index.ts.
 *
 * Auth: API key in `key` query param (header auth requires OAuth).
 * Base: https://www.googleapis.com/youtube/v3
 */

const BASE = 'https://www.googleapis.com/youtube/v3';

// ─── Public result types ────────────────────────────────────────────────────

export interface YTSearchResult {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  publishedAt: string; // ISO-8601
  thumbnailUrl: string;
}

export interface YTVideoDetail {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  durationSeconds: number; // parsed from ISO-8601 contentDetails.duration
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  categoryId: string;
  /** YouTube status.embeddable · false means iframe will refuse to play. */
  embeddable: boolean;
  /** YouTube status.privacyStatus · only 'public' videos are safely embeddable. */
  privacyStatus: 'public' | 'unlisted' | 'private' | 'unknown';
  /** YouTube contentDetails.regionRestriction · if present, embed is region-gated. */
  regionBlocked: boolean;
}

export interface YTChannelStats {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  uploadsPlaylistId: string;
}

export interface YTPlaylistItem {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  position: number;
}

// ─── Raw API shapes (mirror YouTube payloads exactly) ───────────────────────

interface RawThumb {
  url: string;
  width?: number;
  height?: number;
}

interface RawThumbnails {
  default?: RawThumb;
  medium?: RawThumb;
  high?: RawThumb;
  standard?: RawThumb;
  maxres?: RawThumb;
}

interface RawSearchItem {
  id: { kind: string; videoId?: string; channelId?: string; playlistId?: string };
  snippet: {
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    title: string;
    description: string;
    thumbnails: RawThumbnails;
  };
}

interface RawSearchResponse {
  items?: RawSearchItem[];
  nextPageToken?: string;
  pageInfo?: { totalResults: number; resultsPerPage: number };
  error?: { code: number; message: string };
}

interface RawVideoItem {
  id: string;
  snippet?: {
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    title: string;
    description: string;
    thumbnails: RawThumbnails;
    tags?: string[];
    categoryId?: string;
  };
  contentDetails?: {
    duration: string;
    regionRestriction?: { allowed?: string[]; blocked?: string[] };
  };
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
    uploadStatus?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface RawVideosResponse {
  items?: RawVideoItem[];
  error?: { code: number; message: string };
}

interface RawChannelItem {
  id: string;
  snippet?: {
    title: string;
    description: string;
    thumbnails: RawThumbnails;
  };
  contentDetails?: {
    relatedPlaylists?: { uploads?: string };
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
  };
}

interface RawChannelsResponse {
  items?: RawChannelItem[];
  error?: { code: number; message: string };
}

interface RawPlaylistItem {
  snippet?: {
    publishedAt: string;
    title: string;
    description: string;
    channelTitle: string;
    position: number;
    resourceId?: { kind: string; videoId?: string };
    thumbnails: RawThumbnails;
  };
}

interface RawPlaylistResponse {
  items?: RawPlaylistItem[];
  nextPageToken?: string;
  error?: { code: number; message: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function pickThumb(t: RawThumbnails | undefined): string {
  if (!t) return '';
  return (
    t.maxres?.url ??
    t.standard?.url ??
    t.high?.url ??
    t.medium?.url ??
    t.default?.url ??
    ''
  );
}

/**
 * Parse ISO-8601 duration (PT#H#M#S) → seconds.
 * Examples: PT15M33S → 933, PT1H2M3S → 3723, P1DT2H → 93600.
 */
export function parseISO8601Duration(iso: string): number {
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m) return 0;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const minutes = Number(m[3] ?? 0);
  const seconds = Number(m[4] ?? 0);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

function toInt(s: string | undefined): number {
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function getKey(): string {
  return process.env.YOUTUBE_API_KEY ?? '';
}

interface InternalFetchOpts {
  /** Next.js ISR revalidate seconds. */
  revalidate: number;
}

async function ytGet<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  opts: InternalFetchOpts,
): Promise<T | null> {
  const key = getKey();
  if (!key) return null;

  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  url.searchParams.set('key', key);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: opts.revalidate },
    } as RequestInit);
    if (!res.ok) {
      // 403 = quota exhausted, 400 = bad key. Either way, swallow and let caller fall back.
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── /search.list · 100 units. CRON ONLY. ───────────────────────────────────

export interface SearchOpts {
  /** Free-text query. Defaults to "Formula 1". */
  q?: string;
  /** Limit to a single channel (recommended). */
  channelId?: string;
  /** ISO date · videos published after this instant. */
  publishedAfter?: string;
  /** 1-50. Defaults to 25. */
  maxResults?: number;
  /** Order. Defaults to 'date' (newest first). */
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
}

/**
 * /search.list · 100 quota units per call.
 *
 * Do NOT call from render path. Use only from cron jobs. Cached 6h as a
 * belt-and-suspenders measure against accidental re-invocation.
 */
export async function searchYouTubeF1Videos(opts: SearchOpts = {}): Promise<YTSearchResult[]> {
  const data = await ytGet<RawSearchResponse>(
    'search',
    {
      part: 'snippet',
      type: 'video',
      q: opts.q ?? 'Formula 1',
      channelId: opts.channelId,
      publishedAfter: opts.publishedAfter,
      maxResults: Math.min(Math.max(opts.maxResults ?? 25, 1), 50),
      order: opts.order ?? 'date',
      safeSearch: 'none',
    },
    { revalidate: 6 * 60 * 60 },
  );

  if (!data?.items) return [];

  return data.items
    .filter((it): it is RawSearchItem & { id: { videoId: string } } => Boolean(it.id?.videoId))
    .map((it) => ({
      videoId: it.id.videoId ?? '',
      channelId: it.snippet.channelId,
      channelTitle: it.snippet.channelTitle,
      title: it.snippet.title,
      description: it.snippet.description,
      publishedAt: it.snippet.publishedAt,
      thumbnailUrl: pickThumb(it.snippet.thumbnails),
    }));
}

// ─── /videos.list · 1 unit per call, batched 50 ids. ────────────────────────

/**
 * Fetch full video details (statistics + contentDetails) for up to N videos.
 * Auto-batches 50 ids per call. Cached 24h.
 */
export async function getVideoDetails(videoIds: string[]): Promise<YTVideoDetail[]> {
  const ids = Array.from(new Set(videoIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const batches = chunk(ids, 50);
  const responses = await Promise.all(
    batches.map((batch) =>
      ytGet<RawVideosResponse>(
        'videos',
        {
          part: 'snippet,contentDetails,statistics,status',
          id: batch.join(','),
          maxResults: 50,
        },
        { revalidate: 24 * 60 * 60 },
      ),
    ),
  );

  const out: YTVideoDetail[] = [];
  for (const data of responses) {
    if (!data?.items) continue;
    for (const it of data.items) {
      if (!it.snippet) continue;
      const rr = it.contentDetails?.regionRestriction;
      const privacy = it.status?.privacyStatus;
      const privacyStatus: 'public' | 'unlisted' | 'private' | 'unknown' =
        privacy === 'public' || privacy === 'unlisted' || privacy === 'private'
          ? privacy
          : 'unknown';
      out.push({
        videoId: it.id,
        title: it.snippet.title,
        description: it.snippet.description,
        channelId: it.snippet.channelId,
        channelTitle: it.snippet.channelTitle,
        publishedAt: it.snippet.publishedAt,
        thumbnailUrl: pickThumb(it.snippet.thumbnails),
        durationSeconds: parseISO8601Duration(it.contentDetails?.duration ?? ''),
        viewCount: toInt(it.statistics?.viewCount),
        likeCount: toInt(it.statistics?.likeCount),
        commentCount: toInt(it.statistics?.commentCount),
        tags: it.snippet.tags ?? [],
        categoryId: it.snippet.categoryId ?? '',
        // Default to true when status absent so we don't filter out the entire
        // RSS fallback path (which has no status data at all).
        embeddable: it.status?.embeddable ?? true,
        privacyStatus,
        regionBlocked: Boolean(rr?.blocked && rr.blocked.length > 0),
      });
    }
  }
  return out;
}

// ─── /channels.list · 1 unit per call, batched 50 ids. ──────────────────────

/**
 * Fetch channel statistics (subscribers, totals, uploads playlist).
 * Cached 7 days · subscriber counts change slowly.
 */
export async function getChannelStats(channelIds: string[]): Promise<YTChannelStats[]> {
  const ids = Array.from(new Set(channelIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const batches = chunk(ids, 50);
  const responses = await Promise.all(
    batches.map((batch) =>
      ytGet<RawChannelsResponse>(
        'channels',
        {
          part: 'snippet,contentDetails,statistics',
          id: batch.join(','),
          maxResults: 50,
        },
        { revalidate: 7 * 24 * 60 * 60 },
      ),
    ),
  );

  const out: YTChannelStats[] = [];
  for (const data of responses) {
    if (!data?.items) continue;
    for (const it of data.items) {
      out.push({
        channelId: it.id,
        title: it.snippet?.title ?? '',
        description: it.snippet?.description ?? '',
        thumbnailUrl: pickThumb(it.snippet?.thumbnails),
        subscriberCount: toInt(it.statistics?.subscriberCount),
        videoCount: toInt(it.statistics?.videoCount),
        viewCount: toInt(it.statistics?.viewCount),
        uploadsPlaylistId: it.contentDetails?.relatedPlaylists?.uploads ?? '',
      });
    }
  }
  return out;
}

// ─── /playlistItems.list · 1 unit per call. ─────────────────────────────────

/**
 * Fetch items from a playlist. Used for "uploads" playlist of a channel,
 * which is a quota-cheap alternative to /search for recent uploads.
 */
export async function getPlaylistItems(
  playlistId: string,
  maxResults = 25,
): Promise<YTPlaylistItem[]> {
  const data = await ytGet<RawPlaylistResponse>(
    'playlistItems',
    {
      part: 'snippet',
      playlistId,
      maxResults: Math.min(Math.max(maxResults, 1), 50),
    },
    { revalidate: 60 * 60 }, // 1h · uploads list moves with each new upload
  );

  if (!data?.items) return [];

  return data.items
    .filter((it) => Boolean(it.snippet?.resourceId?.videoId))
    .map((it) => ({
      videoId: it.snippet?.resourceId?.videoId ?? '',
      title: it.snippet?.title ?? '',
      description: it.snippet?.description ?? '',
      channelTitle: it.snippet?.channelTitle ?? '',
      publishedAt: it.snippet?.publishedAt ?? '',
      thumbnailUrl: pickThumb(it.snippet?.thumbnails),
      position: it.snippet?.position ?? 0,
    }));
}

/** Convenience: true if YOUTUBE_API_KEY is present in env. */
export function hasYouTubeApiKey(): boolean {
  return Boolean(getKey());
}
