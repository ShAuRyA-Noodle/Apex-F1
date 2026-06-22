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
  /**
   * Optional alt text for the background image. Defaults to '' so it stays
   * decorative for screen readers when supplying a non-essential bg.
   */
  alt?: string;
  /**
   * Optional Unsplash attribution. When provided we render the mandated
   * "Photo by NAME on Unsplash" link bottom-right of the hero. Required
   * by Unsplash API guidelines whenever the image came from their API.
   *
   *   Spec: https://help.unsplash.com/en/articles/2511315
   */
  attribution?: {
    name: string;
    profileUrl: string;
  };
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
 *
 * When `attribution` is supplied, renders the Unsplash-required
 * "Photo by NAME on Unsplash" credit pinned bottom-right.
 */
export function ParallaxHero({
  imageUrl,
  objectPosition = 'center 20%',
  baseColor = '#0e0e0e',
  height = 'xl',
  children,
  accent = '#e10600',
  rightStripeColor,
  alt = '',
  attribution,
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
          aria-hidden={alt === ''}
        >
          <img
            src={imageUrl}
            alt={alt}
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

      {/* Unsplash attribution — license-required when source is Unsplash.
         Glass-subtle text bottom-right, never blocks interaction above it. */}
      {attribution && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 md:bottom-4 md:right-4">
          <div className="pointer-events-auto rounded-sm bg-black/40 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm md:text-[11px]">
            Photo by{' '}
            <a
              href={attribution.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/95 underline-offset-2 transition-colors hover:text-telemetry-red hover:underline"
            >
              {attribution.name}
            </a>{' '}
            on{' '}
            <a
              href="https://unsplash.com/?utm_source=apex&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/95 underline-offset-2 transition-colors hover:text-telemetry-red hover:underline"
            >
              Unsplash
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
