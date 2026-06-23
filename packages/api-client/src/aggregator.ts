// Unified F1 news aggregator.
//
// Combines every news provider the platform supports into a single
// `RssItem[]` stream, deduplicated by title-link similarity and
// sorted newest-first.
//
// Currently wired:
//   - RSS (4 sources)        @apex/api-client/rss
//   - Guardian               @apex/api-client/guardian
//   - GNews                  @apex/api-client/gnews
//   - NewsData (sentiment + multi-language)  @apex/api-client/newsdata
//
// All providers must return [] on failure (no throw). The aggregator
// itself never throws either; if every source fails, callers get [].

import { getF1NewsFeed as getRssNewsFeed, type RssItem } from './rss';
import { getGuardianF1News, mapGuardianItems } from './guardian';
import { getGNewsF1News, mapGNewsArticles } from './gnews';
import { getNewsDataF1News, mapNewsDataArticles } from './newsdata';
import { getNewsAPIF1News, mapNewsAPIArticlesToUi } from './newsapi';
import { uiToRssItems } from './rss';

export interface AggregatedNewsOptions {
  /** Soft cap on the merged result. Default 80. */
  limit?: number;
  /** ISR revalidate seconds passed to every provider. Default 300. */
  revalidate?: number;
  /** Selectively disable a provider (e.g. for /latest "GNews only" view). */
  providers?: {
    rss?: boolean;
    guardian?: boolean;
    gnews?: boolean;
    newsdata?: boolean;
    newsapi?: boolean;
  };
}

/** Identifier slug -> friendly label for the /latest source pill. */
export const NEWS_PROVIDERS = [
  { id: 'rss', label: 'RSS aggregate' },
  { id: 'guardian', label: 'The Guardian' },
  { id: 'gnews', label: 'GNews' },
  { id: 'newsdata', label: 'NewsData' },
] as const;

/**
 * Lowercased, alnum-only title fingerprint. Two articles with the same
 * fingerprint are treated as duplicates (typical case: a wire story
 * picked up by multiple publishers).
 */
function fingerprint(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize an article URL so trivial query-string drift doesn't defeat dedup. */
function urlKey(link: string): string {
  try {
    const u = new URL(link);
    // Strip common tracking params.
    for (const p of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'CMP',
      'ref',
    ]) {
      u.searchParams.delete(p);
    }
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return link.toLowerCase();
  }
}

/**
 * Merge an arbitrary number of provider result lists into a single
 * deduplicated, newest-first stream.
 *
 * Dedup strategy:
 *   1. Drop any item whose normalized URL has already been seen.
 *   2. Drop any item whose title fingerprint has already been seen.
 *
 * Order of provider lists matters: the first-seen variant wins. We pass
 * RSS first (highest editorial fidelity), Guardian second, GNews last
 * (delayed feed - lowest priority on collisions).
 */
function mergeAndDedupe(lists: RssItem[][]): RssItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const out: RssItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (!item.title || !item.link) continue;
      const uk = urlKey(item.link);
      const fp = fingerprint(item.title);
      if (seenUrls.has(uk) || seenTitles.has(fp)) continue;
      seenUrls.add(uk);
      seenTitles.add(fp);
      out.push(item);
    }
  }
  out.sort((a, b) => b.pubDateMs - a.pubDateMs);
  return out;
}

/**
 * Fetch from every enabled provider in parallel and return one merged list.
 *
 * Never throws. Each provider is independently fault-tolerant; if one
 * returns [], the others still flow through.
 */
export async function getAggregatedF1News(
  opts: AggregatedNewsOptions = {},
): Promise<RssItem[]> {
  const limit = opts.limit ?? 80;
  const revalidate = opts.revalidate ?? 300;
  const enabled = {
    rss: opts.providers?.rss !== false,
    guardian: opts.providers?.guardian !== false,
    gnews: opts.providers?.gnews !== false,
    newsdata: opts.providers?.newsdata !== false,
    newsapi: opts.providers?.newsapi !== false,
  };

  const [rssItems, guardianItems, gnewsItems, newsDataItems, newsApiItems] = await Promise.all([
    enabled.rss
      ? getRssNewsFeed({ revalidate }).catch(() => [] as RssItem[])
      : Promise.resolve([] as RssItem[]),
    enabled.guardian
      ? getGuardianF1News({ revalidate })
          .then((raw) => mapGuardianItems(raw))
          .catch(() => [] as RssItem[])
      : Promise.resolve([] as RssItem[]),
    enabled.gnews
      ? // GNews respects its own quota-safe revalidate floor inside the
        // client, so passing a smaller value here is fine - it gets clamped.
        getGNewsF1News({ revalidate })
          .then((raw) => mapGNewsArticles(raw))
          .catch(() => [] as RssItem[])
      : Promise.resolve([] as RssItem[]),
    enabled.newsdata
      ? // NewsData: hard cap is 200 req/day. Client floors revalidate to 600s.
        getNewsDataF1News({
          pageSize: 10,
          revalidate: Math.max(revalidate, 600),
        })
          .then((raw) => mapNewsDataArticles(raw) as unknown as RssItem[])
          .catch(() => [] as RssItem[])
      : Promise.resolve([] as RssItem[]),
    enabled.newsapi
      ? // NewsAPI: 100/day cap. Client floors revalidate to 1000s.
        getNewsAPIF1News({ pageSize: 20, revalidate: Math.max(revalidate, 1000) })
          .then((raw) => uiToRssItems(mapNewsAPIArticlesToUi(raw)))
          .catch(() => [] as RssItem[])
      : Promise.resolve([] as RssItem[]),
  ]);

  // Order matters for dedupe-collision tie-breaks: RSS (highest editorial
  // fidelity) wins over Guardian over NewsData over GNews (delayed).
  const merged = mergeAndDedupe([rssItems, guardianItems, newsApiItems, newsDataItems, gnewsItems]);
  return merged.slice(0, limit);
}
