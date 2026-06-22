'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface ParallaxHeroProps {
  /** Background image URL — Wikidata Commons portrait, team livery, etc. */
  imageUrl?: string;
  /** Image positioning (defaults to center top). */
  objectPosition?: string;
  /** A solid color used when no image is supplied or behind it. */
  baseColor?: string;
  /** Height tier — `xl` = 100vh, `lg` = 80vh, `md` = 60vh. */
  height?: 'xl' | 'lg' | 'md';
  /** Children rendered above the image inside the safe area. */
  children: React.ReactNode;
  /** Optional accent color used for a top-left radial telemetry glow. */
  accent?: string;
  /** Optional right-edge full-height team color stripe. */
  rightStripeColor?: string;
}

const HEIGHT_CLASS: Record<NonNullable<ParallaxHeroProps['height']>, string> = {
  xl: 'min-h-[100svh]',
  lg: 'min-h-[80svh]',
  md: 'min-h-[60svh]',
};

/**
 * ParallaxHero
 * Full-bleed cinematic hero. Background image scrolls at 0.3 speed.
 * Adds a bottom vignette and a top-left telemetry radial.
 * Optional right-edge full-height team color stripe (8px).
 */
export function ParallaxHero({
  imageUrl,
  objectPosition = 'center 20%',
  baseColor = '#0e0e0e',
  height = 'xl',
  children,
  accent = '#e10600',
  rightStripeColor,
}: ParallaxHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  // Parallax: image moves at 0.3x the scroll, scale slightly up so edges never reveal.
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '30%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, reduce ? 1.08 : 1.18]);
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.7, 0.25]);

  return (
    <section
      ref={ref}
      className={`relative isolate w-full overflow-hidden ${HEIGHT_CLASS[height]}`}
      style={{ backgroundColor: baseColor }}
    >
      {/* Parallax image layer */}
      {imageUrl && (
        <motion.div
          className="absolute inset-0 -z-10"
          style={{ y, scale, opacity, willChange: 'transform' }}
          aria-hidden="true"
        >
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition }}
            loading="eager"
            decoding="async"
          />
        </motion.div>
      )}

      {/* Top-left telemetry radial */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(ellipse 900px 600px at 12% 8%, ${accent}26, transparent 65%)`,
        }}
      />

      {/* Carbon vignette bottom + left fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, transparent 35%, rgba(14,14,14,0.55) 70%, #0e0e0e 100%), linear-gradient(90deg, rgba(14,14,14,0.85) 0%, rgba(14,14,14,0.25) 35%, transparent 65%)',
        }}
      />

      {/* Right-edge team color stripe (8px) */}
      {rightStripeColor && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-2"
          style={{ backgroundColor: rightStripeColor }}
        />
      )}

      {/* Children — slot inside hero. We deliberately do NOT constrain padding here;
         every page composes its own layout grid inside. */}
      <div className="relative z-0 flex h-full min-h-inherit w-full flex-col">
        {children}
      </div>
    </section>
  );
}
