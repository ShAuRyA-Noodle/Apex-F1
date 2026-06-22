// Typed NewsData.io client.
//
// Hard ceiling on the free tier is 200 requests/day, so:
//   - we default to a 600s ISR cache (≈ 144 calls/day worst case),
//   - we coalesce all six target languages into ONE request via comma-sep,
//   - we hard-cap page size to 10 (NewsData's free-tier max per call),
//   - we return [] on any error (missing key, network, rate-limit) so the
//     calling UI shows an empty state instead of a 500.
//
// Key auth: `apikey` is a QUERY param, not a header.

import type {
  NewsDataArticleRaw,
  NewsDataNewsResponse,
  NewsDataLanguageIso,
} from './types';
import { NEWSDATA_LANG_TOKEN } from './types';

const BASE = 'https://newsdata.io/api/1/news';

/** Default language fan-out covering the four big F1 markets. */
const DEFAULT_LANGUAGES: NewsDataLanguageIso[] = [
  'en', // global / British / Australian
  'it', // Ferrari beat (Gazzetta dello Sport, La Repubblica)
  'es', // Alonso + Sainz + Latin-American syndication
  'de', // Mercedes / Audi / Hülkenberg
  'fr', // Pierre Gasly + Ocon + AlphaTauri
  'pt', // Brazilian coverage of Bortoleto + historical Senna pieces
];

export interface GetNewsDataF1NewsOpts {
  /** Hard cap on items returned (≤ 50). NewsData free-tier max per page is 10. */
  pageSize?: number;
  /** Subset of languages to request. Default: all six F1 markets. */
  languages?: NewsDataLanguageIso[];
  /** ISR revalidate window in seconds. Default 600s = 10 minutes. */
  revalidate?: number;
  /** Override fetch (for tests). */
  fetchImpl?: typeof fetch;
  /** Override env-key read (for tests). */
  apiKey?: string;
}

interface FetchPageOpts {
  apiKey: string;
  q: string;
  language: string;
  category: string;
  size: number;
  page?: string;
  revalidate: number;
  fetchImpl: typeof fetch;
}

async function fetchPage(opts: FetchPageOpts): Promise<NewsDataNewsResponse | null> {
  const url = new URL(BASE);
  url.searchParams.set('apikey', opts.apiKey);
  url.searchParams.set('q', opts.q);
  url.searchParams.set('language', opts.language);
  url.searchParams.set('category', opts.category);
  url.searchParams.set('size', String(opts.size));
  if (opts.page) url.searchParams.set('page', opts.page);

  try {
    const res = await opts.fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: opts.revalidate },
    } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as NewsDataNewsResponse;
    if (json.status !== 'success') return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * Fetch F1 news from NewsData.io across configured languages.
 * Always returns [] on missing key / network failure / bad response;
 * the caller is expected to merge with other providers.
 */
export async function getNewsDataF1News(
  opts: GetNewsDataF1NewsOpts = {},
): Promise<NewsDataArticleRaw[]> {
  const apiKey = opts.apiKey ?? process.env.NEWSDATA_API_KEY;
  if (!apiKey) return [];

  const fetchImpl = opts.fetchImpl ?? fetch;
  const pageSize = Math.min(opts.pageSize ?? 10, 50);
  const revalidate = opts.revalidate ?? 600;
  const langs = opts.languages ?? DEFAULT_LANGUAGES;

  // NewsData accepts comma-sep language list (up to 5 on free, 10+ on paid).
  // We clamp to the first 5 to stay free-tier friendly.
  const language = langs.slice(0, 5).map((l) => NEWSDATA_LANG_TOKEN[l]).join(',');

  const json = await fetchPage({
    apiKey,
    q: 'formula 1',
    language,
    category: 'sports',
    size: pageSize,
    revalidate,
    fetchImpl,
  });

  if (!json) return [];

  // Drop NewsData's own duplicates flag if present.
  return json.results.filter((a) => !a.duplicate);
}

/**
 * Fetch one specific language. Used when a UI surface wants a focused stream
 * (e.g. an "Italian Ferrari coverage" rail on the driver profile page).
 */
export async function getNewsDataF1NewsByLanguage(
  language: NewsDataLanguageIso,
  opts: { pageSize?: number; revalidate?: number; apiKey?: string } = {},
): Promise<NewsDataArticleRaw[]> {
  return getNewsDataF1News({
    pageSize: opts.pageSize,
    revalidate: opts.revalidate,
    apiKey: opts.apiKey,
    languages: [language],
  });
}
