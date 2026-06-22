'use client';

/**
 * PredictResult
 *
 * Reaction overlay shown when a user's /predict picks are scored against the
 * live race result. Renders a Giphy reaction GIF + score in a glass-medium
 * card, auto-dismisses after 4s, and offers an optional sound toggle that
 * defaults to silent (no autoplay-with-sound across Apex - audio is always
 * opt-in).
 *
 * Data contract:
 *  - `gif` is mapped server-side (UiGif from @apex/api-client/giphy). When
 *    `gif` is undefined the card still renders with just the score, so a
 *    missing GIPHY_API_KEY degrades gracefully.
 *  - `score` / `maxScore` are integers. We render the literal numbers and
 *    a single tier label (BANGER / SOLID / ROUGH) - no synthetic copy
 *    beyond that.
 *
 * Motion:
 *  - The card fades + slides up on mount, then dismisses on a 4s timer.
 *  - Respects `prefers-reduced-motion: reduce` by swapping the animated
 *    `gifUrl` for the `stillUrl` poster JPG.
 *
 * Attribution:
 *  - PoweredByGiphy badge pinned bottom-right. Non-negotiable.
 */

import { useEffect, useRef, useState } from 'react';
import type { UiGif } from '@apex/api-client/giphy';
import { PoweredByGiphy } from './PoweredByGiphy';

export interface PredictResultProps {
  /** Mapped Giphy reaction. Optional - card still renders without it. */
  gif?: UiGif;
  /** Points earned this race (1 + 3 + 5 tiered, max 13 today). */
  score: number;
  /** Max possible score for the race. */
  maxScore: number;
  /** Race headline, e.g. "Monaco Grand Prix". */
  raceName: string;
  /** Auto-dismiss ms. Default 4000. Pass 0 to disable. */
  autoDismissMs?: number;
  /** Fires when the card dismisses (timer or user). */
  onDismiss?: () => void;
}

/**
 * Single-word tier label. Three tiers, no in-betweens - this is a fan
 * surface, not a leaderboard.
 */
function tierForScore(score: number, max: number): 'BANGER' | 'SOLID' | 'ROUGH' {
  if (max <= 0) return 'SOLID';
  const ratio = score / max;
  if (ratio >= 0.6) return 'BANGER';
  if (ratio >= 0.3) return 'SOLID';
  return 'ROUGH';
}

export function PredictResult({
  gif,
  score,
  maxScore,
  raceName,
  autoDismissMs = 4000,
  onDismiss,
}: PredictResultProps) {
  const [open, setOpen] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Detect reduced-motion once on mount. We don't subscribe - a settings
  // change mid-overlay is too edge-case to be worth the listener.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Auto-dismiss timer. Cleared on unmount and on manual close.
  useEffect(() => {
    if (!autoDismissMs || autoDismissMs <= 0) return;
    const t = window.setTimeout(() => {
      setOpen(false);
      onDismiss?.();
    }, autoDismissMs);
    return () => window.clearTimeout(t);
  }, [autoDismissMs, onDismiss]);

  // Sound toggle: pre-create the audio element lazily so we don't pay the
  // network cost when the user never enables sound (the common case).
  useEffect(() => {
    if (!soundOn) {
      audioRef.current?.pause();
      return;
    }
    if (!audioRef.current) {
      const el = new Audio('/sfx/predict-chime.mp3');
      el.preload = 'auto';
      el.volume = 0.6;
      audioRef.current = el;
    }
    void audioRef.current.play().catch(() => {
      // Autoplay blocked or asset missing. Silently revert.
      setSoundOn(false);
    });
  }, [soundOn]);

  if (!open) return null;

  const tier = tierForScore(score, maxScore);
  const tierTone =
    tier === 'BANGER'
      ? 'text-telemetry-red'
      : tier === 'SOLID'
        ? 'text-on-background'
        : 'text-on-surface-variant';

  // Use the still poster JPG for reduced-motion users, animated GIF otherwise.
  const displayUrl = reducedMotion ? (gif?.stillUrl ?? gif?.gifUrl) : gif?.gifUrl;
  const altText = gif?.title ? `Giphy reaction: ${gif.title}` : 'Reaction';

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={`Race result: ${score} of ${maxScore} points`}
      className="fixed inset-x-0 bottom-8 z-[100] mx-auto flex w-full max-w-md justify-center px-4 motion-safe:animate-[fadeUp_320ms_ease-out_forwards]"
    >
      <div className="glass-medium relative w-full overflow-hidden rounded-sm border border-outline-variant/40 shadow-2xl">
        {/* GIF zone */}
        {displayUrl ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-asphalt-gray/60">
            {/* Plain <img> not next/image - Giphy URLs aren't whitelisted in
                next.config.ts, and reaction GIFs are deliberately ephemeral
                so we don't want them passing through the optimizer cache. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt={altText}
              width={gif?.gifWidth || undefined}
              height={gif?.gifHeight || undefined}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <PoweredByGiphy className="absolute bottom-2 right-2" />
          </div>
        ) : (
          // No GIF (missing key, empty Giphy result). Render a flat panel so
          // the score still gets a frame.
          <div className="relative aspect-[16/10] w-full bg-asphalt-gray/60">
            <span className="absolute inset-0 grid place-items-center font-data text-xs uppercase tracking-[0.22em] text-outline">
              SCORED
            </span>
          </div>
        )}

        {/* Score zone */}
        <div className="flex items-center justify-between gap-4 border-t border-outline-variant/30 bg-surface-container-lowest/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-data text-xs text-outline">{raceName.toUpperCase()}</p>
            <p className={`mt-1 font-display text-3xl uppercase tracking-tight ${tierTone}`}>
              {score} <span className="text-on-surface-variant">/ {maxScore}</span>
            </p>
            <p className="mt-0.5 text-data text-[10px] uppercase tracking-[0.22em] text-on-surface-variant">
              {tier}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Mute reaction sound' : 'Play reaction sound'}
              onClick={() => setSoundOn((s) => !s)}
              className="grid h-9 w-9 place-items-center rounded-full border border-outline-variant/60 text-on-surface transition-colors hover:border-telemetry-red"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {soundOn ? 'volume_up' : 'volume_off'}
              </span>
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                setOpen(false);
                onDismiss?.();
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-outline-variant/60 text-on-surface transition-colors hover:border-telemetry-red"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Scoped keyframe. Tailwind v4 utility-arbitrary syntax; inline here
          so the component is self-contained and we don't pollute globals.css
          with a one-off animation. */}
      <style jsx>{`
        @keyframes fadeUp {
          0% {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
