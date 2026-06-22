'use client';

import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

interface MagneticButtonProps {
  href: string;
  /** Strength of the magnetic pull, 0..1 (default 0.25). */
  strength?: number;
  /** Children render inside the button. */
  children: React.ReactNode;
  /** Optional extra classes. */
  className?: string;
  /** Background color (defaults to telemetry-red token). */
  bg?: string;
}

/**
 * MagneticButton
 * Cursor-following primary CTA. Hardware accelerated; respects reduced motion.
 */
export function MagneticButton({
  href,
  strength = 0.25,
  children,
  className = '',
  bg,
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const sx = useSpring(x, { stiffness: 240, damping: 22, mass: 0.7 });
  const sy = useSpring(y, { stiffness: 240, damping: 22, mass: 0.7 });

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    if (reduce) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div style={{ x: sx, y: sy }} className="inline-block">
      <Link
        href={href}
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        onBlur={reset}
        className={`group relative inline-flex items-center gap-4 overflow-hidden px-8 py-5 font-headline text-base uppercase tracking-[0.22em] text-on-background transition-shadow duration-500 hover:shadow-[0_30px_120px_-30px_rgba(225,6,0,0.7)] ${className}`}
        style={{ backgroundColor: bg ?? 'var(--color-telemetry-red)' }}
      >
        {/* sheen sweep on hover */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-cinematic group-hover:translate-x-full"
        />
        <span className="relative">{children}</span>
        <span
          aria-hidden="true"
          className="material-symbols-outlined relative text-[22px] transition-transform duration-500 group-hover:translate-x-2"
        >
          arrow_forward
        </span>
      </Link>
    </motion.div>
  );
}
