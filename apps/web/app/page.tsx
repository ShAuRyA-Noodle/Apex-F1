import { HeroLeadStory } from '@/components/home/HeroLeadStory';
import { HeroRail } from '@/components/home/HeroRail';
import { QuickLinks } from '@/components/home/QuickLinks';
import { FeaturedVideoRail } from '@/components/home/FeaturedVideoRail';
import { EditorsPicks } from '@/components/home/EditorsPicks';
import { StandingsPreview } from '@/components/home/StandingsPreview';
import { HighlightsRail } from '@/components/home/HighlightsRail';
import { SocialPulse } from '@/components/home/SocialPulse';
import { NewsletterCTA } from '@/components/home/NewsletterCTA';
import { PartnerBar } from '@/components/home/PartnerBar';

export default function HomePage() {
  return (
    <>
      <HeroLeadStory />
      <HeroRail />
      <QuickLinks />
      <FeaturedVideoRail />
      <EditorsPicks />
      <StandingsPreview />
      <HighlightsRail />
      <SocialPulse />
      <NewsletterCTA />
      <PartnerBar />
    </>
  );
}
