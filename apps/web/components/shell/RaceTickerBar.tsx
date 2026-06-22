import { jolpica, mapRace, type UiRace } from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji } from '@/lib/format';
import { RaceTickerCountdown } from './RaceTickerCountdown';
import Link from 'next/link';

/**
 * RaceTickerBar v2
 * - Below MegaNav, glass-medium
 * - 4 race chips: previous / next / upcoming / upcoming+1
 * - Each chip 280px on desktop (next chip is double width = 560px)
 * - Snap-x on mobile, hover lift + red halo on desktop
 * - Next chip has circuit silhouette behind, countdown in front
 */

function pickWindow(now: number, races: UiRace[]) {
  const sorted = races.slice().sort((a, b) => a.round - b.round);
  const nextIdx = sorted.findIndex((r) => new Date(r.raceStartIso).getTime() > now);
  const safeNextIdx = nextIdx === -1 ? sorted.length - 1 : nextIdx;
  const prevIdx = Math.max(0, safeNextIdx - 1);
  const window = sorted
    .slice(prevIdx, Math.min(sorted.length, prevIdx + 4))
    .filter(Boolean) as UiRace[];
  return { window, nextSlug: sorted[safeNextIdx]?.slug };
}

export async function RaceTickerBar() {
  let races: UiRace[] = [];
  try {
    const raw = await jolpica.getSchedule('current', { revalidate: 600 });
    races = raw.map(mapRace);
  } catch {
    races = [];
  }

  if (races.length === 0) {
    return <RaceTickerEmpty />;
  }

  const { window, nextSlug } = pickWindow(Date.now(), races);

  return (
    <div
      data-shell="race-ticker"
      className="glass-medium sticky top-16 z-30 md:top-[104px]"
    >
      <div className="apex-container">
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 py-3 md:mx-0 md:gap-4 md:px-0 md:py-4">
          {window.map((race) => {
            const startMs = new Date(race.raceStartIso).getTime();
            const isPast = startMs < Date.now();
            const isNext = race.slug === nextSlug;
            const cc = countryNameToCode(race.country);
            return (
              <RaceChip
                key={race.slug}
                race={race}
                cc={cc}
                isPast={isPast}
                isNext={isNext}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RaceChip({
  race,
  cc,
  isPast,
  isNext,
}: {
  race: UiRace;
  cc: string | null;
  isPast: boolean;
  isNext: boolean;
}) {
  const status = isPast ? 'PREVIOUS' : isNext ? 'NEXT RACE' : 'UPCOMING';
  const accent = isNext
    ? 'text-telemetry-red'
    : isPast
      ? 'text-outline'
      : 'text-on-surface-variant';

  return (
    <Link
      href={`/schedule/${race.season}/${race.slug}`}
      className={`group relative flex shrink-0 snap-start flex-col justify-between overflow-hidden border border-outline-variant/30 bg-surface-container/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-outline-variant/60 ${
        isNext
          ? 'w-[88vw] md:w-[560px] hover:shadow-[0_20px_50px_-20px_rgba(225,6,0,0.5)]'
          : 'w-[78vw] md:w-[280px] hover:shadow-[0_16px_36px_-20px_rgba(0,0,0,0.7)]'
      }`}
      style={{ minHeight: '108px' }}
    >
      {/* Circuit silhouette behind next-race chip */}
      {isNext && (
        <svg
          aria-hidden
          viewBox="0 0 560 110"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.10] transition-opacity group-hover:opacity-20"
          preserveAspectRatio="none"
        >
          <path
            d="M20 80 Q60 40 110 50 T210 60 Q260 70 300 40 T420 30 Q480 25 530 55 L540 95 L40 95 Z"
            fill="none"
            stroke="var(--color-telemetry-red)"
            strokeWidth="2"
          />
        </svg>
      )}

      {/* Red active accent line for next */}
      {isNext && (
        <span className="absolute left-0 top-0 h-full w-[3px] bg-telemetry-red" aria-hidden />
      )}

      <div className="relative flex items-center justify-between">
        <span className={`font-data text-[10.5px] tracking-[0.20em] ${accent}`}>
          {status}
        </span>
        <span className="font-data text-[10.5px] tracking-[0.18em] text-outline">
          R{String(race.round).padStart(2, '0')}
        </span>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-[20px] leading-none">{flagEmoji(cc)}</span>
          <span className="font-data text-[11px] tracking-[0.18em] text-on-surface-variant">
            {race.country.toUpperCase()}
          </span>
        </div>
        <h3
          className={`mt-1.5 font-display font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-on-background ${
            isNext ? 'text-[26px] md:text-[30px]' : 'text-[17px]'
          }`}
        >
          {race.name.replace(' Grand Prix', ' GP')}
        </h3>
      </div>

      {isNext && (
        <div className="relative mt-2">
          <RaceTickerCountdown targetIso={race.raceStartIso} />
        </div>
      )}

      {!isNext && (
        <div className="relative flex items-center justify-between">
          <span className="font-data text-[10.5px] tracking-[0.16em] text-outline">
            {new Date(race.raceStartIso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
          </span>
          <span className="material-symbols-outlined text-[16px] text-outline transition-transform group-hover:translate-x-0.5">
            arrow_outward
          </span>
        </div>
      )}
    </Link>
  );
}

function RaceTickerEmpty() {
  return (
    <div className="glass-medium sticky top-16 z-30 md:top-[104px]">
      <div className="apex-container py-4">
        <div className="flex items-center justify-between border border-outline-variant/30 bg-surface-container/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px] text-outline">flag_circle</span>
            <div>
              <p className="font-data text-[11px] tracking-[0.18em] text-outline">SCHEDULE OFFLINE</p>
              <p className="font-headline text-[14px] text-on-surface-variant">
                Pulse paused. Jolpica took a coffee break. Calendar will be back in a sec.
              </p>
            </div>
          </div>
          <Link
            href="/schedule"
            className="font-data text-[11px] tracking-[0.18em] text-telemetry-red hover:text-on-background"
          >
            FULL CALENDAR
          </Link>
        </div>
      </div>
    </div>
  );
}
