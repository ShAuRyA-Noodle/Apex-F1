import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapRace } from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji, formatDateRange } from '@/lib/format';

export const revalidate = 3600;

export async function generateMetadata(props: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await props.params;
  return {
    title: `${season} Schedule`,
    description: `Formula 1 ${season} race calendar · dates, circuits, sessions.`,
  };
}

export default async function SeasonSchedulePage(props: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await props.params;
  const seasonNum = Number(season);
  // Reject non-numeric / out-of-range seasons instead of rendering an empty 200.
  if (!Number.isInteger(seasonNum) || seasonNum < 1950 || seasonNum > 2026) notFound();
  const races = (await jolpica.getSchedule(seasonNum, { revalidate: 3600 })).map(mapRace);
  if (races.length === 0) notFound();
  const now = Date.now();
  const nextIdx = races.findIndex((r) => new Date(r.raceStartIso).getTime() > now);

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/schedule"
            className="group mb-3 inline-flex items-center gap-2 text-data text-on-surface-variant transition-colors hover:text-on-background"
          >
            <span className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            ALL SEASONS
          </Link>
          <span className="block text-data text-telemetry-red">{season} SEASON</span>
          <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            Schedule
          </h1>
          <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
            {races.length} rounds. Source: Jolpica F1.
          </p>
        </div>
      </header>

      <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2">
        {races.map((r, i) => {
          const isPast = new Date(r.raceStartIso).getTime() < now;
          const isNext = i === nextIdx;
          const cc = countryNameToCode(r.country);
          return (
            <li key={r.slug} className="bg-background">
              <Link
                href={`/schedule/${seasonNum}/${r.slug}`}
                className="group relative flex h-full items-stretch gap-5 p-6 transition-colors hover:bg-surface-container-low md:p-8"
              >
                <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-outline-variant/40 pr-5">
                  <div className="text-data text-outline">ROUND</div>
                  <div className="font-data text-3xl text-on-background md:text-4xl">
                    {String(r.round).padStart(2, '0')}
                  </div>
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center gap-2 text-data">
                    <span className="text-xl leading-none">{flagEmoji(cc)}</span>
                    <span className="text-on-surface-variant">{r.country}</span>
                    {isPast && <span className="text-outline">· COMPLETED</span>}
                    {isNext && <span className="text-telemetry-red">· NEXT</span>}
                  </div>
                  <h2 className="mt-2 font-headline text-xl text-on-background md:text-2xl">
                    {r.name}
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{r.circuitName}</p>
                  <p className="mt-3 font-data text-xs text-outline">
                    {formatDateRange(r.sessions[0]?.iso ?? r.raceStartIso, r.raceStartIso)}
                  </p>
                </div>
                <span className="material-symbols-outlined self-center text-[24px] text-outline transition-transform group-hover:translate-x-1">
                  chevron_right
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
