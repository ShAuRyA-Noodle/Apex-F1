import { XMLParser } from 'fast-xml-parser';
import {
  getNewsAPIF1News,
  mapNewsAPIArticlesToUi,
  type UiNewsItem,
} from '../newsapi';
import type {
  NewsDataSentiment,
  NewsDataLanguageIso,
} from '../newsdata/types';

/**
 * Legacy shape. New code should import UiNewsItem from '@apex/api-client/newsapi'.
 * RssItem is retained so existing imports keep compiling · the aggregator now
 * returns UiNewsItem[] across all providers.
 *
 * Optional `provider` / `sentiment` / `language` / `countries` / `articleId`
 * are populated by the NewsData branch only; every other provider leaves
 * them undefined. UI surfaces must null-check before rendering the sentiment
 * badge or language pill.
 */
export interface RssItem {
  source: string;
  title: string;
  link: string;
  pubDate: string;
  pubDateMs: number;
  description?: string;
  imageUrl?: string;
  author?: string;
  categories?: string[];
  provider?: 'rss' | 'newsapi' | 'guardian' | 'newsdata' | 'gnews' | 'currents';
  sentiment?: NewsDataSentiment | null;
  language?: NewsDataLanguageIso | null;
  countries?: string[];
  articleId?: string;
}

export interface RssSource {
  /** Display name shown on UI. */
  name: string;
  /** Public RSS / Atom feed URL. */
  url: string;
  /** Hostname for fallback favicon. */
  homepage: string;
}

export const F1_RSS_SOURCES: RssSource[] = [
  { name: 'Motorsport.com', url: 'https://www.motorsport.com/rss/f1/news/', homepage: 'https://www.motorsport.com' },
  { name: 'Autosport', url: 'https://www.autosport.com/rss/f1/news/', homepage: 'https://www.autosport.com' },
  { name: 'RaceFans', url: 'https://www.racefans.net/feed/', homepage: 'https://www.racefans.net' },
  { name: 'The Race', url: 'https://www.the-race.com/category/formula-1/rss/', homepage: 'https://www.the-race.com' },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  trimValues: true,
  cdataPropName: '__cdata',
});

function strip(html?: string): string {
  if (!html) return '';
  const text = typeof html === 'string' ? html : String(html);
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstImageFrom(html?: string): string | undefined {
  if (!html) return undefined;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

function toMs(date?: string): number {
  if (!date) return 0;
  const ms = new Date(date).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function cdataOrText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const cd = (v as Record<string, unknown>)['__cdata'];
    if (typeof cd === 'string') return cd;
    const t = (v as Record<string, unknown>)['#text'];
    if (typeof t === 'string') return t;
  }
  return String(v);
}

function parseRss(xml: string, source: string): RssItem[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }

  // Standard RSS 2.0
  const rss = parsed['rss'] as Record<string, unknown> | undefined;
  const channel = rss?.['channel'] as Record<string, unknown> | undefined;
  if (channel) {
    const items = asArray(channel['item'] as Record<string, unknown> | Record<string, unknown>[] | undefined);
    return items
      .map((it): RssItem => {
        const title = strip(cdataOrText(it['title']));
        const link = String(it['link'] ?? '');
        const pubDate = String(it['pubDate'] ?? '');
        const enclosure = it['enclosure'] as { '@_url'?: string } | undefined;
        const mediaContent = it['media:content'] as { '@_url'?: string } | undefined;
        const mediaThumb = it['media:thumbnail'] as { '@_url'?: string } | undefined;
        const description = strip(cdataOrText(it['description']));
        return {
          source,
          title,
          link,
          pubDate,
          pubDateMs: toMs(pubDate),
          description,
          imageUrl:
            enclosure?.['@_url'] ??
            mediaContent?.['@_url'] ??
            mediaThumb?.['@_url'] ??
            firstImageFrom(cdataOrText(it['content:encoded'])) ??
            firstImageFrom(cdataOrText(it['description'])),
          author: cdataOrText(it['dc:creator'] ?? it['author']) || undefined,
          categories: asArray(it['category'] as string | string[] | undefined)
            .map((c) => cdataOrText(c))
            .filter(Boolean),
        };
      })
      .filter((i) => i.title && i.link);
  }

  // Atom (YouTube channel feeds use this)
  const feed = parsed['feed'] as Record<string, unknown> | undefined;
  if (feed) {
    const entries = asArray(feed['entry'] as Record<string, unknown> | Record<string, unknown>[] | undefined);
    return entries
      .map((it): RssItem => {
        const link = it['link'] as { '@_href'?: string } | undefined;
        const linkHref = link?.['@_href'] ?? '';
        const mediaGroup = it['media:group'] as Record<string, unknown> | undefined;
        const mediaThumb = mediaGroup?.['media:thumbnail'] as { '@_url'?: string } | undefined;
        const mediaDesc = mediaGroup?.['media:description'];
        return {
          source,
          title: strip(cdataOrText(it['title'])),
          link: linkHref,
          pubDate: String(it['published'] ?? it['updated'] ?? ''),
          pubDateMs: toMs(String(it['published'] ?? it['updated'] ?? '')),
          description: strip(cdataOrText(mediaDesc) || cdataOrText(it['summary'])),
          imageUrl: mediaThumb?.['@_url'],
          author: cdataOrText((it['author'] as Record<string, unknown>)?.['name']) || undefined,
        };
      })
      .filter((i) => i.title && i.link);
  }

  return [];
}

