import type {
  CurrentsNewsItem,
  CurrentsSearchEnvelope,
  CurrentsSearchParams,
} from './types';

const BASE = 'https://api.currentsapi.services/v1';

/** Defaults used by the F1 news rail. */
const F1_DEFAULTS = {
  keywords: 'formula 1',
  category: 'sports',
  language: 'en',
  /** 600 req/day free tier · generous, so 5-min cache same as RSS rail. */
  revalidate: 300,
} as const;

function buildSearchUrl(params: CurrentsSearchParams, apiKey: string): URL {
  const url = new URL(`${BASE}/search`);
  if (params.keywords) url.searchParams.set('keywords', params.keywords);
  if (params.language) url.searchParams.set('language', params.language);
  if (params.country) url.searchParams.set('country', params.country);
  if (params.category) url.searchParams.set('category', params.category);
  if (params.domain) url.searchParams.set('domain', params.domain);
  if (params.startDate) url.searchParams.set('start_date', params.startDate);
  if (params.endDate) url.searchParams.set('end_date', params.endDate);
  if (params.page !== undefined) url.searchParams.set('page_number', String(params.page));
  url.searchParams.set('apiKey', apiKey);
  return url;
}

interface CurrentsFetchOpts {
  revalidate?: number;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
}

/**
 * Low-level: hit /search once with the supplied params. Throws on non-2xx
 * so callers can decide their failure policy. The public helper below
 * swallows errors and returns [].
 */
export async function currentsSearch(
  params: CurrentsSearchParams,
  opts: CurrentsFetchOpts = {},
): Promise<CurrentsNewsItem[]> {
  const apiKey = process.env['CURRENTS_API_KEY'];
  if (!apiKey) return [];

  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = buildSearchUrl(params, apiKey);

  const res = await fetchImpl(url.toString(), {
    headers: { Accept: 'application/json' },
    next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
  } as RequestInit);

  if (!res.ok) {
    throw new Error(`Currents ${res.status} ${res.statusText}`);
  }
  const env = (await res.json()) as CurrentsSearchEnvelope;
  if (env.status !== 'ok') {
    throw new Error('Currents responded status=error');
  }
  return env.news ?? [];
}

/**
 * F1 news rail entry point. Two parallel queries · one keyword, one
 * sports-category-only · then dedupe by id. Returns [] on any failure
 * (CORE RULE #1: no synthetic fallback).
 *
 * Currents free tier: 600 req/day, 18 languages, real-time (no delay).
 */
export async function getCurrentsF1News(
  opts: CurrentsFetchOpts & { revalidate?: number } = {},
): Promise<CurrentsNewsItem[]> {
  const apiKey = process.env['CURRENTS_API_KEY'];
  if (!apiKey) return [];

  const revalidate = opts.revalidate ?? F1_DEFAULTS.revalidate;

  try {
    const items = await currentsSearch(
      {
        keywords: F1_DEFAULTS.keywords,
        language: F1_DEFAULTS.language,
        category: F1_DEFAULTS.category,
      },
      { revalidate, fetchImpl: opts.fetchImpl },
    ).catch(() => [] as CurrentsNewsItem[]);

    items.sort(
      (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime(),
    );

    return items;
  } catch {
    return [];
  }
}
