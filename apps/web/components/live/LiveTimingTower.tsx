'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveStream, type LiveTowerRow } from './LiveStreamHook';

const COMPOUND_COLOR: Record<string, string> = {
  SOFT: '#FF3333',
  MEDIUM: '#FFE600',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#00C853',
  WET: '#0091EA',
  UNKNOWN: '#888888',
};

function fmtInterval(v: number | string | undefined): string {
  if (v === undefined || v === null) return '·';
  if (typeof v === 'string') return v;
  if (v === 0) return 'LAP';
  return `+${v.toFixed(3)}`;
}

export interface InitialDriver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name?: string;
  team_colour?: string;
}

export interface InitialRow {
  driver: InitialDriver;
  pos?: number;
  gap?: number | string;
  interval?: number | string;
  compound?: string;
  stintLap?: number;
}

/**
 * Live timing tower with SSE-driven row-flash on position swap.
 *
 * Server pre-renders the initial snapshot (no flicker), client subscribes to
 * /api/live/stream's `tower` channel, merges each frame, and stamps any
 * driver whose position changed with `data-flash="up" | "down"`. CSS handles
 * the visual · a 1.4s telemetry-red wash on the row.
 */
export function LiveTimingTower({ initialRows }: { initialRows: InitialRow[] }) {
  const { tower } = useLiveStream();

  // Mutable map keyed by driver_number. Seeded from server snapshot, mutated
  // by SSE frames as they arrive. Using a Map (state) lets us merge updates
  // without throwing away the cosmetic fields (name, compound) the server
  // already gave us.
  const [rows, setRows] = useState<Map<number, InitialRow>>(() => {
    const m = new Map<number, InitialRow>();
    for (const r of initialRows) m.set(r.driver.driver_number, r);
    return m;
  });

  const prevPosRef = useRef<Map<number, number>>(new Map());
  const [flash, setFlash] = useState<Map<number, 'up' | 'down'>>(new Map());
  const clearTimers = useRef<Map<number, number>>(new Map());

  // Seed prevPos on first render from initial server rows so the first SSE
  // frame can compute a real delta instead of treating every driver as new.
  useEffect(() => {
    const m = new Map<number, number>();
    for (const r of initialRows) if (r.pos !== undefined) m.set(r.driver.driver_number, r.pos);
    prevPosRef.current = m;
  }, [initialRows]);

  useEffect(() => {
    if (!tower) return;
    const nextFlash = new Map<number, 'up' | 'down'>();
    setRows((prev) => {
      const next = new Map(prev);
      for (const t of tower.rows as LiveTowerRow[]) {
        const cur = next.get(t.driver);
        const prevPos = prevPosRef.current.get(t.driver);
        if (prevPos !== undefined && prevPos !== t.pos) {
          nextFlash.set(t.driver, t.pos < prevPos ? 'up' : 'down');
        }
        prevPosRef.current.set(t.driver, t.pos);
        if (cur) {
          next.set(t.driver, { ...cur, pos: t.pos, gap: t.gap, interval: t.interval });
        }
      }
      return next;
    });
    if (nextFlash.size === 0) return;
    setFlash((prev) => {
      const merged = new Map(prev);
      nextFlash.forEach((v, k) => merged.set(k, v));
      return merged;
    });
    // Schedule clear per-driver so back-to-back swaps re-arm the flash.
    nextFlash.forEach((_, drv) => {
      const existing = clearTimers.current.get(drv);
      if (existing) window.clearTimeout(existing);
      const id = window.setTimeout(() => {
        setFlash((prev) => {
          if (!prev.has(drv)) return prev;
          const next = new Map(prev);
          next.delete(drv);
          return next;
        });
        clearTimers.current.delete(drv);
      }, 1400);
      clearTimers.current.set(drv, id);
    });
  }, [tower]);

  useEffect(() => {
    // Clean up any pending clear timers on unmount so we never call setFlash
    // after the component is gone (React warning + memory leak).
    const timers = clearTimers.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

  const sorted = useMemo(
    () => Array.from(rows.values()).sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99)),
    [rows]
  );

  if (sorted.length === 0) {
    return (
      <p className="py-20 text-center font-editorial text-xl text-on-surface-variant">
        OpenF1 returned no driver snapshot yet. Live stream is connecting.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead className="border-b border-outline-variant/40 text-data">
        <tr>
          <th className="px-2 py-3 text-on-surface-variant">POS</th>
          <th className="px-2 py-3 text-on-surface-variant">#</th>
          <th className="px-2 py-3 text-on-surface-variant">DRIVER</th>
          <th className="hidden px-2 py-3 text-on-surface-variant md:table-cell">TEAM</th>
          <th className="px-2 py-3 text-right text-on-surface-variant">GAP</th>
          <th className="px-2 py-3 text-right text-on-surface-variant">INT</th>
          <th className="hidden px-2 py-3 text-on-surface-variant md:table-cell">TYRE</th>
          <th className="hidden px-2 py-3 text-right text-on-surface-variant md:table-cell">
            STINT
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/30">
        {sorted.map(({ driver: d, pos, gap, interval, compound, stintLap }) => {
          const comp = compound ?? 'UNKNOWN';
          const dot = COMPOUND_COLOR[comp] ?? '#888';
          const f = flash.get(d.driver_number);
          return (
            <tr
              key={d.driver_number}
              data-flash={f ?? undefined}
              className="tower-row transition-colors hover:bg-surface-container-low"
            >
              <td className="px-2 py-3 font-data text-lg text-on-background tabular-nums">
                {pos ?? '·'}
              </td>
              <td className="px-2 py-3 font-data text-on-surface-variant tabular-nums">
                {d.driver_number}
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="block h-6 w-1.5"
                    style={{ backgroundColor: `#${d.team_colour ?? '888888'}` }}
                  />
                  <div>
                    <div className="font-headline text-on-background">
                      {d.name_acronym} {d.full_name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden px-2 py-3 text-on-surface-variant md:table-cell">
                {d.team_name}
              </td>
              <td className="px-2 py-3 text-right font-data text-on-surface-variant tabular-nums">
                {fmtInterval(gap)}
              </td>
              <td className="px-2 py-3 text-right font-data text-on-surface-variant tabular-nums">
                {fmtInterval(interval)}
              </td>
              <td className="hidden px-2 py-3 md:table-cell">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="block h-3 w-3 rounded-full"
                    style={{ backgroundColor: dot }}
                  />
                  <span className="text-data text-outline">{comp}</span>
                </div>
              </td>
              <td className="hidden px-2 py-3 text-right font-data text-on-surface-variant tabular-nums md:table-cell">
                L{stintLap ?? '·'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
