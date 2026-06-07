'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { driverStandings2026, teamStandings2026 } from '@/lib/fixtures/standings';

type Tab = 'drivers' | 'teams';

export function StandingsPreview() {
  const [tab, setTab] = useState<Tab>('drivers');
  const rows = tab === 'drivers' ? driverStandings2026 : teamStandings2026;

  return (
    <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-data text-telemetry-red">2026 STANDINGS</h2>
            <p className="mt-2 font-editorial text-3xl text-on-background md:text-4xl">
              The championship, today
            </p>
          </div>
          <div className="flex items-center gap-1 border border-outline-variant/60 p-1">
            {(['drivers', 'teams'] as Tab[]).map((t) => (
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
              {rows.map((row, i) => {
                const isDriver = 'driver' in row;
                const label = isDriver
                  ? `${row.driver.firstName} ${row.driver.lastName}`
                  : row.team.name;
                const meta = isDriver ? row.driver.code : row.team.fullName;
                const color = isDriver ? row.driver.teamColor : row.team.colorHex;
                return (
                  <li
                    key={row.slug}
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
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-headline text-base text-on-background md:text-lg">
                        {label}
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-outline">
                        {meta}
                      </div>
                    </div>
                    <div className="text-data text-sm text-on-surface-variant">
                      {row.wins} <span className="text-outline">WIN</span>
                    </div>
                    <div className="text-right font-data text-2xl text-on-background md:text-3xl">
                      {row.points}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-outline-variant/40 bg-surface-container-low p-4 text-center md:p-5">
              <Link
                href={tab === 'drivers' ? '/results/2026/drivers' : '/results/2026/teams'}
                className="inline-flex items-center gap-2 text-data text-on-surface transition-colors hover:text-telemetry-red"
              >
                FULL {tab === 'drivers' ? 'DRIVER' : 'CONSTRUCTOR'} STANDINGS
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
