'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';

/**
 * Apple/Framer-grade inertial smooth scroll.
 * Wraps the whole app inside <body>. GSAP ScrollTrigger reads
 * Lenis' scroll events through the proxy registered in useGsap.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    lenisRef.current = lenis;
    // Expose the instance so modal/overlay components can freeze the page
    // scroll behind them (Lenis runs its own loop and ignores body overflow).
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    document.documentElement.classList.add('lenis', 'lenis-smooth');

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      document.documentElement.classList.remove('lenis', 'lenis-smooth');
    };
  }, []);

  return <>{children}</>;
}
