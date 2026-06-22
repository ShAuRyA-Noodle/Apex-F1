// GNews.io typed client.
//
// =========================================================================
// FREE-TIER CONSTRAINTS - read before tuning anything in this file
// =========================================================================
//
// 1) RATE LIMIT: 100 requests / 24h. With Next.js ISR cache at 900s (15 min)
//    a single query route burns ~96 requests/day — i.e. effectively right at
//    the cap. We therefore default `revalidate` to 900 and refuse to push
//    below 600 (see clamp below). The aggregator must NOT call this client
//    from a hot-path; it must call it from an ISR-cached server component.
//
// 2) ARTICLE DELAY: free-tier articles surface ~12 HOURS AFTER PUBLICATION.
//    GNews intentionally throttles the free feed so paying customers get the
//    real-time signal. Do not market GNews stories as "breaking" — they are
//    not. Useful for: deep archive sweeps, multi-source corroboration,
//    non-English coverage (lang param), and filling gaps when our RSS feeds
//    miss a story. NOT useful for: live race weekends, breaking news rails,
//    "minutes-ago" timestamps.
//
// 3) MAX 10 ARTICLES per request on the free tier. We cap `pageSize` at 10
//    and silently truncate larger requests rather than 400-ing.
//
// 4) QUOTA EXHAUSTION: when the daily quota is hit GNews returns 403 with
//    `errors: ["You have reached your daily quota..."]`. We catch this and
//    return [] so the calling UI gracefully shows "no items" instead of
//    crashing the server render.
//
// 5) NO API KEY: when GNEWS_API_KEY is unset we return [] immediately and
//    do not hit the network. Matches the project's "no mock data" rule.
//
// =========================================================================

import {
  GNEWS_BASE,
  GNEWS_FREE_TIER_MAX_PER_REQUEST,
  isGNewsError,
  type GNewsArticle,
  type GNewsCountry,
  type GNewsLang,
  type GNewsResponse,
  type GNewsSortBy,
} from './types';

/** Caller-facing options. */
export interface GetGNewsF1NewsOptions {
  /** How many articles to ask for. Free tier hard-caps at 10. */
  pageSize?: number;
  /** Language filter. Default `'en'`. */
  lang?: GNewsLang;
  /** Country filter. `'any'` (default) omits the param. */
  country?: GNewsCountry;
  /** Sort order. Default `'publishedAt'` (newest-first). */
  sortby?: GNewsSortBy;
  /** Search query override. Default `'Formula 1'`. */
  q?: string;
  /** Next.js ISR revalidate seconds. Default 900. Floor 600 to protect quota. */
  revalidate?: number;
  /** Override fetch (for tests). */
  fetchImpl?: typeof fetch;
}

/** Minimum allowed `revalidate` — protects the 100-req/day quota. */
const MIN_REVALIDATE_SECONDS = 600;

/** Default `revalidate` if caller doesn't specify. */
const DEFAULT_REVALIDATE_SECONDS = 900;

/**
 * Fetch F1 news from GNews.io.
 *
 * Returns [] (never throws) on:
 *  - missing GNEWS_API_KEY
 *  - non-2xx response (incl. 403 quota-exceeded)
 *  - network error / abort
 *  - malformed JSON / unexpected payload shape
 *
 * Always remember the 12-hour delay (see file header).
 */
export async function getGNewsF1News(
  opts: GetGNewsF1NewsOptions = {},
): Promise<GNewsArticle[]> {
  const apiKey = process.env['GNEWS_API_KEY'];
  if (!apiKey) {
    // No key -> behave as if the source is disabled. Matches project rule:
    // "If a key is missing, return [] and the calling UI shows empty state."
    return [];
  }

  const {
    pageSize = GNEWS_FREE_TIER_MAX_PER_REQUEST,
    lang = 'en',
    country = 'any',
    sortby = 'publishedAt',
    q = 'Formula 1',
    revalidate = DEFAULT_REVALIDATE_SECONDS,
    fetchImpl = fetch,
  } = opts;

  // Clamp pageSize to free-tier ceiling.
  const max = Math.max(1, Math.min(pageSize, GNEWS_FREE_TIER_MAX_PER_REQUEST));

  // Clamp revalidate floor. Caller can still set higher, but never lower.
  const safeRevalidate = Math.max(revalidate, MIN_REVALIDATE_SECONDS);

  const url = new URL(`${GNEWS_BASE}/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('lang', lang);
  if (country !== 'any') url.searchParams.set('country', country);
  url.searchParams.set('max', String(max));
  url.searchParams.set('sortby', sortby);
  url.searchParams.set('apikey', apiKey);

  try {
    const res = await fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: safeRevalidate },
    } as RequestInit);

    if (!res.ok) {
      // 401 -> bad key. 403 -> quota exhausted. 429 -> burst limit.
      // 5xx -> upstream blip. All cases: log + return [].
      // Quota and key errors are the common ones, so make the log helpful.
      let reason = `${res.status} ${res.statusText}`;
      try {
        const body = (await res.json()) as GNewsResponse;
        if (isGNewsError(body) && body.errors[0]) {
          reason = `${reason} - ${body.errors[0]}`;
        }
      } catch {
        // Body wasn't JSON. Ignore.
      }
      // eslint-disable-next-line no-console
      console.warn(`[gnews] ${reason} for q="${q}"`);
      return [];
    }

    const json = (await res.json()) as GNewsResponse;
    if (isGNewsError(json)) {
      // eslint-disable-next-line no-console
      console.warn(`[gnews] error envelope: ${json.errors.join(' | ')}`);
      return [];
    }

    // Defensive: GNews has been seen returning `articles: null` on degraded
    // days. Coerce to []. Also strip any entry missing the required fields.
    const list = Array.isArray(json.articles) ? json.articles : [];
    return list.filter(
      (a): a is GNewsArticle =>
        !!a &&
        typeof a.title === 'string' &&
        typeof a.url === 'string' &&
        typeof a.publishedAt === 'string' &&
        a.title.length > 0 &&
        a.url.length > 0,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[gnews] network error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}
