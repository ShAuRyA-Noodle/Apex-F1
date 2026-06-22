// Giphy API v1 raw response shapes.
// Docs: https://developers.giphy.com/docs/api/endpoint
//
// =========================================================================
// FREE / BETA TIER CONSTRAINTS - read before tuning
// =========================================================================
//
// 1) RATE LIMIT (Beta key): 100 requests / hour, 1,000 requests / 24h.
//    Production keys require Giphy review + an app submission. Apex is on
//    the Beta tier until traffic justifies the prod review, so EVERY call
//    site must be ISR-cached. The client floors `revalidate` at 24h.
//
// 2) ATTRIBUTION REQUIRED: per Giphy ToS we must show "Powered by GIPHY"
//    on any surface that renders a GIF. The PoweredByGiphy badge component
//    enforces this; never render a raw <img src={gif.url}/> without it.
//
// 3) RATING: we always pin to `g` so reaction GIFs stay SFW. Even on the
//    /predict fail state. No PG-13+ content surfaces on Apex.
//
// 4) NO API KEY: when GIPHY_API_KEY is unset we return [] immediately and
//    do not hit the network. Matches the project's "no mock data" rule.
//
// =========================================================================

/** Endpoint base URL (no trailing slash). */
export const GIPHY_BASE = 'https://api.giphy.com/v1';

/** Beta tier ceilings - see file header. */
export const GIPHY_BETA_HOURLY_LIMIT = 100;
export const GIPHY_BETA_DAILY_LIMIT = 1000;

/** Hard ceiling on `limit` per request (Giphy returns 400 above 50). */
export const GIPHY_MAX_LIMIT_PER_REQUEST = 50;

/** Content rating filter. We hard-pin to `g` across the app. */
export type GiphyRating = 'g' | 'pg' | 'pg-13' | 'r';

/** Supported `lang` 2-letter codes (subset). */
export type GiphyLang = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'nl' | 'ja' | 'zh';

/** Query parameters accepted by /gifs/search. */
export interface GiphySearchParams {
  /** Required - the search term. */
  q: string;
  /** Required - the api key (we set this server-side from process.env). */
  api_key: string;
  /** Max items to return. Cap 50. Default 25 on Giphy's side. */
  limit?: number;
  /** Pagination offset. Default 0. */
  offset?: number;
  /** Content rating. We always send `g`. */
  rating?: GiphyRating;
  /** Language hint. Default `en`. */
  lang?: GiphyLang;
  /** Optional random_id for session-stable shuffle. Unused on Apex. */
  random_id?: string;
}

/** A single render variant of a GIF (Giphy returns ~25 of these per item). */
export interface GiphyImageRendition {
  /** Asset URL (gif / mp4 / webp depending on rendition). */
  url: string;
  /** Pixel width as a string (Giphy ships everything stringified). */
  width: string;
  /** Pixel height as a string. */
  height: string;
  /** Bytesize as a string. May be absent on a handful of renditions. */
  size?: string;
  /** MP4 mirror URL (only on certain renditions). */
  mp4?: string;
  /** MP4 size. */
  mp4_size?: string;
  /** WebP mirror URL. */
  webp?: string;
  /** WebP size. */
  webp_size?: string;
}

/**
 * The `images` object on a Giphy result. We only declare the renditions Apex
 * actually consumes; the API ships ~25 but the rest are dead weight.
 *
 *  - `original`            - source upload, no resizing. Use only if you need
 *                            the canonical dimensions; can be large.
 *  - `fixed_height`        - 200px tall, width auto. Good rail thumbnail.
 *  - `fixed_height_small`  - 100px tall. Inline-with-text use.
 *  - `downsized_medium`    - <= 5MB. Safe default for the PredictResult card.
 *  - `preview_gif`         - tiny, low-quality. Lazy-load placeholder.
 *  - `original_still`      - single-frame JPG of the original. Poster image.
 */
export interface GiphyImages {
  original: GiphyImageRendition;
  fixed_height: GiphyImageRendition;
  fixed_height_small: GiphyImageRendition;
  downsized_medium: GiphyImageRendition;
  preview_gif: GiphyImageRendition;
  original_still: GiphyImageRendition;
  /** Anything else Giphy adds in future. We don't type these. */
  [key: string]: GiphyImageRendition;
}

