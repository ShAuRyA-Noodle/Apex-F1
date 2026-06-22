'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface DecadeTabsProps {
  decades: number[];
  defaultDecade?: number;
  onChange: (decade: number) => void;
  teamColor?: string;
}

/**
 * DecadeTabs
 * Horizontal pill tabs with a smooth layoutId indicator that morphs between tabs.
 */
export function DecadeTabs({
  decades,
  defaultDecade,
  onChange,
  teamColor = 'var(--color-telemetry-red)',
}: DecadeTabsProps) {
  const [active, setActive] = useState(defaultDecade ?? decades[decades.length - 1]);

  function pick(d: number) {
    setActive(d);
    onChange(d);
  }

  return (
    <div className="relative inline-flex flex-wrap gap-1 border border-outline-variant/40 bg-surface-container-lowest/70 p-1 backdrop-blur-md">
      {decades.map((d) => {
        const isActive = d === active;
        return (
          <button
            key={d}
            type="button"
            onClick={() => pick(d)}
            className="relative isolate px-5 py-3 font-data text-sm uppercase tracking-[0.2em] transition-colors focus:outline-none"
            aria-pressed={isActive}
          >
            {isActive && (
              <motion.span
                layoutId="decade-indicator"
                className="absolute inset-0 -z-10"
                style={{ backgroundColor: teamColor }}
                transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              />
            )}
            <span className={isActive ? 'text-on-background' : 'text-on-surface-variant'}>
              {d}s
            </span>
          </button>
        );
      })}
    </div>
  );
}
