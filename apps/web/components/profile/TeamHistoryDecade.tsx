'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { DecadeTabs } from './DecadeTabs';
import { CountUpBadge } from './CountUpBadge';

export interface HistorySeason {
  year: number;
  wins: number;
  podiums: number;
  points: number;
  races: number;
  drivers: string[];
}

interface TeamHistoryDecadeProps {
  seasons: HistorySeason[];
  teamColor: string;
}

/**
 * TeamHistoryDecade
 * Renders a decade selector + per-season stat bars for the chosen decade.
 * Best season inside the decade gets a podium-gold trim.
 */
export function TeamHistoryDecade({ seasons, teamColor }: TeamHistoryDecadeProps) {
  const grouped = useMemo(() => {
    const m = new Map<number, HistorySeason[]>();
    for (const s of seasons) {
      const d = Math.floor(s.year / 10) * 10;
      const list = m.get(d) ?? [];
      list.push(s);
      m.set(d, list);
    }
    return m;
  }, [seasons]);

  const decades = useMemo(() => Array.from(grouped.keys()).sort((a, b) => a - b), [grouped]);
  const [active, setActive] = useState<number>(decades[decades.length - 1] ?? 2020);

  if (!decades.length) {
    return (
      <p className="font-editorial text-xl text-on-surface-variant">
        No season data available yet for this constructor.
      </p>
    );
  }

  const seasonsInDecade = (grouped.get(active) ?? []).slice().sort((a, b) => a.year - b.year);
  const maxPoints = Math.max(...seasonsInDecade.map((s) => s.points), 1);
  const bestYear: HistorySeason | undefined = seasonsInDecade.reduce<HistorySeason | undefined>(
    (best, s) => (!best || s.points > best.points ? s : best),
    undefined,
  );

  return (
    <div>
      <DecadeTabs
        decades={decades}
        defaultDecade={active}
        onChange={setActive}
        teamColor={teamColor}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.5, ease: [0.215, 0.61, 0.355, 1] }}
          className="mt-10 space-y-px bg-outline-variant/30"
        >
          {seasonsInDecade.map((s, i) => {
            const widthPct = (s.points / maxPoints) * 100;
            const isBest = s.year === bestYear?.year && s.points > 0;
            return (
              <motion.article
                key={s.year}
                initial={{ opacity: 0, x: -32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: i * 0.06,
                  duration: 0.55,
                  ease: [0.215, 0.61, 0.355, 1],
                }}
                className={`relative grid grid-cols-1 gap-6 bg-surface-container-lowest/80 px-6 py-9 backdrop-blur md:grid-cols-[120px_1fr] md:gap-10 md:px-10 ${
                  isBest ? 'ring-1 ring-[#f5c945]/60' : ''
                }`}
              >
                <div>
                  <div className="font-display text-5xl leading-none tracking-tight text-on-background md:text-6xl">
                    {s.year}
                  </div>
                  {isBest && (
                    <div className="mt-2 inline-flex items-center gap-2 text-data text-[#f5c945]">
                      ★ BEST OF DECADE
                    </div>
                  )}
                </div>

                <div>
                  <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
                    <Stat label="RACES" value={s.races} />
                    <Stat label="WINS" value={s.wins} accent={s.wins > 0} />
                    <Stat label="PODIUMS" value={s.podiums} />
                    <Stat label="POINTS" value={s.points} large />
                  </div>

                  {/* Points bar */}
                  <div className="mt-6">
                    <div className="text-data text-outline">SEASON POINTS</div>
                    <div className="mt-2 h-3 w-full overflow-hidden bg-surface-container-low">
                      <motion.span
                        aria-hidden="true"
                        className="block h-full"
                        style={{ backgroundColor: isBest ? '#f5c945' : teamColor }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${widthPct}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.9,
                          delay: i * 0.06,
                          ease: [0.215, 0.61, 0.355, 1],
                        }}
                      />
                    </div>
                  </div>

                  {/* Driver lineup chips */}
                  {s.drivers.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {s.drivers.map((name) => (
                        <span
                          key={name}
                          className="border border-outline-variant/40 bg-surface-container/40 px-3 py-1.5 font-data text-xs uppercase tracking-[0.18em] text-on-surface-variant"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  large,
}: {
  label: string;
  value: number;
  accent?: boolean;
  large?: boolean;
}) {
  return (
    <div>
      <div className="text-data text-outline">{label}</div>
      <div
        className={`mt-2 font-headline leading-none tracking-tight ${
          large ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'
        } ${accent ? 'text-telemetry-red' : 'text-on-background'}`}
      >
        <CountUpBadge value={value} />
      </div>
    </div>
  );
}