/**
 * Convert UiNewsItem rows (NewsAPI, etc.) into the aggregator's RssItem shape.
 * RssItem now carries an optional `provider` discriminator, so we keep it
 * intact · downstream UI (e.g. SentimentBadge gating) relies on it.
 */
export function uiToRssItems(items: UiNewsItem[]): RssItem[] {
  return items.map((it) => ({ ...it }));
}

async function fetchFeed(source: RssSource, revalidate: number): Promise<RssItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Apex/0.1; +https://github.com/ShAuRyA-Noodle/Apex-F1)',
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
      next: { revalidate },
    } as RequestInit);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, source.name);
  } catch {
    return [];
  }
}

/** Normalize a title for fuzzy dedupe · lowercase, alphanumerics only. */
function dedupeKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Normalize a URL for dedupe · strip protocol, www, query, trailing slash. */
function linkKey(link: string): string {
  try {
    const u = new URL(link);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return link.toLowerCase();
  }
}

/**
 * Cap how many items any single source contributes so one fast publisher
 * cannot dominate the rail. Preserves insertion order (which is already
 * newest-first sorted before this runs).
 */
function capPerSource(items: RssItem[], maxPerSource: number): RssItem[] {
  const counts = new Map<string, number>();
  const out: RssItem[] = [];
  for (const item of items) {
    const n = counts.get(item.source) ?? 0;
    if (n >= maxPerSource) continue;
    counts.set(item.source, n + 1);
    out.push(item);
  }
  return out;
}

/**
 * Aggregate every configured F1 news provider into a single rail.
 *
 * Sources fan out in parallel:
 *   - 4x RSS feeds (Motorsport.com, Autosport, RaceFans, The Race)
 *   - The Guardian Open Platform (when GUARDIAN_API_KEY present)
 *   - NewsAPI.org /v2/everything       (when NEWSAPI_KEY present, server-only)
 *
 * Output is deduped by normalized title + URL host and sorted newest-first
 * with a per-source cap so no single provider drowns the rail. Each provider
 * fails independently · a 429 from NewsAPI does not poison the RSS rows
 * (CORE RULE #1).
 *
 * Quota'd providers carry a per-source revalidate FLOOR sized to their daily
 * limit, so even when an external pinger hits /api/cron/rss-sync every 5 min the
 * actual upstream network calls stay well under quota and last past midnight:
 *   NewsAPI  1000s (~72/day, limit 100) · NewsData 600s (~144/day, limit 200)
 *   Currents  600s (~144/day, limit 600) · Guardian 600s (~144/day, limit 500)
 * The free RSS feeds carry no floor · they refresh on the caller's window (300s).
 */
