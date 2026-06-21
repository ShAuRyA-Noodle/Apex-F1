'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="ml-auto flex items-center gap-1 font-data text-xs text-telemetry-red"
    >
      <span>{days}d</span>
      <span className="text-outline">:</span>
      <span>{String(hours).padStart(2, '0')}h</span>
      <span className="text-outline">:</span>
      <span>{String(mins).padStart(2, '0')}m</span>
      <span className="text-outline">:</span>
      <span>{String(secs).padStart(2, '0')}s</span>
    </motion.div>
  );
}
