'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * RaceTickerCountdown
 * Used inside the NEXT chip in RaceTickerBar.
 * Segmented JetBrains Mono display, telemetry-red ticks for separators.
 */
export function RaceTickerCountdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const delta = Math.max(0, new Date(targetIso).getTime() - now);
  const days = Math.floor(delta / 86_400_000);
  const hours = Math.floor((delta % 86_400_000) / 3_600_000);
  const mins = Math.floor((delta % 3_600_000) / 60_000);
  const secs = Math.floor((delta % 60_000) / 1000);

  const Seg = ({ value, label }: { value: string; label: string }) => (
    <span className="flex items-baseline gap-1">
      <span className="font-data text-[16px] font-medium text-on-background tabular-nums md:text-[18px]">
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
      <Seg value={String(days)} label="D" />
      <span className="text-outline">:</span>
      <Seg value={String(hours).padStart(2, '0')} label="H" />
      <span className="text-outline">:</span>
      <Seg value={String(mins).padStart(2, '0')} label="M" />
      <span className="text-outline">:</span>
      <Seg value={String(secs).padStart(2, '0')} label="S" />
    </motion.div>
  );
}
