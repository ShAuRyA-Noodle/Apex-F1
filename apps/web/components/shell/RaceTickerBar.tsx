import { jolpica, mapRace, type UiRace } from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji } from '@/lib/format';
import { RaceTickerCountdown } from './RaceTickerCountdown';
import Link from 'next/link';

function pickWindow(now: number, races: UiRace[]) {
  const sorted = races.slice().sort((a, b) => a.round - b.round);
  const nextIdx = sorted.findIndex((r) => new Date(r.raceStartIso).getTime() > now);
  const prevIdx = nextIdx === -1 ? sorted.length - 1 : Math.max(0, nextIdx - 1);
  const window = sorted
    .slice(Math.max(0, prevIdx), Math.min(sorted.length, prevIdx + 3))
    .filter(Boolean) as UiRace[];
  const next = sorted[nextIdx === -1 ? sorted.length - 1 : nextIdx];
  return { window, next };
}

export async function RaceTickerBar() {
  const raw = await jolpica.getSchedule('current', { revalidate: 600 });
  const races = raw.map(mapRace);
  const { window, next } = pickWindow(Date.now(), races);

  return (
    <div className="sticky top-0 z-40 border-b border-outline-variant/40 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-stretch gap-px overflow-x-auto px-4 md:px-grid-margin">
        {window.map((race) => {
          const startMs = new Date(race.raceStartIso).getTime();
          const isPast = startMs < Date.now();
          const isNext = race.slug === next?.slug;
          const cc = countryNameToCode(race.country);
          return (
            <Link
              key={race.slug}
              href={`/schedule/${race.season}/${race.slug}`}
              className="group relative flex min-w-[260px] flex-1 items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-container-low"
            >
              <span
                className={
                  isPast
                    ? 'text-data text-outline'
                    : isNext
                      ? 'text-data text-on-surface-variant'
                      : 'text-data text-on-surface-variant'
                }
              >
                {isPast ? 'PREVIOUS' : isNext ? 'NEXT RACE' : 'UPCOMING'}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] uppercase tracking-[0.18em] text-outline">
                  R{String(race.round).padStart(2, '0')} · {flagEmoji(cc)} {race.country}
                </span>
                <span className="font-headline text-base font-bold text-on-background">
                  {race.name}
                </span>
              </div>
              {isNext && <RaceTickerCountdown targetIso={race.raceStartIso} />}
              <span className="material-symbols-outlined ml-auto text-[18px] text-outline transition-transform group-hover:translate-x-1">
                chevron_right
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