/** Per-result user block. Often missing on stock reaction GIFs. */
export interface GiphyUser {
  username: string;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  is_verified: boolean;
}

/** A single GIF result. */
export interface GiphyGif {
  /** Stable Giphy id, e.g. "3oEduOnl5IHM5NRodO". */
  id: string;
  /** Display title - sometimes a slugified version of the search query. */
  title: string;
  /** Public landing page on giphy.com. Used for attribution click-through. */
  url: string;
  /** Slug of the landing page. */
  slug: string;
  /** Source domain the GIF was scraped from (may be ""). */
  source: string;
  /** Top-level rating. Will equal our requested rating. */
  rating: GiphyRating;
  /** ISO-8601 publication timestamp. */
  import_datetime: string;
  /** Trending datetime if currently trending, else "0000-00-00 00:00:00". */
  trending_datetime: string;
  /** All renditions. We only consume the ones declared above. */
  images: GiphyImages;
  /** Uploader. Optional. */
  user?: GiphyUser;
}

/** Pagination block on every list response. */
export interface GiphyPagination {
  /** Items returned in this page. */
  count: number;
  /** Total items available across all pages. */
  total_count: number;
  /** Offset of this page. */
  offset: number;
}

/** Meta block on every list response. */
export interface GiphyMeta {
  /** HTTP-style status, e.g. 200. */
  status: number;
  /** Human-readable status, e.g. "OK". */
  msg: string;
  /** Per-request id - useful when filing Giphy support tickets. */
  response_id: string;
}

/** Successful /gifs/search envelope. */
export interface GiphySearchResponse {
  data: GiphyGif[];
  pagination: GiphyPagination;
  meta: GiphyMeta;
}

/**
 * Error envelope. Giphy returns this with HTTP 4xx (bad key, over-limit) and
 * occasionally with HTTP 200 + meta.status > 299. We treat either as failure.
 */
export interface GiphyErrorResponse {
  data: [] | Record<string, never>;
  meta: GiphyMeta;
}

/** Discriminated union. */
export type GiphyResponse = GiphySearchResponse | GiphyErrorResponse;

/** Narrowing helper - true when the envelope is an error or empty payload. */
export function isGiphyError(r: GiphyResponse): r is GiphyErrorResponse {
  if (!r || !r.meta) return true;
  if (r.meta.status >= 300) return true;
  if (!Array.isArray((r as GiphySearchResponse).data)) return true;
  return false;
}

// -------------------------------------------------------------------------
// Curated query bank - one canonical place for every reaction-GIF call site.
// Centralising this keeps the cache hit-rate high (every PredictResult card
// for a given outcome reuses the same Next.js ISR slot) and prevents drift
// where one route searches "f1 win" and another searches "verstappen wins".
// -------------------------------------------------------------------------

/**
 * Use-case keys mapped to the literal search strings we send to Giphy.
 *
 * Important caching note: each query string is a separate ISR entry, so
 * we deliberately keep the list short (3 per state). At ~3 queries x 5
 * surfaces = 15 unique strings across the platform, every query is hit
 * many times per 24h cache window, comfortably under the 1k/day cap.
 */
export const GIPHY_REACTION_QUERIES = {
  /** Picks scored well (>= 6 pts). Celebratory. */
  predictWin: ['f1 celebration', 'verstappen happy', 'hamilton smile'],
  /** Picks tanked (< 3 pts). Self-deprecating, never mean. */
  predictFail: ['f1 dnf', 'facepalm', 'shock'],
  /** 404 / lost-page surface. Light, not apologetic. */
  notFound: ['car crash funny', 'out of fuel'],
  /** Race countdown <= 1h. Tension-building. */
  countdown: ['countdown', 'clock ticking'],
} as const satisfies Record<string, readonly string[]>;

/** Type-safe handle into the curated bank. */
export type GiphyReactionKey = keyof typeof GIPHY_REACTION_QUERIES;
