import { Suspense } from 'react';
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
import {
  NewsRailSkeleton,
  VideoRailSkeleton,
  StandingsSkeleton,
} from '@/components/shell/Skeleton';

export const revalidate = 300;

/** Padded container so a skeleton fallback occupies the same footprint as the
 *  loaded rail (no layout shift when the real section streams in). */
function RailFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-10 md:px-grid-margin">{children}</div>
  );
}

/**
 * Each async section streams behind its own Suspense boundary, so the sticky
 * shell + page paint immediately and a slow upstream (Reddit, YouTube, Jolpica)
 * never blocks the rest of the page. The hero, wire rail, and Editors' Picks all
 * share ONE cached RSS fetch (see lib/home-feed). Static sections render inline.
 */
export default function HomePage() {
  return (
    <>
      <Suspense
        fallback={<div className="shimmer h-[88vh] min-h-[640px] w-full" aria-hidden />}
      >
        <HeroLeadStory />
      </Suspense>

      <Suspense fallback={<RailFallback><NewsRailSkeleton count={5} /></RailFallback>}>
        <HeroRail />
      </Suspense>

      <QuickLinks />

      <Suspense fallback={<RailFallback><VideoRailSkeleton /></RailFallback>}>
        <FeaturedVideoRail />
      </Suspense>

      <Suspense fallback={<RailFallback><NewsRailSkeleton /></RailFallback>}>
        <EditorsPicks />
      </Suspense>

      <Suspense fallback={<RailFallback><StandingsSkeleton /></RailFallback>}>
        <StandingsPreview />
      </Suspense>

      <Suspense fallback={<RailFallback><VideoRailSkeleton /></RailFallback>}>
        <HighlightsRail />
      </Suspense>

      <Suspense fallback={<RailFallback><NewsRailSkeleton count={3} /></RailFallback>}>
        <SocialPulse />
      </Suspense>

      <NewsletterCTA />
      <PartnerBar />
    </>
  );
}
