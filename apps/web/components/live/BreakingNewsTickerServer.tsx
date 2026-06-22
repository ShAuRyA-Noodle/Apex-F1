import { getF1NewsFeed } from '@apex/api-client/rss';
import { BreakingNewsTicker, type TickerItem } from './BreakingNewsTicker';

/**
 * Server entry for the breaking-news ticker. Pulls a wider RSS window than
 * the home rails so the client component has stock to shuffle through every
 * 90s without burning new HTTP. ISR keeps the upstream cheap.
 */
export async function BreakingNewsTickerServer() {
  let items: TickerItem[] = [];
  try {
    const feed = await getF1NewsFeed({ limit: 18, revalidate: 300 });
    items = feed.map((it, idx) => ({
      id: `${it.source}-${idx}-${it.link}`,
      title: it.title,
      source: it.source,
      link: it.link,
      pubDateMs: it.pubDateMs,
    }));
  } catch {
    items = [];
  }
  if (items.length === 0) return null;
  return <BreakingNewsTicker initialItems={items} />;
}
