'use client';

import { animate, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface CountUpBadgeProps {
  value: number;
  /** ms, default 1400 */
  duration?: number;
  /** prefix string, e.g. '#' or '$' */
  prefix?: string;
  /** suffix string, e.g. ' m' or '%' */
  suffix?: string;
  /** decimal places, default 0 */
  decimals?: number;
  /** start delay ms */
  delay?: number;
  /** override className (typography + color) */
  className?: string;
  /** force a starting value other than 0 */
  from?: number;
  /** locale group thousands separator */
  group?: boolean;
}

/**
 * CountUpBadge
 * Premium number animator. Triggers once when scrolled into view.
 * Uses Framer Motion's `animate` for hardware accelerated, ease-cinematic ramp.
 */
export function CountUpBadge({
  value,
  duration = 1400,
  prefix = '',
  suffix = '',
  decimals = 0,
  delay = 0,
  className,
  from = 0,
  group = false,
}: CountUpBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' });
  const [display, setDisplay] = useState<string>(format(from, decimals, group));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from, value, {
      duration: duration / 1000,
      delay: delay / 1000,
      ease: [0.215, 0.61, 0.355, 1],
      onUpdate: (latest) => setDisplay(format(latest, decimals, group)),
    });
    return () => controls.stop();
  }, [inView, value, duration, delay, decimals, group, from]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums', display: 'inline-block' }}
    >
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function format(n: number, decimals: number, group: boolean): string {
  const fixed = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
  if (!group) return fixed;
  const [int, dec] = fixed.split('.');
  const grouped = (int ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${grouped}.${dec}` : grouped;
}
