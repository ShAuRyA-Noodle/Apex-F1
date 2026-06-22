'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export interface TickerItem {
  id: string;
  title: string;
  source: string;
  link: string;
  pubDateMs: number;
}

const SHUFFLE_INTERVAL_MS = 90_000;
const POLL_INTERVAL_MS = 60_000;

/**
 * Slim breaking-news ticker. Renders a single, infinitely scrolling row of
 * headlines under the race ticker. Cycles a different "window" of the feed
 * every SHUFFLE_INTERVAL_MS so even without server data churn the surface
 * never reads as static. Optionally polls `pollUrl` for fresh items; new
 * items animate in with a red flash dot.
 *
 * Implementation note:
 *   The marquee uses a pure CSS keyframe (-100% translateX of a duplicated
 *   item list). Framer is only used for the per-item enter/exit when the
 *   window shuffles · this keeps the main thread quiet between transitions
 *   and inherits prefers-reduced-motion via the @media block in globals.
 */
export function BreakingNewsTicker({
  initialItems,
  pollUrl,
}: {
  initialItems: TickerItem[];
  pollUrl?: string;
}) {
  const [items, setItems] = useState<TickerItem[]>(initialItems);
  const [windowStart, setWindowStart] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const lastIdsRef = useRef<Set<string>>(new Set(initialItems.map((i) => i.id)));

  useEffect(() => {
    if (items.length <= 6) return;
    const id = window.setInterval(() => {
      setWindowStart((s) => (s + 1) % items.length);
    }, SHUFFLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  useEffect(() => {
    if (!pollUrl) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(pollUrl, { cache: 'no-store' });
        if (!r.ok) return;
        const json = (await r.json()) as { items?: TickerItem[] };
        if (cancelled || !json.items) return;
        const fresh = json.items.filter((it) => !lastIdsRef.current.has(it.id));
        if (fresh.length === 0) return;
        for (const f of fresh) lastIdsRef.current.add(f.id);
        setItems((prev) => [...fresh, ...prev].slice(0, 24));
        setFlashing(true);
        window.setTimeout(() => setFlashing(false), 1200);
      } catch {
        /* ignore · network blips should never break the marquee */
      }
    };
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollUrl]);

  if (items.length === 0) return null;

  // Take a 6-headline window so the marquee row stays a sensible length and
  // the shuffle cadence above swaps in fresh headlines on a timer.
  const windowSize = Math.min(6, items.length);
  const view = Array.from({ length: windowSize }, (_, i) => items[(windowStart + i) % items.length]!);

  return (
    <div
      data-shell="breaking-news-ticker"
      className="glass-medium sticky top-[112px] z-20 border-b border-outline-variant/30 md:top-[176px]"
      role="region"
      aria-label="Breaking news ticker"
    >
      <div className="apex-container relative flex items-center gap-3 py-2">
        <div className="flex shrink-0 items-center gap-2">
          <span className="relative inline-flex h-2 w-2">
            <span
              className={
                flashing
                  ? 'absolute inset-0 animate-ping rounded-full bg-telemetry-red opacity-90'
                  : 'absolute inset-0 animate-ping rounded-full bg-telemetry-red opacity-60'
              }
            />
            <span className="relative inline-block h-2 w-2 rounded-full bg-telemetry-red" />
          </span>
          <span className="font-data text-[10.5px] tracking-[0.22em] text-telemetry-red">
            BREAKING
          </span>
        </div>

        <div className="apex-marquee-container relative flex-1 overflow-hidden">
          <ul className="apex-marquee flex shrink-0 items-center gap-10 whitespace-nowrap will-change-transform">
            <AnimatePresence initial={false} mode="popLayout">
              {view.map((it) => (
                <motion.li
                  key={`${windowStart}-${it.id}`}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.34, ease: [0.215, 0.61, 0.355, 1] }}
                  className="inline-flex items-center gap-2"
                >
                  <a
                    href={it.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-data text-[11.5px] tracking-[0.04em] text-on-surface-variant transition-colors hover:text-on-background"
                  >
                    <span className="text-telemetry-red">{it.source.toUpperCase()}</span>
                    <span className="px-2 text-outline">·</span>
                    {it.title}
                  </a>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <ul
            aria-hidden
            className="apex-marquee-clone flex shrink-0 items-center gap-10 whitespace-nowrap will-change-transform"
          >
            {view.map((it) => (
              <li key={`${windowStart}-${it.id}-clone`} className="inline-flex items-center gap-2">
                <span className="font-data text-[11.5px] tracking-[0.04em] text-on-surface-variant">
                  <span className="text-telemetry-red">{it.source.toUpperCase()}</span>
                  <span className="px-2 text-outline">·</span>
                  {it.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
