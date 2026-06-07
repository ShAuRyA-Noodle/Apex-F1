'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { upcomingTickerRaces } from '@/lib/fixtures/races';

function useCountdown(targetIso: string) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const delta = Math.max(0, new Date(targetIso).getTime() - now);
  const days = Math.floor(delta / 86_400_000);
  const hours = Math.floor((delta % 86_400_000) / 3_600_000);
  const mins = Math.floor((delta % 3_600_000) / 60_000);
  const secs = Math.floor((delta % 60_000) / 1000);
  return { days, hours, mins, secs };
}

export function RaceTickerBar() {
  const races = upcomingTickerRaces;
  const next = races.find((r) => r.status === 'upcoming') ?? races[0];
  const targetIso = next?.dateStart ?? new Date().toISOString();
  const { days, hours, mins, secs } = useCountdown(targetIso);

  return (
    <div className="sticky top-0 z-40 border-b border-outline-variant/40 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-stretch gap-px overflow-x-auto px-4 md:px-grid-margin">
        {races.map((race) => {
          const isNext = race.status === 'upcoming' && race === next;
          return (
            <Link
              key={race.slug}
              href={`/schedule/${race.season}/${race.slug}`}
              className="group relative flex min-w-[260px] flex-1 items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-container-low"
            >
              <span
                className={
                  race.status === 'completed'
                    ? 'text-data text-outline'
                    : race.status === 'live'
                      ? 'text-data text-telemetry-red'
                      : 'text-data text-on-surface-variant'
                }
              >
                {race.status === 'completed'
                  ? 'PREVIOUS'
                  : race.status === 'live'
                    ? '● LIVE'
                    : isNext
                      ? 'NEXT RACE'
                      : 'UPCOMING'}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] uppercase tracking-[0.18em] text-outline">
                  R{String(race.round).padStart(2, '0')} · {race.country}
                </span>
                <span className="font-headline text-base font-bold text-on-background">
                  {race.shortName}
                </span>
              </div>
              {isNext && (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-auto flex items-center gap-1 font-data text-xs text-telemetry-red"
                >
                  <span>{days}d</span>
                  <span className="text-outline">:</span>
                  <span>{String(hours).padStart(2, '0')}h</span>
                  <span className="text-outline">:</span>
                  <span>{String(mins).padStart(2, '0')}m</span>
                  <span className="text-outline">:</span>
                  <span>{String(secs).padStart(2, '0')}s</span>
                </motion.div>
              )}
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
