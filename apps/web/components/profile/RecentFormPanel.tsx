'use client';

import { motion } from 'framer-motion';

export interface RecentRace {
  round: number;
  raceName: string;
  country: string;
  position: number | null;
  positionText: string;
  teamColor: string;
}

interface RecentFormPanelProps {
  races: RecentRace[];
}

/**
 * RecentFormPanel
 * Five most recent races as cards. Connected by a subtle SVG polyline that
 * reads as a "trend" (rises when finishing positions improve, drops when worse).
 */
export function RecentFormPanel({ races }: RecentFormPanelProps) {
  if (!races.length) return null;
  const slice = races.slice(0, 5);

  // Build trend points · invert (1 = top of chart).
  const points = slice.map((r, i) => {
    const pos = r.position ?? 20;
    const norm = 1 - Math.min(pos, 20) / 20; // 0..1
    return { x: i, y: norm };
  });

  return (
    <div className="relative">
      {/* Trend line behind cards */}
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${(slice.length - 1) * 100} 100`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full opacity-50"
      >
        <motion.polyline
          fill="none"
          stroke="var(--color-telemetry-red)"
          strokeWidth="1.5"
          strokeLinecap="round"
          points={points
            .map((p, i) => `${i * 100},${100 - p.y * 100}`)
            .join(' ')}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.215, 0.61, 0.355, 1] }}
        />
      </svg>

      <ul className="relative grid grid-cols-2 gap-px bg-outline-variant/30 sm:grid-cols-5">
        {slice.map((r, i) => (
          <motion.li
            key={r.round}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
            transition={{
              delay: i * 0.08,
              duration: 0.55,
              ease: [0.215, 0.61, 0.355, 1],
            }}
            className="relative bg-surface-container-lowest/85 p-6 backdrop-blur md:p-8"
          >
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 h-full w-1"
              style={{ backgroundColor: r.teamColor }}
            />
            <div className="text-data text-outline">R{String(r.round).padStart(2, '0')}</div>
            <div className="mt-3 font-headline text-base text-on-background md:text-lg">
              {r.raceName}
            </div>
            <div className="mt-1 text-data text-outline">{r.country}</div>
            <div className="mt-6">
              <span
                className={`inline-flex items-center px-3 py-1 font-headline text-sm uppercase tracking-[0.2em] ${pill(r.position)}`}
              >
                {r.positionText}
              </span>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function pill(pos: number | null): string {
  if (pos === null) return 'bg-surface-container text-on-surface-variant';
  if (pos === 1) return 'bg-[#f5c945] text-carbon-black';
  if (pos === 2) return 'bg-[#c0c0c0] text-carbon-black';
  if (pos === 3) return 'bg-[#cd7f32] text-carbon-black';
  if (pos <= 10) return 'bg-telemetry-red/15 text-telemetry-red';
  return 'bg-surface-container text-on-surface-variant';
}
