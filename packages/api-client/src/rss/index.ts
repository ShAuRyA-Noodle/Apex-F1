import { XMLParser } from 'fast-xml-parser';

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

/** Aggregate the configured F1 RSS sources. Returns items sorted newest-first. */
export async function getF1NewsFeed(opts: { limit?: number; revalidate?: number } = {}): Promise<RssItem[]> {
  const revalidate = opts.revalidate ?? 300;
  const results = await Promise.all(F1_RSS_SOURCES.map((s) => fetchFeed(s, revalidate)));
  const merged = results.flat();
  merged.sort((a, b) => b.pubDateMs - a.pubDateMs);
  return opts.limit ? merged.slice(0, opts.limit) : merged;
}

/** Fetch one specific source. Used by sections that want a single provider. */
export async function getRssFeed(source: RssSource, opts: { limit?: number; revalidate?: number } = {}): Promise<RssItem[]> {
  const items = await fetchFeed(source, opts.revalidate ?? 300);
  return opts.limit ? items.slice(0, opts.limit) : items;
}
