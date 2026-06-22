'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Skeleton primitive + per-surface skeleton compositions.
 * Uses `.shimmer` from globals.css (single sweep every 1.6s, not animated gradient).
 * `SkeletonReveal` wraps loaded children to fade in over 240ms once `ready` flips.
 */

export function Skeleton({
  className = '',
  rounded = 'rounded-none',
}: {
  className?: string;
  rounded?: string;
}) {
  return <div className={`shimmer ${rounded} ${className}`} aria-hidden />;
}

/**
 * Wrap your loaded surface in this. When `ready` flips, it cross-fades the loaded children
 * in over 240ms while removing the skeleton.
 */
export function SkeletonReveal({
  ready,
  skeleton,
  children,
}: {
  ready: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  // Defer the unmount of skeleton by one frame so the fade-in is observable
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (ready) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    setMounted(false);
  }, [ready]);

  if (!ready) return <>{skeleton}</>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.24, ease: [0.215, 0.61, 0.355, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
 * Per-surface skeletons (pulsing chips, striped rows, blurred thumbnails)
 * ============================================================ */

export function RaceTickerSkeleton() {
  return (
    <div className="glass-medium relative z-30">
      <div className="apex-container">
        <div className="-mx-4 flex items-stretch gap-3 overflow-hidden px-4 py-3 md:mx-0 md:gap-4 md:px-0 md:py-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`${i === 1 ? 'w-[560px]' : 'w-[280px]'} shrink-0 border border-outline-variant/30 bg-surface-container/30 p-4`}
              style={{ minHeight: '108px' }}
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-3 w-32" />
              <Skeleton className="mt-2 h-6 w-44" />
              {i === 1 && <Skeleton className="mt-3 h-5 w-56" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StandingsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="border border-outline-variant/30 bg-surface-container/30">
      <div className="grid grid-cols-12 items-center gap-4 border-b border-outline-variant/30 px-5 py-3">
        <Skeleton className="col-span-1 h-3 w-6" />
        <Skeleton className="col-span-5 h-3 w-32" />
        <Skeleton className="col-span-4 h-3 w-28" />
        <Skeleton className="col-span-2 h-3 w-12 justify-self-end" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`grid grid-cols-12 items-center gap-4 px-5 py-4 ${
            i % 2 === 0 ? 'bg-surface-container/20' : ''
          }`}
        >
          <Skeleton className="col-span-1 h-4 w-6" />
          <Skeleton className="col-span-5 h-4 w-40" />
          <Skeleton className="col-span-4 h-4 w-32" />
          <Skeleton className="col-span-2 h-4 w-10 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export function VideoRailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="relative aspect-video overflow-hidden border border-outline-variant/30">
            <Skeleton className="h-full w-full" />
            <div
              aria-hidden
              className="absolute inset-0 backdrop-blur-md"
              style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.1), rgba(0,0,0,0.4))' }}
            />
          </div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function NewsRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-outline-variant/30 bg-surface-container/30 p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-4/5" />
          <Skeleton className="mt-6 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function DriverGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-outline-variant/30 bg-surface-container/30 p-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="mt-4 h-3 w-12" />
          <Skeleton className="mt-2 h-5 w-28" />
        </div>
      ))}
    </div>
  );
}
