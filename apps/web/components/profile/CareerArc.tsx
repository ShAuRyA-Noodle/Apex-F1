'use client';

import { motion, useInView } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';

export interface CareerArcYear {
  year: number;
  teamSlug?: string;
  teamColor: string;
  teamName?: string;
  bestResult?: string;
  isChampion?: boolean;
}

interface CareerArcProps {
  startYear?: number;
  endYear?: number;
  years: CareerArcYear[];
  className?: string;
}

/**
 * CareerArc
 * Horizontal full-history timeline. Active years filled with team color.
 * Championship years carry a podium-gold star. Tooltip on hover/tap.
 */
export function CareerArc({
  startYear = 1950,
  endYear = new Date().getUTCFullYear(),
  years,
  className,
}: CareerArcProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' });
  const [hover, setHover] = useState<number | null>(null);

  const map = useMemo(() => {
    const m = new Map<number, CareerArcYear>();
    for (const y of years) m.set(y.year, y);
    return m;
  }, [years]);

  const range: number[] = useMemo(() => {
    const arr: number[] = [];
    for (let y = startYear; y <= endYear; y++) arr.push(y);
    return arr;
  }, [startYear, endYear]);

  const activeYears = years.map((y) => y.year);
  const firstActive = Math.min(...activeYears);
  const lastActive = Math.max(...activeYears);

  return (
    <div ref={ref} className={`relative w-full ${className ?? ''}`}>
      {/* Decade labels */}
      <div className="mb-4 flex justify-between text-data text-outline">
        {[1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* Track */}
      <div className="relative h-14 w-full border-t border-b border-outline-variant/40 bg-linear-to-b from-surface-container-low/40 to-transparent">
        {/* Reveal line at top — animates left→right */}
        <motion.span
          aria-hidden="true"
          className="absolute left-0 top-[-1px] block h-px bg-telemetry-red"
          initial={{ width: 0 }}
          animate={inView ? { width: '100%' } : { width: 0 }}
          transition={{ duration: 1.6, ease: [0.215, 0.61, 0.355, 1] }}
        />

        {/* Year cells */}
        <ul className="flex h-full w-full">
          {range.map((y, idx) => {
            const data = map.get(y);
            const active = Boolean(data);
            const champion = data?.isChampion;
            const cellWidth = `${100 / range.length}%`;
            return (
              <li
                key={y}
                className="group relative h-full"
                style={{ width: cellWidth }}
                onMouseEnter={() => setHover(y)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(y)}
                onBlur={() => setHover(null)}
                tabIndex={active ? 0 : -1}
              >
                {/* Active year block */}
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-3 block"
                  style={{
                    left: 0,
                    right: 0,
                    backgroundColor: data?.teamColor ?? 'transparent',
                    opacity: active ? 0.95 : 0,
                  }}
                  initial={{ scaleY: 0 }}
                  animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.4 + (idx / range.length) * 0.9,
                    ease: [0.215, 0.61, 0.355, 1],
                  }}
                />
                {/* Champion gold star */}
                {champion && (
                  <span
                    aria-label={`World Champion ${y}`}
                    className="absolute left-1/2 top-[-22px] -translate-x-1/2 text-[18px] text-[#f5c945] drop-shadow-[0_0_8px_rgba(245,201,69,0.55)]"
                  >
                    ★
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Tooltip */}
        {hover !== null && (() => {
          const data = map.get(hover);
          if (!data) return null;
          return (
            <CareerTooltip data={data} percent={((hover - startYear) / (endYear - startYear)) * 100} />
          );
        })()}
      </div>

      {/* Bottom range labels */}
      <div className="mt-3 flex justify-between text-data text-outline">
        <span>FIRST RACE · {firstActive}</span>
        <span>LATEST · {lastActive}</span>
      </div>
    </div>
  );
}

function CareerTooltip({ data, percent }: { data: CareerArcYear; percent: number }) {
  return (
    <motion.div
      role="tooltip"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
      className="pointer-events-none absolute top-[64px] z-20 -translate-x-1/2 whitespace-nowrap border border-outline-variant/60 bg-surface-container px-4 py-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur"
      style={{ left: `${percent}%` }}
    >
      <div className="text-data text-telemetry-red">{data.year}</div>
      <div className="mt-1 font-headline text-lg text-on-background">
        {data.teamName ?? 'Unknown team'}
      </div>
      {data.bestResult && (
        <div className="mt-1 font-data text-xs text-on-surface-variant">
          BEST · {data.bestResult}
        </div>
      )}
      {data.isChampion && (
        <div className="mt-1 text-data text-[#f5c945]">★ WORLD CHAMPION</div>
      )}
    </motion.div>
  );
}
