import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapDriver, mapResult } from '@apex/api-client/jolpica';
import { getDriverFactsFromWikidata } from '@apex/api-client/wikidata';
import {
  nationalityToCountryCode,
  flagEmoji,
  teamColorBySlug,
} from '@/lib/format';
import { ParallaxHero } from '@/components/profile/ParallaxHero';
import { StatStrip } from '@/components/profile/StatStrip';
import { SeasonCard, type SeasonRace } from '@/components/profile/SeasonCard';

export const revalidate = 86400;

function commonsImageUrl(wikidataImage: string): string {
  const u = new URL(wikidataImage);
  u.searchParams.set('width', '1600');
  return u.toString();
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const raw = await jolpica.getDriver(slug);
  if (!raw) return { title: 'Driver not found' };
  const d = mapDriver(raw);
  return {
    title: `${d.fullName} · Career`,
    description: `${d.fullName} · full Formula 1 race-by-race career: every season, every result.`,
  };
}

export default async function DriverCareerPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const raw = await jolpica.getDriver(slug);
  if (!raw) notFound();
  const d = mapDriver(raw);
  const cc = nationalityToCountryCode(d.nationality);
  const facts = await getDriverFactsFromWikidata(d.fullName, { revalidate: 86400 });

  const allResults = await jolpica.getDriverResults(slug, { revalidate: 86400 });

  // Aggregate totals + season grouping.
  const seasons = new Map<number, SeasonRace[]>();
  let totalStarts = 0;
  let totalWins = 0;
  let totalPodiums = 0;
  let totalPoles = 0;
  let totalFastestLaps = 0;
  let totalPoints = 0;

  for (const race of allResults) {
    const year = Number(race.season);
    const round = Number(race.round);
    const list = seasons.get(year) ?? [];
    const result = race.Results?.[0] ? mapResult(race.Results[0]) : undefined;

    if (result) {
      totalStarts++;
      if (result.position === 1) totalWins++;
      if (result.position && result.position <= 3) totalPodiums++;
      if (result.grid === 1) totalPoles++;
      if (result.fastestLap?.rank === 1) totalFastestLaps++;
      totalPoints += result.points;
    }

    list.push({
      round,
      raceName: race.raceName,
      country: race.Circuit.Location.country,
      position: result?.position ?? null,
      positionText: result?.positionText ?? '·',
      points: result?.points ?? 0,
      teamColor: result ? teamColorBySlug(result.constructor.slug) : '#444',
      teamName: result?.constructor.name ?? '·',
    });

    seasons.set(year, list);
  }

  const sortedYears = Array.from(seasons.keys()).sort((a, b) => b - a);
  const heroImage = facts?.image ? commonsImageUrl(facts.image) : undefined;

  // Determine "current team" color for stripe / accent.
  const newestYear = sortedYears[0];
  const newestSeason = newestYear ? seasons.get(newestYear) : undefined;
  const currentTeamColor =
    newestSeason?.[newestSeason.length - 1]?.teamColor ?? '#444748';

  return (
    <article>
      <ParallaxHero
        imageUrl={heroImage}
        objectPosition="center 18%"
        height="md"
        accent="#e10600"
        rightStripeColor={currentTeamColor}
      >
        {/* Top utility */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1700px] items-center justify-between px-6 pt-12 md:px-grid-margin md:pt-16">
          <Link
            href={`/drivers/${slug}`}
            className="group inline-flex items-center gap-2 text-data text-on-surface-variant transition-colors hover:text-telemetry-red"
            style={{ viewTransitionName: 'driver-back' }}
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            {d.fullName} · profile
          </Link>
          <span className="text-data text-outline">
            CAREER · {flagEmoji(cc)} {d.nationality}
          </span>
        </div>

        {/* Name + tagline */}
        <div className="relative z-10 mx-auto mt-auto flex w-full max-w-[1700px] flex-col gap-8 px-4 pb-16 md:px-grid-margin md:pb-20">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-2 w-12"
              style={{ backgroundColor: currentTeamColor }}
            />
            <span className="text-data text-on-surface-variant">FULL CAREER</span>
          </div>
          <h1
            className="font-display uppercase leading-[0.86] tracking-[-0.04em] text-on-background"
            style={{
              fontSize: 'clamp(3.5rem, 11vw, 8.5rem)',
              viewTransitionName: `driver-name-${d.slug}`,
            }}
          >
            {d.fullName}
          </h1>
          <p className="max-w-2xl font-editorial text-xl text-on-surface-variant md:text-2xl">
            Every Grand Prix from debut through the latest checkered flag.
            Tap a season to expand into round-by-round race cards.
          </p>
        </div>
      </ParallaxHero>

      {/* AGGREGATE STAT STRIP */}
      <StatStrip
        items={[
          { label: 'STARTS', value: totalStarts },
          { label: 'WINS', value: totalWins },
          { label: 'PODIUMS', value: totalPodiums },
          { label: 'POLES', value: totalPoles },
          { label: 'FASTEST LAPS', value: totalFastestLaps },
          { label: 'POINTS', value: totalPoints, group: true },
        ]}
      />

      {/* SEASON-BY-SEASON */}
      <section className="mx-auto w-full max-w-[1700px] px-4 py-24 md:px-grid-margin md:py-32">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-data text-telemetry-red">SEASON BY SEASON</span>
            <h2 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
              {sortedYears.length} {sortedYears.length === 1 ? 'season' : 'seasons'} on the grid
            </h2>
          </div>
          <p className="max-w-md font-editorial text-lg italic text-on-surface-variant md:text-xl">
            Source · Jolpica F1 mirror of Ergast. ISR 24h.
          </p>
        </header>

        <div className="space-y-6">
          {sortedYears.map((year) => {
            const races = seasons.get(year)!.slice().sort((a, b) => a.round - b.round);
            const wins = races.filter((r) => r.position === 1).length;
            const podiums = races.filter((r) => r.position !== null && r.position <= 3).length;
            const points = races.reduce((acc, r) => acc + r.points, 0);
            const bestPos = races
              .map((r) => r.position)
              .filter((p): p is number => p !== null)
              .reduce((acc, p) => Math.min(acc, p), 99);

            const bestResult =
              bestPos === 99
                ? '·'
                : bestPos === 1
                  ? 'WIN'
                  : bestPos === 2
                    ? '2nd'
                    : bestPos === 3
                      ? '3rd'
                      : `P${bestPos}`;

            return (
              <SeasonCard
                key={year}
                year={year}
                races={races}
                wins={wins}
                podiums={podiums}
                points={points}
                bestResult={bestResult}
                defaultOpen={year === sortedYears[0]}
              />
            );
          })}

          {sortedYears.length === 0 && (
            <p className="text-center font-editorial text-xl text-on-surface-variant">
              No race results found for this driver via Jolpica.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
