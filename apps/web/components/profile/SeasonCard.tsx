'use client';

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useState } from 'react';
import { CountUpBadge } from './CountUpBadge';

export interface SeasonRace {
  round: number;
  raceName: string;
  country: string;
  position: number | null;
  positionText: string;
  points: number;
  teamColor: string;
  teamName: string;
}

interface SeasonCardProps {
  year: number;
  races: SeasonRace[];
  /** Aggregate season totals (pre-computed by parent). */
  wins: number;
  podiums: number;
  points: number;
  bestResult: string;
  championshipPosition?: number | null;
  /** Open by default — used for the most-recent year. */
  defaultOpen?: boolean;
}

/**
 * SeasonCard
 * Glass-subtle expanding row. Each season summarizes year, races, wins, points,
 * best result, championship position. Expanded view animates race cards in.
 */
export function SeasonCard({
  year,
  races,
  wins,
  podiums,
  points,
  bestResult,
  championshipPosition,
  defaultOpen = false,
}: SeasonCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <LayoutGroup id={`season-${year}`}>
      <motion.article
        layout
        data-podiums={podiums}
        className="relative overflow-hidden border border-outline-variant/30 bg-linear-to-b from-surface-container-low/70 to-surface-container-lowest/40 backdrop-blur-md"
        transition={{ layout: { duration: 0.5, ease: [0.215, 0.61, 0.355, 1] } }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`season-panel-${year}`}
          className="grid w-full cursor-pointer grid-cols-[auto_1fr] items-center gap-6 px-6 py-7 text-left transition-colors hover:bg-surface-container/40 md:grid-cols-[160px_1fr_auto_auto_auto_auto] md:gap-8 md:px-10 md:py-9"
        >
          <span className="font-display text-5xl leading-none tracking-tight text-on-background md:text-7xl">
            {year}
          </span>

          {/* Mobile stack */}
          <div className="md:hidden">
            <div className="font-data text-xs uppercase tracking-[0.18em] text-outline">
              {races.length} ROUNDS / {wins} WIN{wins === 1 ? '' : 'S'}
            </div>
            <div className="mt-2 font-headline text-2xl text-on-background">
              <CountUpBadge value={points} suffix=" PTS" />
            </div>
          </div>

          {/* Desktop columns */}
          <SeasonCol label="RACES" value={String(races.length)} />
          <SeasonCol label="WINS" value={String(wins)} accent={wins > 0} />
          <SeasonCol label="POINTS" value={String(points)} large />
          <SeasonCol label="BEST" value={bestResult} />
          <SeasonCol
            label="CHAMP."
            value={championshipPosition ? `P${championshipPosition}` : '·'}
          />

          <span
            aria-hidden="true"
            className="absolute right-6 top-1/2 -translate-y-1/2 text-outline transition-transform duration-500 ease-cinematic md:right-10"
            style={{ transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)` }}
          >
            <span className="material-symbols-outlined">expand_more</span>
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key={`panel-${year}`}
              id={`season-panel-${year}`}
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.215, 0.61, 0.355, 1] }}
              className="overflow-hidden border-t border-outline-variant/30"
            >
              <ul className="grid grid-cols-1 gap-px bg-outline-variant/30 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {races.map((race, idx) => (
                  <RaceCard key={`${year}-${race.round}`} race={race} index={idx} open={open} />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    </LayoutGroup>
  );
}

function SeasonCol({
  label,
  value,
  accent,
  large,
}: {
  label: string;
  value: string;
  accent?: boolean;
  large?: boolean;
}) {
  return (
    <span className="hidden flex-col md:flex">
      <span className="text-data text-outline">{label}</span>
      <span
        className={`mt-2 font-headline leading-none tracking-tight ${large ? 'text-3xl' : 'text-xl'} ${
          accent ? 'text-telemetry-red' : 'text-on-background'
        }`}
      >
        {value}
      </span>
    </span>
  );
}

function RaceCard({
  race,
  index,
  open,
}: {
  race: SeasonRace;
  index: number;
  open: boolean;
}) {
  const pillTone = positionPill(race.position);
  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{
        delay: 0.05 + index * 0.025,
        duration: 0.45,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      className="relative bg-surface-container-lowest/70 px-6 py-7 backdrop-blur"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-1.5"
        style={{ backgroundColor: race.teamColor }}
      />
      <div className="flex items-baseline justify-between text-data text-outline">
        <span>R{String(race.round).padStart(2, '0')}</span>
        <span>{race.country}</span>
      </div>
      <h3 className="mt-3 font-headline text-xl text-on-background md:text-2xl">
        {race.raceName}
      </h3>
      <div className="mt-2 font-data text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
        {race.teamName}
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <span
          className={`inline-flex items-center px-3 py-1 font-headline text-sm uppercase tracking-[0.2em] ${pillTone}`}
        >
          {race.positionText}
        </span>
        <span className="font-display text-3xl leading-none tracking-tight text-on-background">
          {open ? <CountUpBadge value={race.points} duration={900} /> : race.points}
        </span>
      </div>
    </motion.li>
  );
}

function positionPill(pos: number | null): string {
  if (pos === null) return 'bg-surface-container text-on-surface-variant';
  if (pos === 1) return 'bg-[#f5c945] text-carbon-black';
  if (pos === 2) return 'bg-[#c0c0c0] text-carbon-black';
  if (pos === 3) return 'bg-[#cd7f32] text-carbon-black';
  if (pos <= 10) return 'bg-telemetry-red/15 text-telemetry-red';
  return 'bg-surface-container text-on-surface-variant';
}
