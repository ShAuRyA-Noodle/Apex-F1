// Giphy typed client.
//
// =========================================================================
// FREE / BETA TIER CONSTRAINTS - read before tuning anything in this file
// =========================================================================
//
// 1) RATE LIMIT: 100 req/h, 1,000 req/day on the Beta key. Apex routes that
//    surface a reaction GIF are server-rendered with ISR, so each unique
//    query burns at most 1 request per 24h cache window. Curated query
//    bank (see types.ts) is intentionally small (~10 strings total) so we
//    sit at roughly 10 requests/day - 1% of the daily cap.
//
// 2) CACHE FLOOR: we clamp `revalidate` at 24h (86,400s). Callers can set
//    higher but never lower; this is the contract that keeps us under
//    the daily limit. If a caller passes a lower value we silently raise
//    it rather than 400-ing - reaction GIFs are a nice-to-have, not a
//    correctness signal, and surfacing an error to the user would be
//    worse than serving a slightly-stale frame.
//
// 3) NO API KEY: when GIPHY_API_KEY is unset we return [] immediately and
//    do not hit the network. The PredictResult and not-found UIs handle
//    the empty case gracefully (no GIF, just the score + copy).
//
// 4) ATTRIBUTION: rendering a Giphy GIF without the "Powered by GIPHY"
//    badge is a ToS violation. Enforced at the UI layer via the
//    PoweredByGiphy badge component. Do not bypass.
//
// 5) RATING: always `g`. Even on /predict fail-state reactions. Apex is
//    a family-safe surface; "facepalm" gets us all the comedic mileage
//    we need without dipping into PG-13.
//
// =========================================================================

import {
  GIPHY_BASE,
  GIPHY_MAX_LIMIT_PER_REQUEST,
  GIPHY_REACTION_QUERIES,
  isGiphyError,
  type GiphyGif,
  type GiphyLang,
  type GiphyRating,
  type GiphyReactionKey,
  type GiphyResponse,
  type GiphySearchResponse,
} from './types';

/** Caller-facing options for `searchGiphy`. */
export interface SearchGiphyOptions {
  /** Search term. Required. */
  query: string;
  /** Max items to return. Default 10, hard cap 50. */
  limit?: number;
  /** Content rating. Always `g` on Apex. Default `g`. */
  rating?: GiphyRating;
  /** Language hint. Default `en`. */
  lang?: GiphyLang;
  /** Next.js ISR revalidate seconds. Default 86,400 (24h). Floor 86,400. */
  revalidate?: number;
  /** Pagination offset. Default 0. */
  offset?: number;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
}

/** Minimum allowed `revalidate` - protects the 1,000-req/day quota. */
const MIN_REVALIDATE_SECONDS = 24 * 60 * 60; // 24h

/** Default `revalidate` if caller doesn't specify. */
const DEFAULT_REVALIDATE_SECONDS = 24 * 60 * 60; // 24h

/** Default `limit`. 10 is enough variety for a single-GIF render slot. */
const DEFAULT_LIMIT = 10;

/**
 * Search Giphy for reaction GIFs.
 *
 * Returns [] (never throws) on:
 *  - missing GIPHY_API_KEY
 *  - non-2xx response (incl. 429 rate-limit, 401 bad key, 403 quota)
 *  - network error / abort
 *  - malformed JSON / unexpected payload shape
 *  - empty `query` string
 *
 * The 24h cache floor is non-negotiable. See file header.
 */
export async function searchGiphy(
  opts: SearchGiphyOptions,
): Promise<GiphyGif[]> {
  const apiKey = process.env['GIPHY_API_KEY'];
  if (!apiKey) {
    // No key -> behave as if the source is disabled. Matches project rule:
    // "If a key is missing, return [] and the calling UI shows empty state."
    return [];
  }

  const trimmedQuery = opts.query?.trim();
  if (!trimmedQuery) return [];

  const {
    limit = DEFAULT_LIMIT,
    rating = 'g',
    lang = 'en',
    revalidate = DEFAULT_REVALIDATE_SECONDS,
    offset = 0,
    fetchImpl = fetch,
  } = opts;

  // Clamp limit to the per-request ceiling. Giphy 400s above 50.
  const safeLimit = Math.max(1, Math.min(limit, GIPHY_MAX_LIMIT_PER_REQUEST));

  // Clamp revalidate floor. Caller can set higher, never lower.
  const safeRevalidate = Math.max(revalidate, MIN_REVALIDATE_SECONDS);

  const url = new URL(`${GIPHY_BASE}/gifs/search`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('q', trimmedQuery);
  url.searchParams.set('limit', String(safeLimit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('rating', rating);
  url.searchParams.set('lang', lang);

  try {
    const res = await fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: safeRevalidate },
    } as RequestInit);

    if (!res.ok) {
      // 401 -> bad/revoked key. 403 -> quota exhausted. 429 -> burst limit.
      // 5xx -> upstream blip. All cases: warn + return [].
      let reason = `${res.status} ${res.statusText}`;
      try {
        const body = (await res.json()) as GiphyResponse;
        if (body.meta?.msg) reason = `${reason} - ${body.meta.msg}`;
      } catch {
        // Body wasn't JSON. Ignore.
      }
      // eslint-disable-next-line no-console
      console.warn(`[giphy] ${reason} for q="${trimmedQuery}"`);
      return [];
    }

    const json = (await res.json()) as GiphyResponse;
    if (isGiphyError(json)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[giphy] error envelope: ${json.meta?.msg ?? 'unknown'} for q="${trimmedQuery}"`,
      );
      return [];
    }

    const list = (json as GiphySearchResponse).data;
    return Array.isArray(list)
      ? list.filter(
          (g): g is GiphyGif =>
            !!g &&
            typeof g.id === 'string' &&
            typeof g.url === 'string' &&
            !!g.images?.downsized_medium?.url,
        )
      : [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[giphy] network error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

/**
 * Convenience helper - search using one of the curated reaction keys.
 *
 * Picks a random query from the bank for that key (so a 6-pt /predict win
 * doesn't always show the same celebration GIF) and forwards to
 * `searchGiphy`. The randomisation is deterministic-per-cache-window
 * because we just pick the first query whose hash bucket matches the
 * caller's seed; this keeps ISR cache hit rate high while still varying
 * the GIF across users in different cache windows.
 */
export async function searchGiphyReaction(
  key: GiphyReactionKey,
  opts: Omit<SearchGiphyOptions, 'query'> & { seed?: number } = {},
): Promise<GiphyGif[]> {
  // `bank` is a readonly tuple (the curated bank is declared `as const`), so
  // its length is known to be > 0 at the type level. We still guard at runtime
  // because the bank is `keyof typeof` accessed and a future refactor could
  // legitimately add an empty bucket; the early return keeps things safe.
  const bank = GIPHY_REACTION_QUERIES[key] as readonly string[];
  if (bank.length === 0) return [];

  // Deterministic pick: seed % bank.length. Default seed = day-of-year so
  // every user gets the same GIF inside a given 24h cache window - which
  // is the only safe behaviour given our ISR strategy.
  const fallbackSeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const seed = opts.seed ?? fallbackSeed;
  const idx = ((seed % bank.length) + bank.length) % bank.length;
  const query = bank[idx] ?? bank[0] ?? '';

  return searchGiphy({ ...opts, query });
}
