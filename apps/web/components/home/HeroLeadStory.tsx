import { getHomeFeed } from '@/lib/home-feed';
import { HeroLeadStoryClient } from './HeroLeadStoryClient';

/**
 * Server entry for the home-page hero. Pulls the 5 most-recent leads with
 * an image so the client component can crossfade between them every 6s.
 * Falls back gracefully · if RSS only returns one with an image, the
 * crossfade no-ops and the hero behaves like before.
 */
export async function HeroLeadStory() {
  const items = await getHomeFeed();
  const withImage = items.filter((i) => Boolean(i.imageUrl)).slice(0, 5);
  const leads = withImage.length > 0 ? withImage : items.slice(0, 1);
  if (leads.length === 0) return null;
  return <HeroLeadStoryClient leads={leads} />;
}
