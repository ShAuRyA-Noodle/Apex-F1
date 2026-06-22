'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * RaceTickerCountdown
 *
 * SSR renders a stable placeholder (`--`) so the server HTML never carries a
 * `Date.now()` value · the client mounts, drops the placeholder, and starts
 * ticking. This avoids the React 19 hydration mismatch where the seconds
 * segment rendered on the server (e.g. 35) drifted by the time the browser
 * hydrated (e.g. 34).
 */
export function RaceTickerCountdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const delta = now === null ? null : Math.max(0, new Date(targetIso).getTime() - now);
  const days = delta === null ? null : Math.floor(delta / 86_400_000);
  const hours = delta === null ? null : Math.floor((delta % 86_400_000) / 3_600_000);
  const mins = delta === null ? null : Math.floor((delta % 3_600_000) / 60_000);
  const secs = delta === null ? null : Math.floor((delta % 60_000) / 1000);

  const fmt = (n: number | null, pad: number) =>
    n === null ? '--' : String(n).padStart(pad, '0');

  const Seg = ({ value, label }: { value: string; label: string }) => (
    <span className="flex items-baseline gap-1">
      <span
        className="font-data text-[16px] font-medium text-on-background tabular-nums md:text-[18px]"
        suppressHydrationWarning
      >
        {value}
      </span>
      <span className="font-data text-[9.5px] tracking-[0.18em] text-outline">{label}</span>
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2"
    >
      <span className="font-data text-[10px] tracking-[0.18em] text-telemetry-red">LIGHTS OUT</span>
      <span className="h-3 w-px bg-outline-variant/60" />
      <Seg value={fmt(days, 1)} label="D" />
      <span className="text-outline">:</span>
      <Seg value={fmt(hours, 2)} label="H" />
      <span className="text-outline">:</span>
      <Seg value={fmt(mins, 2)} label="M" />
      <span className="text-outline">:</span>
      <Seg value={fmt(secs, 2)} label="S" />
    </motion.div>
  );
}
