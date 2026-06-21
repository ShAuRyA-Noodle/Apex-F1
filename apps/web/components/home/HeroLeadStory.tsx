import { getF1NewsFeed } from '@apex/api-client/rss';
import { HeroLeadStoryClient } from './HeroLeadStoryClient';

export async function HeroLeadStory() {
  const items = await getF1NewsFeed({ limit: 1, revalidate: 300 });
  const lead = items[0];
  if (!lead) return null;
  return <HeroLeadStoryClient lead={lead} />;
}
