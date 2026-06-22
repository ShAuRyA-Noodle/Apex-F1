import type { RssItem } from '@apex/api-client/rss';
import { getHomeFeed } from '@/lib/home-feed';
import { HeroLeadStoryClient } from './HeroLeadStoryClient';

/** How many image-bearing stories form the rotation pool. */
const POOL_SIZE = 20;
/** How many show in the hero crossfade at once. */
const SHOW = 5;
/** The supporting slots advance one step per this window (synced to the 5-min
 *  external rss-sync ping), so the set visibly changes even on a quiet news day. */
const ROTATE_MS = 5 * 60 * 1000;

/**
 * Server entry for the home-page hero.
 *
 * Builds a pool of up to 20 of the freshest image-bearing stories, then shows 5:
 *  - slot 0 is always the single newest story (the breaking lead never gets buried)
 *  - slots 1-4 are a window into the rest of the pool that advances one position
 *    every 5 minutes, so over ~90 min every story in the pool gets hero time
 *
 * Selection is deterministic per render (server picks, client receives fixed
 * props) so there is no hydration mismatch. Because the page is ISR + an external
 * pinger revalidates it every 5 min, each regeneration rotates the window.
 * Nothing here adds API calls — it re-slices the already-fetched feed.
 */
export async function HeroLeadStory() {
  const items = await getHomeFeed();
  const pool = items.filter((i) => Boolean(i.imageUrl)).slice(0, POOL_SIZE);

  if (pool.length === 0) {
    const fallback = items.slice(0, 1);
    if (fallback.length === 0) return null;
    return <HeroLeadStoryClient leads={fallback} />;
  }

  return <HeroLeadStoryClient leads={pickRotatingLeads(pool)} />;
}

/** Pin the freshest story as the lead; rotate the remaining slots through the
 *  pool by a time-bucketed offset so the supporting stories cycle over time. */
function pickRotatingLeads(pool: RssItem[]): RssItem[] {
  if (pool.length <= SHOW) return pool;
  const lead = pool[0]!;
  const rest = pool.slice(1);
  const offset = Math.floor(Date.now() / ROTATE_MS) % rest.length;
  const rotated = Array.from({ length: SHOW - 1 }, (_, i) => rest[(offset + i) % rest.length]!);
  return [lead, ...rotated];
}
