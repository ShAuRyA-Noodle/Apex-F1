'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ApexMonogram } from './ApexMonogram';

/**
 * TopUtilityBar v2
 * - 32px slim glass-medium
 * - Apex monogram + INDEPENDENT FORMULA 1 PLATFORM lockup
 * - Utility links + auth, right side
 * - Hides on scroll-down past 100vh, reappears on scroll-up
 * - Hidden by default on mobile; reachable from the mega nav 3-dot menu
 */
const utilityLinks = [
  { label: 'Newsletter', href: '/newsletter' },
  { label: 'Archive', href: '/results/archive' },
  { label: 'Apex+', href: '/membership', highlight: true },
  { label: 'Search', href: '/search' },
];

const authLinks = [
  { label: 'Sign in', href: '/account' },
  { label: 'Create', href: '/account?signup=1' },
];

export function TopUtilityBar() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const past = y > (typeof window !== 'undefined' ? window.innerHeight : 800);
    const goingDown = y > lastY.current;
    setHidden(past && goingDown);
    lastY.current = y;
  });

  return (
    <motion.div
      data-shell="top-utility"
      initial={false}
      animate={{ y: hidden ? -40 : 0 }}
      transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
      className="glass-medium sticky top-0 z-50 hidden h-8 w-full md:block"
      aria-label="Site utility bar"
    >
      <div className="apex-container flex h-full items-center justify-between">
        {/* Left lockup */}
        <Link href="/" className="group flex items-center gap-2.5">
          <ApexMonogram size={16} />
          <span className="font-data text-[11px] tracking-[0.20em] text-on-surface-variant transition-colors group-hover:text-on-background">
            INDEPENDENT FORMULA 1 PLATFORM
          </span>
        </Link>

        {/* Right utility */}
        <nav aria-label="Utility" className="flex items-center gap-5">
          <ul className="flex items-center gap-5">
            {utilityLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={
                    l.highlight
                      ? 'font-data text-[11px] tracking-[0.16em] text-telemetry-red transition-colors hover:text-on-background'
                      : 'font-data text-[11px] tracking-[0.16em] text-on-surface-variant transition-colors hover:text-on-background'
                  }
                >
                  {l.label.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
          <span className="h-3 w-px bg-outline-variant/60" aria-hidden />
          <ul className="flex items-center gap-3">
            {authLinks.map((l, i) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={
                    i === 1
                      ? 'inline-flex h-5 items-center bg-on-background px-2 font-data text-[10.5px] tracking-[0.14em] text-background transition-opacity hover:opacity-90'
                      : 'font-data text-[11px] tracking-[0.16em] text-on-surface-variant transition-colors hover:text-on-background'
                  }
                >
                  {l.label.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </motion.div>
  );
}

/** Status dot used inside TopUtilityBar and Footer (live uptime indicator). */
export function LiveStatusDot({ label = 'LIVE' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-block h-1.5 w-1.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-telemetry-red opacity-75" />
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-telemetry-red" />
      </span>
      <span className="font-data text-[10px] tracking-[0.18em] text-on-surface-variant">{label}</span>
    </span>
  );
}
