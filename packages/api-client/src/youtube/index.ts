import { getRssFeed, type RssItem } from '../rss';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channelName: string;
  publishedAt: string;
  publishedMs: number;
  description?: string;
}

export interface YouTubeChannelSource {
  name: string;
  channelId: string;
}

// Public channel-RSS feeds. No API key required.
export const YT_F1_CHANNELS: YouTubeChannelSource[] = [
  { name: 'FORMULA 1', channelId: 'UCB_qr75-ydFVKSF9Dmo6izg' },
  { name: 'Chain Bear', channelId: 'UCK01ZhWlMV4kHANXFhGUUKQ' },
  { name: 'WTF1', channelId: 'UCqzwM8m2-mLPjQwQTvCJp_g' },
  { name: 'Tommo F1', channelId: 'UCpf4kPmiMUjKHr-W-rOLg2A' },
  { name: 'Driver61', channelId: 'UCcQrxs2sUEdOlVfsNNxgX6w' },
];

function videoIdFromAtomLink(link: string): string {
  const m = link.match(/[?&]v=([\w-]+)/);
  return m?.[1] ?? '';
}

function bestThumb(videoId: string, fallback?: string): string {
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  return fallback ?? '';
}

async function fetchChannelFeed(
  ch: YouTubeChannelSource,
  revalidate: number,
): Promise<YouTubeVideo[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
  const items = await getRssFeed({ name: ch.name, url, homepage: 'https://www.youtube.com' }, {
    revalidate,
  });
  return items.map((it: RssItem): YouTubeVideo => {
    const videoId = videoIdFromAtomLink(it.link);
    return {
      videoId,
      title: it.title,
      url: it.link,
      thumbnailUrl: bestThumb(videoId, it.imageUrl),
      channelName: ch.name,
      publishedAt: it.pubDate,
      publishedMs: it.pubDateMs,
      description: it.description,
    };
  });
}

/** Aggregate latest videos across the curated F1 channel set. */
export async function getF1Videos(opts: {
  limit?: number;
  channels?: YouTubeChannelSource[];
  revalidate?: number;
} = {}): Promise<YouTubeVideo[]> {
  const channels = opts.channels ?? YT_F1_CHANNELS;
  const revalidate = opts.revalidate ?? 1800;
  const results = await Promise.all(channels.map((c) => fetchChannelFeed(c, revalidate)));
  const merged = results.flat();
  merged.sort((a, b) => b.publishedMs - a.publishedMs);
  return opts.limit ? merged.slice(0, opts.limit) : merged;
}
