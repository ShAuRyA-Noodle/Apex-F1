'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

export type StandingsRow = {
  pos: number;
  label: string;
  meta: string;
  points: number;
  wins: number;
  color: string;
  href: string;
};

export function StandingsPreviewTabs({
  driverRows,
  constructorRows,
}: {
  driverRows: StandingsRow[];
  constructorRows: StandingsRow[];
}) {
  const [tab, setTab] = useState<'drivers' | 'teams'>('drivers');
  const rows = tab === 'drivers' ? driverRows : constructorRows;

  return (
    <>
      <div className="mb-6 flex items-center gap-1 border border-outline-variant/60 p-1 w-fit">
        {(['drivers', 'teams'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'bg-telemetry-red px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background'
                : 'px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
            }
          >
            {t === 'drivers' ? 'Drivers' : 'Constructors'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden border border-outline-variant/40"
        >
          <ul className="divide-y divide-outline-variant/30">
            {rows.map((row, i) => (
              <li key={row.href}>
                <Link
                  href={row.href}
                  className="grid grid-cols-[40px_8px_1fr_auto_60px] items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-container-low md:px-6"
                >
                  <span
                    className={
                      i === 0
                        ? 'font-data text-2xl text-telemetry-red'
                        : 'font-data text-xl text-on-surface-variant'
                    }
                  >
                    {String(row.pos).padStart(2, '0')}
                  </span>
                  <span
                    className="block h-7 w-1.5"
                    style={{ backgroundColor: row.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-headline text-base text-on-background md:text-lg">
                      {row.label}
                    </div>
                    <div className="text-xs uppercase tracking-[0.18em] text-outline">
                      {row.meta}
                    </div>
                  </div>
                  <div className="text-data text-sm text-on-surface-variant">
                    {row.wins} <span className="text-outline">WIN</span>
                  </div>
                  <div className="text-right font-data text-2xl text-on-background md:text-3xl">
                    {row.points}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
