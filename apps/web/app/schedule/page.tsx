import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica, mapRace } from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji, formatDateRange } from '@/lib/format';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'Full Formula 1 race calendar. Schedule, sessions, circuits, timezones.',
};

const SEASON = 2026;

export default async function SchedulePage() {
  const races = (await jolpica.getSchedule(SEASON, { revalidate: 3600 })).map(mapRace);
  const now = Date.now();

  const nextIdx = races.findIndex((r) => new Date(r.raceStartIso).getTime() > now);

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-data text-telemetry-red">2026 SEASON</span>
          <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            Schedule
          </h1>
          <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
            {races.length} rounds. Live data from Jolpica F1. All times in your local timezone.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-outline-variant/60 p-1">
          {[2024, 2025, 2026].map((y) => (
            <Link
              key={y}
              href={`/schedule/${y}`}
              className={
                y === SEASON
                  ? 'bg-telemetry-red px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background'
                  : 'px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
              }
            >
              {y}
            </Link>
          ))}
        </div>
      </header>

      <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2">
        {races.map((r, i) => {
          const isPast = new Date(r.raceStartIso).getTime() < now;
          const isNext = i === nextIdx;
          // Anchor target so MegaNav "Jump to next race" link works.
          const cc = countryNameToCode(r.country);
          return (
            <li
              key={r.slug}
              id={isNext || (nextIdx === -1 && i === races.length - 1) ? 'next' : undefined}
              className="bg-background scroll-mt-24"
            >
              <Link
                href={`/schedule/${SEASON}/${r.slug}`}
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
                    {formatDateRange(
                      r.sessions[0]?.iso ?? r.raceStartIso,
                      r.raceStartIso,
                    )}
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

      <p className="mt-10 text-xs text-outline">
        Source: Jolpica F1 API. Calendar may change subject to FIA / FOM updates.
      </p>
    </article>
  );
}
