import type {
  UnsplashOrientation,
  UnsplashSearchResponse,
} from './types';
import { mapUnsplashPhoto, type UnsplashImage } from './mappers';

/**
 * Unsplash client.
 *
 * Tiers:
 *   - Free Developer: 50 req/hour
 *   - Production:     5,000 req/hour (after their review)
 *
 * We cache search responses for 7 days per query (Next.js ISR), so a tier
 * 1 budget covers thousands of distinct queries per day comfortably. The
 * /photos/:id/download ping is NOT cached because it must run per render
 * · but it's still cheap and rate-counts the same.
 *
 * Behaviour contract:
 *   - No key in env  → returns null. Caller MUST handle null.
 *   - Network error  → returns null.
 *   - Empty results  → returns null.
 *   - Otherwise      → returns the top relevance-sorted match mapped to UI.
 */

const ENDPOINT = 'https://api.unsplash.com';

export interface SearchUnsplashInput {
  /** Natural-language query. Required, non-empty after trim. */
  query: string;
  /** Defaults to 'landscape' · hero imagery is full-bleed. */
  orientation?: UnsplashOrientation;
  /** Override ISR window. Default: 7 days. */
  revalidate?: number;
  /** Override fetch (testing). */
  fetchImpl?: typeof fetch;
  /**
   * Override how we fetch the access key. Defaults to process.env.UNSPLASH_ACCESS_KEY.
   * Exposed primarily so worker contexts can pass an explicit value.
   */
  accessKey?: string;
}

const SEVEN_DAYS = 60 * 60 * 24 * 7;

function getAccessKey(explicit?: string): string | null {
  if (explicit && explicit.length > 0) return explicit;
  const k = process.env.UNSPLASH_ACCESS_KEY;
  if (!k || k.length === 0) return null;
  return k;
}

function authHeaders(accessKey: string): HeadersInit {
  return {
    Authorization: `Client-ID ${accessKey}`,
    'Accept-Version': 'v1',
    Accept: 'application/json',
  };
}

/**
 * Run a search and return the single best match (top relevance-sorted result)
 * mapped to the UI shape, or null if anything goes wrong.
 *
 * Why top-1 instead of an array: every hero slot we wire takes exactly one
 * image. Returning a list would tempt callers to ship multi-source rails
 * and exhaust the 50/hr budget. If we ever need a gallery we'll add a
 * separate searchUnsplashImages() that returns the array.
 */
export async function searchUnsplashImage(
  input: SearchUnsplashInput,
): Promise<UnsplashImage | null> {
  const accessKey = getAccessKey(input.accessKey);
  if (!accessKey) return null;

  const query = input.query.trim();
  if (query.length === 0) return null;

  const orientation = input.orientation ?? 'landscape';
  const fetchImpl = input.fetchImpl ?? fetch;
  const revalidate = input.revalidate ?? SEVEN_DAYS;

  const url = new URL('/search/photos', ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '10');
  url.searchParams.set('orientation', orientation);
  // content_filter=high suppresses anything explicit; we want PG13 ceiling.
  url.searchParams.set('content_filter', 'high');

  try {
    const res = await fetchImpl(url.toString(), {
      headers: authHeaders(accessKey),
      next: { revalidate },
    } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as UnsplashSearchResponse;
    const top = json.results[0];
    if (!top) return null;
    return mapUnsplashPhoto(top);
  } catch {
    return null;
  }
}

/**
 * License-required download ping.
 *
 * Unsplash's API guideline: when a photo is rendered to a user in
 * production, the consuming app must GET the photo's `download_location`
 * URL with its Client-ID. This registers a download in the photographer's
 * stats and is required to stay in compliance.
 *
 * We:
 *   - Run the ping with `revalidate: 0` so it actually executes per render.
 *   - Swallow all errors · failing the ping must NOT fail the page.
 *   - Don't follow the redirect; the API only cares the URL was hit.
 */
async function pingDownload(
  downloadLocation: string,
  accessKey: string,
  fetchImpl: typeof fetch,
): Promise<void> {
  try {
    await fetchImpl(downloadLocation, {
      headers: authHeaders(accessKey),
      // revalidate: 0 → not cached. Each render pings once.
      next: { revalidate: 0 },
      // We're not interested in the body, but Next requires consuming or
      // discarding it. The fetch above does both implicitly on GC.
    } as RequestInit);
  } catch {
    // Intentionally silent.
  }
}

/**
 * High-level helper used by the heroImage facade. Runs the search, then
 * fires the license-required download ping in parallel-but-detached fashion
 * (we don't await it · the page should not block on a stats ping).
 *
 * Returns null on missing key / empty result / network error.
 */
export async function getUnsplashAndAck(
  input: SearchUnsplashInput,
): Promise<UnsplashImage | null> {
  const image = await searchUnsplashImage(input);
  if (!image) return null;

  const accessKey = getAccessKey(input.accessKey);
  // searchUnsplashImage would have returned null if there was no key, so
  // accessKey is guaranteed non-null here · but TS doesn't know that.
  if (accessKey) {
    // Detached: do not await. Errors swallowed inside pingDownload.
    void pingDownload(
      image.downloadLocation,
      accessKey,
      input.fetchImpl ?? fetch,
    );
  }
  return image;
}
