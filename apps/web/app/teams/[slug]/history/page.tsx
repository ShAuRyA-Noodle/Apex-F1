import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapConstructor, mapResult } from '@apex/api-client/jolpica';
import {
  nationalityToCountryCode,
  flagEmoji,
  teamColorBySlug,
} from '@/lib/format';
import { TeamHistoryDecade } from '@/components/profile/TeamHistoryDecade';

export const revalidate = 86400;

const CURRENT_YEAR = new Date().getUTCFullYear();

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const raw = await jolpica.getConstructor(slug);
  if (!raw) return { title: 'Team not found' };
  const c = mapConstructor(raw);
  return {
    title: `${c.name} · History`,
    description: `${c.name} · Formula 1 constructor history, decade-by-decade results, every driver, every podium.`,
  };
}

export default async function TeamHistoryPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const raw = await jolpica.getConstructor(slug);
  if (!raw) notFound();
  const c = mapConstructor(raw);
  const cc = nationalityToCountryCode(c.nationality);
  const color = teamColorBySlug(c.slug);

  // Pull last 10 seasons of results. Pre-2016 history requires the Phase B
  // Wikidata seed; until then we serve a decade window honestly.
  const seasonRange: number[] = [];
  for (let y = CURRENT_YEAR; y >= CURRENT_YEAR - 9; y--) seasonRange.push(y);

  const seasonResults = await Promise.all(
    seasonRange.map(async (year) => {
      try {
        const races = await jolpica.getConstructorResultsInSeason(c.slug, year, {
          revalidate: 86400,
        });
        return { year, races };
      } catch {
        return { year, races: [] };
      }
    }),
  );

  const seasons = seasonResults
    .filter((s) => s.races.length > 0)
    .map((s) => {
      let wins = 0;
      let podiums = 0;
      let points = 0;
      let starts = 0;
      const drivers = new Set<string>();
      for (const race of s.races) {
        for (const r of race.Results ?? []) {
          const result = mapResult(r);
          starts++;
          if (result.position === 1) wins++;
          if (result.position && result.position <= 3) podiums++;
          points += result.points;
          drivers.add(result.driver.fullName);
        }
      }
      return {
        year: s.year,
        wins,
        podiums,
        points,
        races: s.races.length,
        drivers: Array.from(drivers),
        starts,
      };
    });

  return (
    <article>
      {/* HERO · same color treatment as team profile, tighter */}
      <section
        className="relative isolate min-h-[60svh] w-full overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${color} 0%, ${color}AA 30%, #0f0f0f 90%)`,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zM20 20h20v20H20z' fill='%23000' fill-opacity='0.6'/%3E%3C/svg%3E\")",
            backgroundSize: '120px 120px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,15,15,0.5) 0%, transparent 22%, transparent 55%, rgba(15,15,15,0.6) 82%, #0f0f0f 100%)',
          }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[1700px] items-center justify-between px-6 pt-12 md:px-grid-margin md:pt-16">
          <Link
            href={`/teams/${slug}`}
            className="group inline-flex items-center gap-2 text-data text-on-background/80 transition-colors hover:text-on-background"
            style={{ viewTransitionName: 'team-back' }}
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            {c.name} · profile
          </Link>
          <span className="text-data text-on-background/70">
            HISTORY · {flagEmoji(cc)} {c.nationality}
          </span>
        </div>

        <div className="relative z-10 mx-auto mt-auto flex w-full max-w-[1700px] flex-col gap-8 px-4 pb-16 md:px-grid-margin md:pb-20">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-2 w-12 bg-on-background" />
            <span className="text-data text-on-background/70">HERITAGE</span>
          </div>
          <h1
            className="font-display uppercase leading-[0.86] tracking-[-0.04em] text-on-background"
            style={{
              fontSize: 'clamp(3.5rem, 11vw, 9rem)',
              viewTransitionName: `team-name-${c.slug}`,
              textShadow: '0 6px 60px rgba(0,0,0,0.45)',
            }}
          >
            {c.name}
          </h1>
          <p className="max-w-2xl font-editorial text-xl text-on-background/80 md:text-2xl">
            Filter by decade. Every season since {seasons.length > 0 ? (seasons[seasons.length - 1]?.year ?? CURRENT_YEAR - 9) : CURRENT_YEAR - 9} mapped against wins, podiums and points,
            with the strongest year highlighted in podium gold.
          </p>
        </div>
      </section>

      {/* DECADE EXPLORER */}
      <section className="border-t border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1700px] px-4 py-24 md:px-grid-margin md:py-32">
          <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="text-data text-telemetry-red">DECADE EXPLORER</span>
              <h2 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
                {seasons.length} {seasons.length === 1 ? 'season' : 'seasons'} on record
              </h2>
            </div>
            <p className="max-w-md font-editorial text-lg italic text-on-surface-variant md:text-xl">
              Pre-2016 history & founding-year metadata arrive with the Phase B
              Wikidata constructor ingest.
            </p>
          </header>

          {seasons.length === 0 ? (
            <p className="font-editorial text-xl text-on-surface-variant">
              No recent season data available via Jolpica for this constructor.
            </p>
          ) : (
            <TeamHistoryDecade seasons={seasons} teamColor={color} />
          )}

          <p className="mt-12 text-data text-outline">SOURCE · JOLPICA F1</p>
        </div>
      </section>
    </article>
  );
}
