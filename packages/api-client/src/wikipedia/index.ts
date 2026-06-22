/**
 * Wikipedia REST API client.
 * No auth, no rate-limit, free.
 * Docs: https://en.wikipedia.org/api/rest_v1/
 *
 * Use this in preference to Wikidata SPARQL when you need:
 *   - a thumbnail image for an article (driver, team, circuit)
 *   - a short intro paragraph
 *   - canonical title + URL
 *
 * The summary endpoint always returns a deterministic shape for a given
 * page title, which makes it more reliable than SPARQL queries that
 * require exact-label matching.
 */

const REST_BASE = 'https://en.wikipedia.org/api/rest_v1';

export interface WikipediaSummary {
  title: string;
  description?: string;
  extract: string;
  thumbnailUrl?: string;
  originalImageUrl?: string;
  pageUrl: string;
  pageId?: number;
}

interface RawSummary {
  type?: string;
  title: string;
  displaytitle?: string;
  description?: string;
  extract?: string;
  pageid?: number;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
}

/**
 * Pull title from a Wikipedia URL.
 *   http://en.wikipedia.org/wiki/Max_Verstappen  → Max_Verstappen
 *   https://en.wikipedia.org/wiki/Fernando_Alonso → Fernando_Alonso
 */
export function titleFromWikiUrl(url: string): string {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/wiki\/(.+)$/);
    if (m && m[1]) return decodeURIComponent(m[1]);
  } catch {
    /* fall through */
  }
  return url;
}

/**
 * Fetch the page summary for a given page title.
 *
 * Returns null when:
 *   - The article does not exist (404)
 *   - The network call fails
 *
 * Default cache: 24h. Driver pages move slowly enough that the saving on
 * upstream load matters more than a fresh thumb.
 */
export async function getWikipediaSummary(
  pageTitle: string,
  opts: { revalidate?: number } = {},
): Promise<WikipediaSummary | null> {
  if (!pageTitle) return null;
  const encoded = encodeURIComponent(pageTitle.replace(/ /g, '_'));
  const url = `${REST_BASE}/page/summary/${encoded}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Apex/0.1 (https://github.com/ShAuRyA-Noodle/Apex-F1; hello@apex.gg)',
      },
      next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : { revalidate: 86_400 },
    } as RequestInit);
    if (!res.ok) return null;
    const raw = (await res.json()) as RawSummary;
    return {
      title: raw.title,
      description: raw.description,
      extract: raw.extract ?? '',
      thumbnailUrl: raw.thumbnail?.source,
      originalImageUrl: raw.originalimage?.source,
      pageUrl: raw.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`,
      pageId: raw.pageid,
    };
  } catch {
    return null;
  }
}

/** Resolve a Wikipedia summary directly from a wiki URL. */
export async function getWikipediaSummaryByUrl(
  wikiUrl: string,
  opts: { revalidate?: number } = {},
): Promise<WikipediaSummary | null> {
  const title = titleFromWikiUrl(wikiUrl);
  return getWikipediaSummary(title, opts);
}