export async function getF1NewsFeed(
  opts: {
    limit?: number;
    revalidate?: number;
    maxPerSource?: number;
    /** Set false to skip NewsAPI entirely (quota pinch / debugging). Default true. */
    includeNewsAPI?: boolean;
    /** Set false to skip NewsData (debug / focused rails). Default true. */
    includeNewsData?: boolean;
    /** Set false to skip Currents (debug). Default true. */
    includeCurrents?: boolean;
  } = {},
): Promise<RssItem[]> {
  const revalidate = opts.revalidate ?? 300;
  const maxPerSource = opts.maxPerSource ?? 8;
  const includeNewsAPI = opts.includeNewsAPI !== false;
  const includeNewsData = opts.includeNewsData !== false;
  const includeCurrents = opts.includeCurrents !== false;

  const rssPromise = Promise.all(F1_RSS_SOURCES.map((s) => fetchFeed(s, revalidate)));

  // Guardian is fetched lazily so the rss-only path stays zero-dep. We
  // import dynamically to avoid a hard cycle if guardian later wants rss
  // types. The await Promise.all races both branches.
  const guardianPromise: Promise<RssItem[]> = (async () => {
    if (!process.env['GUARDIAN_API_KEY']) return [];
    try {
      const { getGuardianF1News, mapGuardianItems } = await import('../guardian');
      const raw = await getGuardianF1News({ revalidate: Math.max(revalidate, 600) });
      return mapGuardianItems(raw);
    } catch {
      return [];
    }
  })();

  // NewsAPI runs server-side only. Its client already returns [] on missing
  // key / 429 / 5xx, so we don't need a second try/catch here.
  const newsApiPromise: Promise<RssItem[]> = includeNewsAPI
    ? getNewsAPIF1News({
        pageSize: 20,
        revalidate: Math.max(revalidate, 1000),
      })
        .then(mapNewsAPIArticlesToUi)
        .then(uiToRssItems)
        .catch(() => [] as RssItem[])
    : Promise.resolve([]);

  // NewsData · multi-language + sentiment. 200/day quota → floor to 600s
  // revalidate. Lazy-imported to avoid loading the module when the key is
  // missing or the caller has opted out.
  const newsDataPromise: Promise<RssItem[]> = (async () => {
    if (!includeNewsData) return [];
    if (!process.env['NEWSDATA_API_KEY']) return [];
    try {
      const { getNewsDataF1News, mapNewsDataArticles } = await import('../newsdata');
      const raw = await getNewsDataF1News({
        pageSize: 10,
        revalidate: Math.max(revalidate, 600),
      });
      // mapNewsDataArticles returns UiNewsItemExtended which is structurally
      // assignable to RssItem (every NewsData-only field is optional on RssItem).
      return mapNewsDataArticles(raw) as unknown as RssItem[];
    } catch {
      return [];
    }
  })();

  // Currents · 600/day quota, real-time, multi-language, no delay (unlike GNews).
  const currentsPromise: Promise<RssItem[]> = (async () => {
    if (!includeCurrents) return [];
    if (!process.env['CURRENTS_API_KEY']) return [];
    try {
      const { getCurrentsF1News, mapCurrentsItems } = await import('../currents');
      const raw = await getCurrentsF1News({ revalidate: Math.max(revalidate, 600) });
      return mapCurrentsItems(raw).map((it): RssItem => ({ ...it, provider: 'currents' }));
    } catch {
      return [];
    }
  })();

  const [rssResults, guardianResults, newsApiResults, newsDataResults, currentsResults] = await Promise.all([
    rssPromise,
    guardianPromise,
    newsApiPromise,
    newsDataPromise,
    currentsPromise,
  ]);
  // Tag plain-RSS rows with their provider key so the UI can group them.
  const rssTagged = rssResults
    .flat()
    .map((it): RssItem => ({ ...it, provider: 'rss' }));
  const all = [...rssTagged, ...guardianResults, ...newsApiResults, ...newsDataResults, ...currentsResults];

  // F1-relevance post-filter. Cricket / tennis / golf etc. keep sneaking in
  // when keyword-search APIs match body text instead of headline subject.
  // Dedicated F1 RSS feeds + Guardian's curated tag bypass this filter
  // (they are publisher-curated upstream and trusted). Keyword-API providers
  // get gated to entries whose title/description contains a strong F1 token.
  const TRUSTED = new Set([
    'Motorsport.com',
    'Autosport',
    'RaceFans',
    'The Race',
    'The Guardian',
  ]);
  const F1_REGEX = new RegExp(
    [
      'formula 1',
      'formula one',
      'f1',
      'grand prix',
      'gp(\\s|$)',
      'verstappen',
      'hamilton',
      'leclerc',
      'norris',
      'piastri',
      'russell',
      'alonso',
      'mclaren',
      'ferrari',
      'mercedes',
      'red bull',
      'aston martin',
      'williams f1',
      'kick sauber',
      'rb f1',
      'haas f1',
      'fia',
      'pirelli tyre',
      'qualifying',
      'pole position',
      'safety car',
      'drs',
      'paddock',
      'silverstone',
      'monaco',
      'monza',
      'spa francorchamps',
      'suzuka',
      'interlagos',
    ].join('|'),
    'i',
  );

  function looksLikeF1(item: RssItem): boolean {
    if (TRUSTED.has(item.source)) return true;
    const hay = `${item.title} ${item.description ?? ''}`;
    return F1_REGEX.test(hay);
  }

  const relevant = all.filter(looksLikeF1);

  // Sort newest-first before dedupe so the kept copy is always the freshest.
  relevant.sort((a, b) => b.pubDateMs - a.pubDateMs);

  const seenTitles = new Set<string>();
  const seenLinks = new Set<string>();
  const deduped: RssItem[] = [];
  for (const item of relevant) {
    const tk = dedupeKey(item.title);
    const lk = linkKey(item.link);
    if (tk && seenTitles.has(tk)) continue;
    if (lk && seenLinks.has(lk)) continue;
    if (tk) seenTitles.add(tk);
    if (lk) seenLinks.add(lk);
    deduped.push(item);
  }

  const capped = capPerSource(deduped, maxPerSource);
  return opts.limit ? capped.slice(0, opts.limit) : capped;
}

/** Fetch one specific source. Used by sections that want a single provider. */
export async function getRssFeed(source: RssSource, opts: { limit?: number; revalidate?: number } = {}): Promise<RssItem[]> {
  const items = await fetchFeed(source, opts.revalidate ?? 300);
  return opts.limit ? items.slice(0, opts.limit) : items;
}
