// NewsAPI.org typed client for the F1 news rail.
//
// IMPORTANT — NewsAPI free / developer tier blocks requests whose Origin header
// is a production domain (anything other than localhost). It is ALSO not
// callable from the browser at all, because the free tier rejects CORS
// preflights with `corsNotAllowed`. This module MUST therefore only be invoked
// from:
//   - Next.js Route Handlers              (app/api/.../route.ts)
//   - Server Components                   (default in app/)
//   - Server Actions                      ("use server")
//   - Background jobs / workers           (apps/workers/*)
//
// Never import this file from a "use client" component. If you do, the request
// will fail in dev with a CORS error and in prod with `corsNotAllowed`.
//
// Quota: 100 requests / 24h on the dev plan. We cache aggressively (default
// 900s = 15 minutes) via Next.js fetch revalidate. At 15 min cadence one
// deployment burns ~96 calls/day — leaves headroom for editorial preview.

import {
  NEWSAPI_F1_QUERY,
  type GetNewsAPIF1NewsOptions,
  type NewsAPIArticle,
  type NewsAPIEverythingResponse,
} from './types';

const NEWSAPI_ENDPOINT = 'https://newsapi.org/v2/everything';
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_REVALIDATE_SECONDS = 900; // 15 minutes
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Fetch the latest F1-relevant articles from NewsAPI.org /v2/everything.
 *
 * Returns `[]` (never throws) when:
 *   - NEWSAPI_KEY env var is missing
 *   - NewsAPI responds 429 (daily quota burned)
 *   - NewsAPI responds 5xx
 *   - Network / abort / JSON parse error
 *   - status: "error" envelope (corsNotAllowed, apiKeyInvalid, etc.)
 *
 * Filters out NewsAPI's "[Removed]" placeholder articles before returning.
 */
export async function getNewsAPIF1News(
  opts: GetNewsAPIF1NewsOptions = {},
): Promise<NewsAPIArticle[]> {
  const apiKey = process.env['NEWSAPI_KEY'];
  if (!apiKey) {
    // No key provisioned. Per repo rule #1 (NO mock data), return empty —
    // the calling UI is expected to render an empty / loading state.
    return [];
  }

  const pageSize = clampPageSize(opts.pageSize ?? DEFAULT_PAGE_SIZE);
  const revalidate = opts.revalidate ?? DEFAULT_REVALIDATE_SECONDS;

  const url = buildEverythingUrl({ query: NEWSAPI_F1_QUERY, pageSize });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        // Header-based auth is preferred over ?apiKey= because the key never
        // ends up in CDN access logs / Next.js fetch cache keys.
        'X-Api-Key': apiKey,
        Accept: 'application/json',
        'User-Agent':
          'Apex/0.1 (+https://github.com/ShAuRyA-Noodle/Apex-F1; server-only)',
      },
      signal: controller.signal,
      // Next.js extended fetch — ISR on the server side.
      next: { revalidate, tags: ['news', 'news:newsapi'] },
    } as RequestInit);

    // 429 (rate limited) and 5xx are expected failure modes. Swallow.
    if (res.status === 429 || res.status >= 500) {
      return [];
    }
    if (!res.ok) {
      // 401 = bad key, 426 = upgrade required (origin blocked on prod plan),
      // 400 = malformed query. All non-recoverable — return empty.
      return [];
    }

    const json = (await res.json()) as NewsAPIEverythingResponse;
    if (json.status !== 'ok') {
      return [];
    }

    return json.articles.filter(isUsableArticle);
  } catch {
    // AbortError, network error, JSON parse error — all become [].
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* internals                                                          */
/* ------------------------------------------------------------------ */

function buildEverythingUrl(input: { query: string; pageSize: number }): string {
  const u = new URL(NEWSAPI_ENDPOINT);
  u.searchParams.set('q', input.query);
  u.searchParams.set('sortBy', 'publishedAt');
  u.searchParams.set('language', 'en');
  u.searchParams.set('pageSize', String(input.pageSize));
  return u.toString();
}

function clampPageSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE;
  const i = Math.trunc(n);
  if (i < 1) return 1;
  if (i > 100) return 100;
  return i;
}

/**
 * NewsAPI flags articles whose publisher revoked the license as "[Removed]"
 * across every text field. They are unrenderable — drop them up front.
 */
function isUsableArticle(a: NewsAPIArticle): boolean {
  if (!a.url || !a.title) return false;
  if (a.title === '[Removed]') return false;
  if (a.url === 'https://removed.com') return false;
  return true;
}
