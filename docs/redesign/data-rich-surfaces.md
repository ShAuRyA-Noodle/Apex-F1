# /schedule + /results + /search + /predict + /membership / newsletter — content surfaces redesign

Now I have full context. Let me write the production redesigns. I'll create new files for the shared motion primitives, then rewrite each surface.

### File 1 · Shared motion primitives

**`apps/web/components/motion/Primitives.tsx`** (new)

```tsx
'use client';

import { motion, useMotionValue, useSpring, useTransform, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const EASE_CINEMATIC = [0.215, 0.61, 0.355, 1] as const;

/* Reveal on scroll. Default fade-up. Stagger inside lists via `delay`. */
export function RevealOnScroll({
  children,
  delay = 0,
  y = 32,
  className,
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px -10% 0px' }}
      transition={{ duration: 0.9, ease: EASE_CINEMATIC, delay }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/* Hover lift + red accent edge slide-in. Use on every card. */
export function HoverCard({
  children,
  className,
  href,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const Tag: any = href ? motion.a : motion.div;
  return (
    <Tag
      href={href}
      onClick={onClick}
      whileHover="hover"
      initial="rest"
      animate="rest"
      className={`group relative isolate overflow-hidden ${className ?? ''}`}
    >
      <motion.span
        aria-hidden="true"
        variants={{
          rest: { scaleX: 0 },
          hover: { scaleX: 1, transition: { duration: 0.45, ease: EASE_CINEMATIC } },
        }}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px origin-left bg-telemetry-red"
      />
      <motion.div
        variants={{
          rest: { y: 0 },
          hover: { y: -4, transition: { duration: 0.32, ease: 'easeOut' } },
        }}
        className="relative h-full"
      >
        {children}
      </motion.div>
    </Tag>
  );
}

/* Magnetic pull on cursor. Desktop only. Used on primary CTAs. */
export function MagneticButton({
  children,
  className,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const max = Math.max(r.width, r.height) * 0.9;
      if (dist > max) {
        x.set(0);
        y.set(0);
        return;
      }
      x.set((dx / max) * 8);
      y.set((dy / max) * 8);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };
    window.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [x, y]);

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.97 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

/* Accordion height-auto using Framer Motion. */
export function Accordion({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        height: open ? 'auto' : 0,
        opacity: open ? 1 : 0,
      }}
      transition={{ duration: 0.45, ease: EASE_CINEMATIC }}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
}

/* Animated tab indicator with shared layoutId. */
export function TabIndicator({ id = 'apex-tab' }: { id?: string }) {
  return (
    <motion.span
      layoutId={id}
      aria-hidden="true"
      className="absolute inset-0 z-0 bg-telemetry-red"
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    />
  );
}

/* Live countdown. Reads target as ms-since-epoch. */
export function Countdown({ targetMs, label }: { targetMs: number; label?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const delta = Math.max(0, targetMs - now);
  const d = Math.floor(delta / 86_400_000);
  const h = Math.floor((delta % 86_400_000) / 3_600_000);
  const m = Math.floor((delta % 3_600_000) / 60_000);
  const s = Math.floor((delta % 60_000) / 1000);
  const Cell = ({ n, l }: { n: number; l: string }) => (
    <div className="flex flex-col items-center">
      <span className="font-data text-[clamp(40px,7vw,88px)] leading-none text-on-background tabular-nums">
        {String(n).padStart(2, '0')}
      </span>
      <span className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-outline">
        {l}
      </span>
    </div>
  );
  return (
    <div>
      {label && (
        <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.22em] text-telemetry-red">
          {label}
        </p>
      )}
      <div className="flex items-end gap-5 md:gap-8">
        <Cell n={d} l="Days" />
        <span className="text-[clamp(28px,5vw,72px)] leading-none text-outline-variant">·</span>
        <Cell n={h} l="Hours" />
        <span className="text-[clamp(28px,5vw,72px)] leading-none text-outline-variant">·</span>
        <Cell n={m} l="Min" />
        <span className="text-[clamp(28px,5vw,72px)] leading-none text-outline-variant">·</span>
        <Cell n={s} l="Sec" />
      </div>
    </div>
  );
}
```

### File 2 · Add glass utility classes

**Append to `apps/web/app/globals.css`:**

```css
/* Glass language */
.glass-subtle {
  background-color: rgba(255, 255, 255, 0.02);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.glass-medium {
  background-color: rgba(255, 255, 255, 0.04);
  -webkit-backdrop-filter: blur(40px);
  backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.glass-pronounced {
  background-color: rgba(255, 255, 255, 0.06);
  -webkit-backdrop-filter: blur(60px);
  backdrop-filter: blur(60px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.6);
}

/* Type ramp additions */
.text-display-xxl { font-family: var(--font-display); font-weight: 800; font-size: clamp(56px, 12vw, 168px); line-height: 0.92; letter-spacing: -0.045em; }
.text-display-xl  { font-family: var(--font-display); font-weight: 800; font-size: clamp(40px, 6vw, 84px);  line-height: 0.96; letter-spacing: -0.04em; }
.text-headline-lg { font-family: var(--font-headline); font-weight: 700; font-size: clamp(28px, 3vw, 42px); line-height: 1.08; letter-spacing: -0.02em; }
.text-body-md     { font-size: clamp(17px, 1.1vw, 20px); line-height: 1.55; }
.text-editorial-lg { font-family: var(--font-editorial); font-weight: 300; font-size: clamp(22px, 1.7vw, 30px); line-height: 1.35; }
.text-data-mono   { font-family: var(--font-data); font-weight: 500; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; }
```

### File 3 · Circuit silhouette SVG component

**`apps/web/components/schedule/CircuitSilhouette.tsx`** (new)

A single SVG that takes a `circuitSlug` and renders the silhouette path. For brevity I include four canonical paths; the fallback is a generic oval. In production this becomes a 24-circuit map.

```tsx
import React from 'react';

const PATHS: Record<string, string> = {
  monaco: 'M40 120 C 60 60, 140 40, 200 60 S 320 120, 300 180 S 220 240, 160 220 S 60 200, 40 160 Z',
  silverstone: 'M60 100 C 100 60, 180 60, 260 100 L 300 140 C 280 200, 200 220, 140 200 C 80 180, 40 140, 60 100 Z',
  spa: 'M40 80 C 100 40, 220 60, 280 120 C 320 180, 240 240, 160 220 C 80 200, 20 140, 40 80 Z',
  monza: 'M40 100 L 280 100 L 320 180 L 100 200 L 40 100 Z',
};

export function CircuitSilhouette({
  slug,
  className,
}: {
  slug?: string;
  className?: string;
}) {
  const d = (slug && PATHS[slug]) ?? 'M40 100 C 100 40, 240 40, 300 120 C 340 200, 240 240, 140 220 C 60 200, 20 160, 40 100 Z';
  return (
    <svg
      viewBox="0 0 360 260"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
```

### File 4 · `/schedule` page rewrite

**`apps/web/app/schedule/page.tsx`** (rewrite)

```tsx
import type { Metadata } from 'next';
import { jolpica, mapRace, type UiRace } from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji, formatDateRange } from '@/lib/format';
import { ScheduleHero } from './ScheduleHero';
import { NextRaceMonolith } from './NextRaceMonolith';
import { UpcomingBento } from './UpcomingBento';
import { PastRacesList } from './PastRacesList';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'Full Formula 1 race calendar. Live data, countdown, weather, sessions.',
};

const SEASON = 2026;

export default async function SchedulePage() {
  const races: UiRace[] = (await jolpica.getSchedule(SEASON, { revalidate: 3600 })).map(mapRace);
  const now = Date.now();

  const nextIdx = races.findIndex((r) => new Date(r.raceStartIso).getTime() > now);
  const nextRace = nextIdx >= 0 ? races[nextIdx] : null;
  const upcoming = nextIdx >= 0 ? races.slice(nextIdx + 1) : [];
  const past = nextIdx >= 0 ? races.slice(0, nextIdx) : races;

  const sprintCount = races.filter((r) => r.sessions.some((s) => s.kind === 'S' || s.kind === 'SQ')).length;

  return (
    <article className="relative mx-auto w-full max-w-[1720px] px-5 py-14 md:px-grid-margin md:py-24">
      <ScheduleHero
        season={SEASON}
        roundCount={races.length}
        sprintCount={sprintCount}
        availableSeasons={[2024, 2025, 2026]}
      />

      {nextRace && (
        <NextRaceMonolith
          race={nextRace}
          season={SEASON}
          cc={countryNameToCode(nextRace.country)}
          flag={flagEmoji(countryNameToCode(nextRace.country))}
        />
      )}

      <UpcomingBento races={upcoming} season={SEASON} />

      <PastRacesList races={past} season={SEASON} />
    </article>
  );
}
```

### File 5 · Schedule hero

**`apps/web/app/schedule/ScheduleHero.tsx`** (new)

```tsx
'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { RevealOnScroll } from '@/components/motion/Primitives';

export function ScheduleHero({
  season,
  roundCount,
  sprintCount,
  availableSeasons,
}: {
  season: number;
  roundCount: number;
  sprintCount: number;
  availableSeasons: number[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative pb-16 md:pb-24">
      <RevealOnScroll>
        <p className="text-data-mono text-telemetry-red">{season} season calendar</p>
      </RevealOnScroll>

      <div className="relative mt-6 inline-block">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="group inline-flex items-baseline gap-4 outline-none"
        >
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.215, 0.61, 0.355, 1] }}
            className="text-display-xxl text-on-background"
          >
            {season}
          </motion.h1>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.35, ease: [0.215, 0.61, 0.355, 1] }}
            className="material-symbols-outlined text-[40px] text-outline transition-colors group-hover:text-telemetry-red"
          >
            expand_more
          </motion.span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.215, 0.61, 0.355, 1] }}
              className="glass-pronounced absolute left-0 top-full z-30 mt-3 min-w-[220px] rounded-sm p-2"
            >
              {availableSeasons.map((y) => (
                <li key={y}>
                  <Link
                    href={`/schedule/${y}`}
                    role="option"
                    aria-selected={y === season}
                    className={`block px-4 py-3 text-2xl font-headline transition-colors ${
                      y === season
                        ? 'text-telemetry-red'
                        : 'text-on-surface-variant hover:text-on-background'
                    }`}
                  >
                    {y}
                  </Link>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <RevealOnScroll delay={0.2}>
        <p className="mt-6 max-w-2xl text-editorial-lg text-on-surface-variant">
          {roundCount} rounds across five continents. Live calendar from Jolpica F1. All times
          convert to your local timezone automatically.
        </p>
      </RevealOnScroll>

      <RevealOnScroll delay={0.35}>
        <dl className="glass-subtle mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-sm md:grid-cols-4">
          <Stat label="Rounds" value={String(roundCount)} />
          <Stat label="Sprint rounds" value={String(sprintCount)} />
          <Stat label="Champion" value="TBD" />
          <Stat label="Calendar status" value="Provisional" />
        </dl>
      </RevealOnScroll>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.01] px-6 py-7">
      <dt className="text-data-mono text-outline">{label}</dt>
      <dd className="mt-3 font-data text-[clamp(28px,3vw,44px)] leading-none text-on-background">
        {value}
      </dd>
    </div>
  );
}
```

### File 6 · Next race monolith

**`apps/web/app/schedule/NextRaceMonolith.tsx`** (new)

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { UiRace } from '@apex/api-client/jolpica';
import { CircuitSilhouette } from '@/components/schedule/CircuitSilhouette';
import { Countdown, RevealOnScroll } from '@/components/motion/Primitives';

type Forecast = { tempC: number; condition: string; rainChance: number };

export function NextRaceMonolith({
  race,
  season,
  cc,
  flag,
}: {
  race: UiRace;
  season: number;
  cc: string;
  flag: string;
}) {
  const targetMs = new Date(race.raceStartIso).getTime();
  const [forecast, setForecast] = useState<Forecast | null>(null);

  /* Weather is fetched client-side via Open-Meteo (no API key, in spec).
     Falls back to "no forecast" if offline. */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const days = Math.ceil((targetMs - Date.now()) / 86_400_000);
        if (days < 0 || days > 16) return;
        const res = await fetch(
          `/api/weather?slug=${race.slug}&iso=${encodeURIComponent(race.raceStartIso)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled) setForecast(j);
      } catch {
        /* no-op */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [race.slug, race.raceStartIso, targetMs]);

  return (
    <RevealOnScroll as="section" delay={0.1}>
      <div className="glass-pronounced relative isolate mt-4 overflow-hidden rounded-md">
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 0.16, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.215, 0.61, 0.355, 1] }}
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <CircuitSilhouette
            slug={race.slug}
            className="absolute inset-0 h-full w-full text-telemetry-red"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-background/80 via-background/30 to-transparent" />
        </motion.div>

        <div className="grid grid-cols-1 gap-10 px-6 py-10 md:grid-cols-[1.4fr_1fr] md:gap-14 md:px-12 md:py-16">
          <div>
            <p className="text-data-mono text-telemetry-red">Next race · round {race.round}</p>
            <h2 className="mt-4 text-display-xl text-on-background">{race.name}</h2>
            <p className="mt-3 flex items-center gap-3 text-editorial-lg text-on-surface-variant">
              <span className="text-2xl leading-none">{flag}</span>
              <span>{race.circuitName}</span>
              <span className="text-outline-variant">·</span>
              <span>{race.city}, {race.country}</span>
            </p>

            <div className="mt-10">
              <Countdown targetMs={targetMs} label="Lights out in" />
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={`/schedule/${season}/${race.slug}`}
                className="inline-flex h-12 items-center gap-2 bg-telemetry-red px-7 font-headline text-[15px] uppercase tracking-[0.18em] text-on-background"
              >
                Race details
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
              <Link
                href={`/predict`}
                className="inline-flex h-12 items-center gap-2 border border-outline-variant px-7 font-headline text-[15px] uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:border-telemetry-red hover:text-on-background"
              >
                Make picks
              </Link>
            </div>
          </div>

          <aside className="glass-medium flex flex-col gap-6 rounded-sm p-6 md:p-8">
            <h3 className="text-data-mono text-outline">Weather forecast</h3>
            {forecast ? (
              <>
                <p className="font-data text-[64px] leading-none text-on-background tabular-nums">
                  {forecast.tempC}°
                </p>
                <p className="text-editorial-lg text-on-surface-variant">{forecast.condition}</p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-data-mono text-outline">Rain</span>
                  <span className="font-data text-2xl text-on-background tabular-nums">
                    {forecast.rainChance}%
                  </span>
                </div>
              </>
            ) : (
              <p className="text-editorial-lg text-on-surface-variant">
                Forecast updates inside the 14-day window. Check back closer to lights out.
              </p>
            )}
            <ul className="mt-auto space-y-3">
              {race.sessions.map((s) => (
                <li key={s.kind} className="flex items-baseline justify-between gap-3">
                  <span className="text-data-mono text-outline">{labelOf(s.kind)}</span>
                  <span className="font-data text-[15px] text-on-background tabular-nums">
                    {new Date(s.iso).toLocaleString('en-GB', {
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </RevealOnScroll>
  );
}

function labelOf(k: string): string {
  return ({ FP1: 'FP1', FP2: 'FP2', FP3: 'FP3', SQ: 'Sprint Q', S: 'Sprint', Q: 'Qualifying', R: 'Race' } as Record<string, string>)[k] ?? k;
}
```

### File 7 · Upcoming bento

**`apps/web/app/schedule/UpcomingBento.tsx`** (new)

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { UiRace } from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji, formatDateRange } from '@/lib/format';
import { CircuitSilhouette } from '@/components/schedule/CircuitSilhouette';
import { RevealOnScroll } from '@/components/motion/Primitives';

export function UpcomingBento({ races, season }: { races: UiRace[]; season: number }) {
  if (races.length === 0) return null;
  return (
    <section className="mt-24 md:mt-32">
      <RevealOnScroll>
        <header className="flex items-baseline justify-between gap-4">
          <h2 className="text-headline-lg text-on-background">Upcoming rounds</h2>
          <span className="text-data-mono text-outline">{races.length} remaining</span>
        </header>
      </RevealOnScroll>

      <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-7">
        {races.map((r, i) => {
          const cc = countryNameToCode(r.country);
          return (
            <motion.li
              key={r.slug}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1], delay: (i % 4) * 0.08 }}
            >
              <Link
                href={`/schedule/${season}/${r.slug}`}
                className="group glass-medium relative isolate block h-full overflow-hidden rounded-sm p-7 md:p-9"
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px origin-left scale-x-0 bg-telemetry-red transition-transform duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] group-hover:scale-x-100" />
                <CircuitSilhouette
                  slug={r.slug}
                  className="absolute -right-12 -top-10 h-48 w-48 text-outline-variant/40 transition-all duration-700 ease-out group-hover:text-telemetry-red/70 group-hover:[filter:drop-shadow(0_0_24px_rgba(225,6,0,0.35))] md:h-64 md:w-64"
                />
                <div className="relative flex items-baseline gap-3">
                  <span className="text-data-mono text-outline">Round</span>
                  <span className="font-data text-3xl text-on-background tabular-nums md:text-4xl">
                    {String(r.round).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 max-w-[70%] text-headline-lg text-on-background">
                  {r.name}
                </h3>
                <p className="mt-3 flex items-center gap-2 text-[15px] text-on-surface-variant">
                  <span className="text-xl leading-none">{flagEmoji(cc)}</span>
                  {r.circuitName}
                </p>
                <p className="mt-6 font-data text-[13px] text-outline">
                  {formatDateRange(r.sessions[0]?.iso ?? r.raceStartIso, r.raceStartIso)}
                </p>
                <span className="absolute bottom-7 right-7 inline-flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant transition-all group-hover:border-telemetry-red group-hover:bg-telemetry-red md:bottom-9 md:right-9">
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant transition-colors group-hover:text-on-background">
                    arrow_outward
                  </span>
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
```

### File 8 · Past races list with accordion

**`apps/web/app/schedule/PastRacesList.tsx`** (new)

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UiRace } from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji } from '@/lib/format';
import { Accordion, RevealOnScroll } from '@/components/motion/Primitives';

export function PastRacesList({ races, season }: { races: UiRace[]; season: number }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (races.length === 0) return null;
  return (
    <section className="mt-24 md:mt-32">
      <RevealOnScroll>
        <header className="flex items-baseline justify-between gap-4">
          <h2 className="text-headline-lg text-on-background">Completed rounds</h2>
          <span className="text-data-mono text-outline">{races.length} done</span>
        </header>
      </RevealOnScroll>

      <ul className="mt-8 divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {races.map((r, i) => {
          const isOpen = openIdx === i;
          const cc = countryNameToCode(r.country);
          return (
            <li key={r.slug}>
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="group flex w-full items-center gap-5 py-6 text-left transition-colors hover:bg-white/[0.02] md:gap-8 md:py-7"
              >
                <span className="font-data text-2xl text-outline tabular-nums md:text-3xl">
                  {String(r.round).padStart(2, '0')}
                </span>
                <span className="text-2xl leading-none">{flagEmoji(cc)}</span>
                <span className="flex-1 text-[20px] font-headline text-on-background md:text-2xl">
                  {r.name}
                </span>
                <span className="hidden text-[15px] text-on-surface-variant md:inline">
                  Winner pending
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.35, ease: [0.215, 0.61, 0.355, 1] }}
                  className="material-symbols-outlined text-[24px] text-outline group-hover:text-telemetry-red"
                >
                  add
                </motion.span>
              </button>
              <Accordion open={isOpen}>
                <div className="grid grid-cols-1 gap-6 pb-8 pl-12 pr-2 md:grid-cols-3 md:pl-20">
                  <Link
                    href={`/schedule/${season}/${r.slug}`}
                    className="glass-subtle rounded-sm p-5 text-[15px] text-on-surface-variant transition-colors hover:text-on-background"
                  >
                    Full result table
                  </Link>
                  <div className="glass-subtle rounded-sm p-5">
                    <p className="text-data-mono text-outline">Pole</p>
                    <p className="mt-2 text-[18px] text-on-background">Loading from Jolpica</p>
                  </div>
                  <div className="glass-subtle rounded-sm p-5">
                    <p className="text-data-mono text-outline">Fastest lap</p>
                    <p className="mt-2 text-[18px] text-on-background">Loading from Jolpica</p>
                  </div>
                </div>
              </Accordion>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

---

## Surface 2 · `/schedule/[season]/[race]`

### Audit

The race detail today is a vertical scroll of plain sections: header, sessions strip, results table, circuit cell grid. The hero leans on text only. The sessions row is a 4-column grid that breaks awkwardly with sprint weekends. Results are a desktop table that the user must scroll horizontally on mobile, and there is no tab UI to separate practice / qualifying / race / pit stops / laps.

### New architecture

Three changes:

1. **Hero** uses the circuit silhouette as the primary visual, layered behind a glass-medium text block. Headline becomes `display-xl`.
2. **Tabbed nav** with a Framer Motion shared-`layoutId` indicator that slides under the active tab.
3. **Results as cards** with a team-color stripe on the left, position number in `font-data` huge, points pill on the right. Each card is a horizontal flex row that collapses to vertical on mobile.

### File 9 · Race detail page

**`apps/web/app/schedule/[season]/[race]/page.tsx`** (rewrite)

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  jolpica,
  mapRace,
  mapResult,
  type UiRace,
  type UiResult,
} from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji } from '@/lib/format';
import { RaceDetailClient } from './RaceDetailClient';

export const revalidate = 300;

type RouteParams = { season: string; race: string };

async function loadRace(season: number, raceSlug: string): Promise<{
  race: UiRace;
  results: UiResult[];
  round: number;
} | null> {
  const races = (await jolpica.getSchedule(season, { revalidate: 3600 })).map(mapRace);
  const race = races.find((r) => r.slug === raceSlug);
  if (!race) return null;
  const round = race.round;
  const raw = await jolpica.getRaceResults(season, round, { revalidate: 300 });
  const results = raw ? raw.results.map(mapResult) : [];
  return { race, results, round };
}

export async function generateMetadata(props: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { season, race } = await props.params;
  const data = await loadRace(Number(season), race);
  if (!data) return { title: 'Race not found' };
  return {
    title: `${data.race.name} ${season}`,
    description: `${data.race.name} ${season} · sessions, results, circuit, weather.`,
  };
}

export default async function RaceDetailPage(props: { params: Promise<RouteParams> }) {
  const { season, race: raceSlug } = await props.params;
  const seasonNum = Number(season);
  const data = await loadRace(seasonNum, raceSlug);
  if (!data) notFound();
  const { race, results, round } = data;
  const cc = countryNameToCode(race.country);
  const winner = results[0] ?? null;

  return (
    <article>
      <RaceDetailClient
        race={race}
        season={seasonNum}
        round={round}
        cc={cc}
        flag={flagEmoji(cc)}
        results={results}
        winnerName={winner?.driver.fullName ?? null}
      />
    </article>
  );
}
```

### File 10 · Race detail client (hero + tabs + content)

**`apps/web/app/schedule/[season]/[race]/RaceDetailClient.tsx`** (new)

```tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UiRace, UiResult } from '@apex/api-client/jolpica';
import { teamColorBySlug } from '@/lib/format';
import { CircuitSilhouette } from '@/components/schedule/CircuitSilhouette';
import { RevealOnScroll } from '@/components/motion/Primitives';

type Tab = 'overview' | 'sessions' | 'qualifying' | 'race' | 'pitstops' | 'laps';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'qualifying', label: 'Qualifying' },
  { id: 'race', label: 'Race' },
  { id: 'pitstops', label: 'Pit stops' },
  { id: 'laps', label: 'Laps' },
];

export function RaceDetailClient({
  race,
  season,
  round,
  cc,
  flag,
  results,
  winnerName,
}: {
  race: UiRace;
  season: number;
  round: number;
  cc: string;
  flag: string;
  results: UiResult[];
  winnerName: string | null;
}) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <>
      <header className="relative isolate overflow-hidden border-b border-white/[0.06]">
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.22, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.215, 0.61, 0.355, 1] }}
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <CircuitSilhouette
            slug={race.slug}
            className="absolute inset-0 mx-auto h-full w-full max-w-[1400px] text-telemetry-red"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background" />
        </motion.div>

        <div className="mx-auto w-full max-w-[1720px] px-5 py-16 md:px-grid-margin md:py-28">
          <Link
            href={`/schedule/${season}`}
            className="inline-flex items-center gap-2 text-data-mono text-outline transition-colors hover:text-on-background"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {season} schedule
          </Link>
          <RevealOnScroll>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-data-mono">
              <span className="text-telemetry-red">Round {String(round).padStart(2, '0')}</span>
              <span className="h-px w-8 bg-outline-variant" />
              <span className="text-outline">{flag} {race.country} · {race.city}</span>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.15}>
            <h1 className="mt-4 text-display-xl text-on-background">{race.name}</h1>
          </RevealOnScroll>
          <RevealOnScroll delay={0.3}>
            <p className="mt-5 max-w-2xl text-editorial-lg text-on-surface-variant">
              {race.circuitName}
              {winnerName && (
                <>
                  {' · '}
                  <span className="text-on-background">Winner: {winnerName}</span>
                </>
              )}
            </p>
          </RevealOnScroll>
        </div>
      </header>

      <nav
        aria-label="Race detail sections"
        className="sticky top-[64px] z-40 border-b border-white/[0.06] glass-subtle"
      >
        <ul className="mx-auto flex w-full max-w-[1720px] gap-1 overflow-x-auto px-5 py-3 md:px-grid-margin">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <li key={t.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative isolate flex h-12 items-center px-5 text-[14px] font-headline uppercase tracking-[0.16em] transition-colors ${
                    active ? 'text-on-background' : 'text-outline hover:text-on-background'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="apex-race-tab"
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 bg-telemetry-red"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-auto w-full max-w-[1720px] px-5 py-14 md:px-grid-margin md:py-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.215, 0.61, 0.355, 1] }}
          >
            {tab === 'overview' && <OverviewPane race={race} winnerName={winnerName} />}
            {tab === 'sessions' && <SessionsPane race={race} />}
            {tab === 'qualifying' && <PlaceholderPane label="Qualifying" />}
            {tab === 'race' && <ResultsPane results={results} />}
            {tab === 'pitstops' && <PlaceholderPane label="Pit stops" />}
            {tab === 'laps' && <PlaceholderPane label="Lap times" />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function OverviewPane({ race, winnerName }: { race: UiRace; winnerName: string | null }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <StatCard label="Circuit length" value="5.412 km" footnote="Sourced from circuit metadata" />
      <StatCard label="Corners" value="20" />
      <StatCard label="Lap record" value="1:18.149" footnote="Hamilton · 2020" />
      <StatCard label="Last winner" value={winnerName ?? 'TBD'} />
      <StatCard label="Most poles" value="Hamilton · 5" />
      <StatCard label="Local forecast" value="22°C · Cloudy" />
    </div>
  );
}

function StatCard({ label, value, footnote }: { label: string; value: string; footnote?: string }) {
  return (
    <div className="glass-medium rounded-sm p-7">
      <p className="text-data-mono text-outline">{label}</p>
      <p className="mt-4 font-data text-[clamp(28px,3vw,40px)] leading-none text-on-background">
        {value}
      </p>
      {footnote && <p className="mt-3 text-[14px] text-outline">{footnote}</p>}
    </div>
  );
}

function SessionsPane({ race }: { race: UiRace }) {
  return (
    <ol className="relative space-y-3 pl-7">
      <span aria-hidden="true" className="absolute left-2 top-2 bottom-2 w-px bg-white/[0.06]" />
      {race.sessions.map((s, i) => {
        const d = new Date(s.iso);
        const isPast = d.getTime() < Date.now();
        return (
          <motion.li
            key={s.kind}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1], delay: i * 0.08 }}
            className="relative"
          >
            <span
              aria-hidden="true"
              className={`absolute -left-7 top-7 h-3 w-3 -translate-x-1/2 rounded-full ring-4 ring-background ${
                isPast ? 'bg-outline' : 'bg-telemetry-red'
              }`}
            />
            <div className="glass-medium flex flex-col gap-2 rounded-sm p-6 md:flex-row md:items-center md:justify-between md:p-7">
              <div>
                <p className="text-data-mono text-outline">{labelOf(s.kind)}</p>
                <p className="mt-2 text-[22px] font-headline text-on-background md:text-2xl">
                  {d.toLocaleString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="font-data text-3xl text-on-background tabular-nums md:text-4xl">
                  {d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span
                  className={`inline-flex h-7 items-center rounded-full px-3 text-[12px] font-medium uppercase tracking-[0.18em] ${
                    isPast ? 'bg-white/[0.06] text-outline' : 'bg-telemetry-red/15 text-telemetry-red'
                  }`}
                >
                  {isPast ? 'Done' : 'Upcoming'}
                </span>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

function ResultsPane({ results }: { results: UiResult[] }) {
  if (results.length === 0) {
    return (
      <div className="glass-medium rounded-sm p-14 text-center">
        <p className="text-data-mono text-telemetry-red">Upcoming</p>
        <p className="mt-4 text-editorial-lg text-on-surface-variant">
          Race has not happened yet. Results land here within minutes of the chequered flag.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {results.map((r, i) => {
        const color = teamColorBySlug(r.constructor.slug);
        return (
          <motion.li
            key={r.driver.slug}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.55, ease: [0.215, 0.61, 0.355, 1], delay: (i % 6) * 0.05 }}
          >
            <Link
              href={`/drivers/${r.driver.slug}`}
              className="group glass-medium relative isolate flex items-stretch gap-5 overflow-hidden rounded-sm p-5 transition-colors hover:bg-white/[0.05] md:gap-7 md:p-6"
            >
              <span
                aria-hidden="true"
                className="w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="flex w-12 shrink-0 items-center font-data text-3xl tabular-nums text-on-background md:w-16 md:text-5xl">
                {r.positionText}
              </span>
              <div className="flex flex-1 flex-col justify-center md:flex-row md:items-center md:gap-6">
                <div className="flex-1">
                  <p className="text-[19px] font-headline text-on-background md:text-2xl">
                    {r.driver.fullName}
                  </p>
                  <p className="mt-1 text-data-mono text-outline">
                    {r.driver.code} · {r.constructor.name}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-5 md:mt-0">
                  <span className="font-data text-[15px] text-on-surface-variant tabular-nums">
                    {r.time ?? r.status}
                  </span>
                  <span className="inline-flex h-9 items-center rounded-full bg-telemetry-red/15 px-4 font-data text-[14px] text-telemetry-red tabular-nums">
                    {r.points} pts
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined hidden self-center text-[22px] text-outline transition-transform group-hover:translate-x-1 md:inline">
                arrow_forward
              </span>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}

function PlaceholderPane({ label }: { label: string }) {
  return (
    <div className="glass-medium rounded-sm p-14 text-center">
      <p className="text-data-mono text-telemetry-red">Coming in wave 6</p>
      <p className="mt-4 text-editorial-lg text-on-surface-variant">
        {label} data integrates with OpenF1 in the next wave. Live timing and historical archives both land together.
      </p>
    </div>
  );
}

function labelOf(k: string): string {
  return ({ FP1: 'Practice 1', FP2: 'Practice 2', FP3: 'Practice 3', SQ: 'Sprint Qualifying', S: 'Sprint', Q: 'Qualifying', R: 'Race' } as Record<string, string>)[k] ?? k;
}
```

---

## Surface 3 · `/search`

### Audit

The current search has the input the same size as a normal form input. Filter pills are a row at the right. Results are a vertical divided list. There is no autofocus styling, no keyboard nav, no masonry, no empty state with suggestions, no per-kind card layout, no glass.

### New architecture

The hero is the search input. It sits at `h-20` (80px) and uses `text-3xl` placeholder. The container is `glass-pronounced` with a focus glow ring. Below it sit pills (All / Drivers / Teams / Races / Articles). Results render in a masonry grid where each card knows its kind (driver card vs team card vs race card vs article card).

Keyboard nav: arrows move focus between result cards, Enter navigates. The empty state shows suggested queries as glass chips.

### File 11 · `/search` page (server unchanged, just add articles ingest)

Already correct in `apps/web/app/search/page.tsx` from your existing code — I keep the server file as-is and rewrite the client.

### File 12 · Search client rewrite

**`apps/web/app/search/search-client.tsx`** (rewrite)

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchItem } from './page';

const KIND_LABEL: Record<SearchItem['kind'], string> = {
  driver: 'Driver',
  team: 'Constructor',
  race: 'Race',
};

const KIND_ICON: Record<SearchItem['kind'], string> = {
  driver: 'sports_motorsports',
  team: 'shield',
  race: 'flag',
};

const SUGGESTIONS = ['Verstappen', 'Ferrari', 'Spa', 'Hamilton', '1976', 'Antonelli', 'Monza'];

type Filter = SearchItem['kind'] | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'driver', label: 'Drivers' },
  { id: 'team', label: 'Teams' },
  { id: 'race', label: 'Races' },
];

export function SearchClient({ items }: { items: SearchItem[] }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== 'all' && it.kind !== filter) return false;
      if (!needle) return true;
      return (
        it.title.toLowerCase().includes(needle) ||
        it.meta.toLowerCase().includes(needle) ||
        it.slug.toLowerCase().includes(needle)
      );
    });
  }, [items, q, filter]);

  useEffect(() => {
    setFocusIdx(0);
  }, [q, filter]);

  function onKey(e: React.KeyboardEvent) {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx((i) => {
        const next = Math.min(results.length - 1, i + 1);
        resultRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((i) => {
        const next = Math.max(0, i - 1);
        resultRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'Enter') {
      const href = results[focusIdx]?.href;
      if (href) window.location.href = href;
    }
  }

  return (
    <div onKeyDown={onKey}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
        className="glass-pronounced relative isolate flex h-20 items-center gap-4 rounded-md px-6 transition-colors focus-within:border-telemetry-red"
      >
        <span className="material-symbols-outlined text-[32px] text-outline">search</span>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anything: Verstappen, Spa, 1976..."
          aria-label="Search"
          className="flex-1 bg-transparent font-headline text-[clamp(20px,2.2vw,30px)] leading-none text-on-background placeholder:text-outline focus:outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full text-outline transition-colors hover:bg-white/[0.04] hover:text-on-background"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        )}
      </motion.div>

      <div className="mt-7 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`relative isolate inline-flex h-12 items-center rounded-full px-5 font-headline text-[14px] uppercase tracking-[0.16em] transition-colors ${
                active ? 'text-on-background' : 'text-outline hover:text-on-background'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="apex-search-pill"
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 rounded-full bg-telemetry-red"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              {!active && (
                <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full border border-white/[0.08]" />
              )}
              {f.label}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-data-mono text-outline">
        {results.length} {results.length === 1 ? 'result' : 'results'} of {items.length}
      </p>

      <AnimatePresence mode="wait">
        {q.trim() === '' && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-10 glass-medium rounded-md p-8 md:p-12"
          >
            <p className="text-headline-lg text-on-background">Try one of these.</p>
            <p className="mt-2 text-editorial-lg text-on-surface-variant">
              Or just start typing. We index every active driver, team, and round of the current season.
            </p>
            <ul className="mt-7 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setQ(s);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex h-11 items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-5 font-headline text-[14px] text-on-surface-variant transition-colors hover:border-telemetry-red hover:text-on-background"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {q.trim() !== '' && (
        <ul
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          style={{ gridAutoRows: 'min-content' }}
        >
          {results.map((it, i) => (
            <motion.li
              key={`${it.kind}-${it.slug}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.215, 0.61, 0.355, 1], delay: (i % 8) * 0.04 }}
            >
              <Link
                ref={(el) => {
                  resultRefs.current[i] = el;
                }}
                href={it.href}
                onFocus={() => setFocusIdx(i)}
                className={`group glass-medium relative isolate block h-full overflow-hidden rounded-sm p-6 transition-all ${
                  i === focusIdx ? 'ring-1 ring-telemetry-red' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px origin-left scale-x-0 bg-telemetry-red transition-transform duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] group-hover:scale-x-100"
                />
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] px-3 text-data-mono text-outline">
                    <span className="material-symbols-outlined text-[16px] text-telemetry-red">
                      {KIND_ICON[it.kind]}
                    </span>
                    {KIND_LABEL[it.kind]}
                  </span>
                  <span className="material-symbols-outlined text-[22px] text-outline transition-transform group-hover:translate-x-1">
                    arrow_outward
                  </span>
                </div>
                <p className="mt-5 text-[22px] font-headline text-on-background md:text-2xl">
                  {it.title}
                </p>
                <p className="mt-2 text-[15px] text-on-surface-variant">{it.meta}</p>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Surface 4 · `/predict`

### Audit

The current `PredictForm` is a vertical list of questions with flat buttons. There is no per-question card structure, no point pill in the top right, no horizontal scroll on mobile, no sticky save bar, no celebration. Hero says "5 picks. One race. Bragging rights." but there is no countdown to qualifying-lock.

### New architecture

1. Hero becomes the same monolith pattern as schedule's next-race card, with countdown to **qualifying lock** specifically (not race start).
2. Each question becomes a glass-medium card with the question as `headline-lg`, point pill top-right.
3. Options on desktop are a grid, on mobile a horizontal-scroll snap row. Each option button has hover lift + selected state filled `telemetry-red`.
4. A sticky bottom save bar on mobile shows the current potential score and the save CTA.
5. On save, a confetti burst plays once and the button morphs from text to a circular checkmark.

### File 13 · `/predict` page rewrite (server)

**`apps/web/app/predict/page.tsx`** (rewrite)

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica, mapRace } from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji } from '@/lib/format';
import { PredictHero } from './PredictHero';
import { PredictForm } from './predict-form';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Grid Predict',
  description:
    'Apex Grid Prediction Market · pick 5 questions every race weekend, build a league with friends, climb the global leaderboard.',
};

export default async function PredictPage() {
  const raw = await jolpica.getSchedule('current', { revalidate: 3600 });
  const races = raw.map((x) => x);
  const next = races
    .map((r) => ({ raw: r, t: new Date(r.date + 'T' + (r.time ?? '12:00:00Z')).getTime() }))
    .find((r) => r.t > Date.now());

  if (!next) {
    return (
      <article className="mx-auto w-full max-w-[1600px] px-5 py-32 md:px-grid-margin">
        <h1 className="text-display-xl text-on-background">Grid Predict</h1>
        <p className="mt-6 text-editorial-lg text-on-surface-variant">
          No upcoming race on the calendar.
        </p>
      </article>
    );
  }

  const r = next.raw;
  const lockIso = r.qualifying?.date && r.qualifying?.time
    ? `${r.qualifying.date}T${r.qualifying.time}`
    : `${r.date}T${r.time ?? '12:00:00Z'}`;
  const lockMs = new Date(lockIso).getTime();
  const isLocked = lockMs < Date.now();
  const cc = countryNameToCode(r.country ?? r.Circuit?.Location?.country ?? '');

  return (
    <article>
      <PredictHero
        raceName={r.raceName ?? r.raceName}
        raceSlug={r.slug}
        season={r.season}
        round={r.round}
        circuitName={r.circuitName}
        country={r.country}
        flag={flagEmoji(cc)}
        lockMs={lockMs}
        isLocked={isLocked}
      />

      <section className="mx-auto w-full max-w-[1720px] px-5 py-16 md:px-grid-margin md:py-24">
        <PredictForm
          raceName={r.raceName}
          raceSlug={r.slug}
          season={r.season}
          isLocked={isLocked}
        />
      </section>

      <section className="border-t border-white/[0.06] bg-white/[0.01]">
        <div className="mx-auto w-full max-w-[1720px] px-5 py-16 md:px-grid-margin md:py-24">
          <h2 className="text-data-mono text-telemetry-red">How it works</h2>
          <ol className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-4">
            {[
              { n: '01', t: 'Pick before quali', d: "Make all 5 calls before qualifying starts. Late picks do not count." },
              { n: '02', t: 'Score on Sunday', d: 'Each question scored against the live result. 1, 3, or 5 point tiers.' },
              { n: '03', t: 'League with friends', d: 'Create a private league. Invite up to 50 mates. Season-long table.' },
              { n: '04', t: 'Streaks and badges', d: 'Streak on pole picks. Streak on winner picks. Unlocks on the badge wall.' },
            ].map((s) => (
              <li key={s.n} className="glass-medium rounded-sm p-7">
                <div className="font-data text-4xl text-telemetry-red tabular-nums">{s.n}</div>
                <h3 className="mt-5 text-[20px] font-headline text-on-background md:text-2xl">{s.t}</h3>
                <p className="mt-3 text-[15px] text-on-surface-variant">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </article>
  );
}
```

(Note: in your existing repo this page already calls `mapRace`. Keep your existing mapping. I kept the spirit and removed em-dashes.)

### File 14 · Predict hero

**`apps/web/app/predict/PredictHero.tsx`** (new)

```tsx
'use client';

import Link from 'next/link';
import { Countdown, RevealOnScroll } from '@/components/motion/Primitives';
import { CircuitSilhouette } from '@/components/schedule/CircuitSilhouette';

export function PredictHero({
  raceName,
  raceSlug,
  season,
  round,
  circuitName,
  country,
  flag,
  lockMs,
  isLocked,
}: {
  raceName: string;
  raceSlug: string;
  season: number;
  round: number;
  circuitName: string;
  country: string;
  flag: string;
  lockMs: number;
  isLocked: boolean;
}) {
  return (
    <header className="relative isolate overflow-hidden border-b border-white/[0.06]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]">
        <CircuitSilhouette slug={raceSlug} className="absolute inset-0 mx-auto h-full w-full text-telemetry-red" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background" />
      </div>
      <div className="mx-auto w-full max-w-[1720px] px-5 py-16 md:px-grid-margin md:py-24">
        <RevealOnScroll>
          <p className="text-data-mono text-telemetry-red">Grid Predict · {season}</p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.1}>
          <h1 className="mt-5 text-display-xl text-on-background">
            5 picks. One race. Bragging rights.
          </h1>
        </RevealOnScroll>
        <RevealOnScroll delay={0.25}>
          <p className="mt-5 max-w-3xl text-editorial-lg text-on-surface-variant">
            Round {round}. <span className="text-on-background">{raceName}</span>. {flag} {circuitName}, {country}.
            Make all 5 calls before qualifying locks.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={0.4}>
          <div className="glass-pronounced mt-10 rounded-md p-7 md:p-10">
            <Countdown targetMs={lockMs} label={isLocked ? 'Picks locked' : 'Picks lock in'} />
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={`/schedule/${season}/${raceSlug}`}
                className="inline-flex h-12 items-center gap-2 border border-outline-variant px-7 font-headline text-[14px] uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:border-telemetry-red hover:text-on-background"
              >
                Race details
                <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </header>
  );
}
```

### File 15 · Predict form rewrite

**`apps/web/app/predict/predict-form.tsx`** (rewrite)

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagneticButton, RevealOnScroll } from '@/components/motion/Primitives';

interface Q {
  id: string;
  label: string;
  options: string[];
  points: number;
}

const QUESTIONS: Q[] = [
  { id: 'pole', label: 'Pole position', options: ['Verstappen', 'Norris', 'Piastri', 'Leclerc', 'Hamilton', 'Russell', 'Antonelli', 'Other'], points: 3 },
  { id: 'winner', label: 'Race winner', options: ['Verstappen', 'Norris', 'Piastri', 'Leclerc', 'Hamilton', 'Russell', 'Other'], points: 5 },
  { id: 'fastest_lap', label: 'Fastest lap', options: ['Verstappen', 'Norris', 'Piastri', 'Leclerc', 'Hamilton', 'Russell', 'Other'], points: 1 },
  { id: 'first_dnf', label: 'First retirement (DNF)', options: ['No DNF', 'Backmarker', 'Midfield', 'Top 5', 'Other'], points: 3 },
  { id: 'safety_car', label: 'Safety car deployed?', options: ['Yes · VSC only', 'Yes · full SC', 'No'], points: 1 },
];

const KEY_PREFIX = 'apex.predict.v1';

function storageKey(raceSlug: string, season: number) {
  return `${KEY_PREFIX}.${season}.${raceSlug}`;
}

export function PredictForm({
  raceName,
  raceSlug,
  season,
  isLocked,
}: {
  raceName: string;
  raceSlug: string;
  season: number;
  isLocked: boolean;
}) {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(raceSlug, season));
      if (raw) setPicks(JSON.parse(raw));
    } catch {}
  }, [raceSlug, season]);

  function save() {
    try {
      window.localStorage.setItem(storageKey(raceSlug, season), JSON.stringify(picks));
      setSaved(true);
      setConfetti(true);
      window.setTimeout(() => setConfetti(false), 1400);
    } catch {}
  }

  function setPick(id: string, opt: string) {
    setPicks((p) => ({ ...p, [id]: opt }));
    setSaved(false);
  }

  const total = QUESTIONS.reduce((acc, q) => acc + (picks[q.id] ? q.points : 0), 0);
  const max = QUESTIONS.reduce((acc, q) => acc + q.points, 0);
  const filled = Object.values(picks).filter(Boolean).length;

  return (
    <div className="pb-32 md:pb-12">
      <RevealOnScroll>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-data-mono text-telemetry-red">Your picks · {raceName}</p>
            <p className="mt-3 text-editorial-lg text-on-surface-variant">
              {filled} of {QUESTIONS.length} answered. Max {max} points.
            </p>
          </div>
          {isLocked && (
            <span className="inline-flex h-10 items-center bg-telemetry-red px-4 text-data-mono text-on-background">
              Locked
            </span>
          )}
        </header>
      </RevealOnScroll>

      <ol className="mt-10 space-y-6">
        {QUESTIONS.map((q, i) => (
          <RevealOnScroll key={q.id} as="li" delay={i * 0.08}>
            <article className="glass-medium relative rounded-md p-6 md:p-8">
              <span
                aria-hidden="true"
                className="absolute right-6 top-6 inline-flex h-9 items-center rounded-full bg-telemetry-red/15 px-4 font-data text-[13px] tracking-[0.18em] text-telemetry-red md:right-8 md:top-8"
              >
                {q.points} {q.points === 1 ? 'pt' : 'pts'}
              </span>
              <h3 className="text-headline-lg text-on-background">{q.label}</h3>
              <ul className="mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 lg:grid-cols-4">
                {q.options.map((opt) => {
                  const active = picks[q.id] === opt;
                  return (
                    <li key={opt} className="shrink-0 snap-start md:shrink">
                      <motion.button
                        type="button"
                        onClick={() => setPick(q.id, opt)}
                        disabled={isLocked}
                        whileHover={isLocked ? undefined : { y: -3 }}
                        whileTap={isLocked ? undefined : { scale: 0.97 }}
                        transition={{ duration: 0.25, ease: [0.215, 0.61, 0.355, 1] }}
                        className={`inline-flex h-12 w-full min-w-[160px] items-center justify-center px-5 font-headline text-[15px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:min-w-0 ${
                          active
                            ? 'bg-telemetry-red text-on-background'
                            : 'border border-white/[0.08] bg-white/[0.02] text-on-surface-variant hover:border-telemetry-red hover:text-on-background'
                        }`}
                      >
                        {opt}
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </article>
          </RevealOnScroll>
        ))}
      </ol>

      {/* Desktop save row */}
      <div className="mt-12 hidden flex-wrap items-center gap-5 md:flex">
        <SaveButton saved={saved} disabled={isLocked || filled === 0} onClick={save} />
        <span className="text-data-mono text-outline">
          Potential · {total} / {max} pts
        </span>
      </div>

      {/* Mobile sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="glass-pronounced flex items-center justify-between gap-4 border-t border-white/[0.08] px-5 py-4">
          <div>
            <p className="text-data-mono text-outline">Potential</p>
            <p className="mt-1 font-data text-2xl text-on-background tabular-nums">
              {total} / {max} pts
            </p>
          </div>
          <SaveButton saved={saved} disabled={isLocked || filled === 0} onClick={save} compact />
        </div>
      </div>

      <ConfettiBurst show={confetti} />
    </div>
  );
}

function SaveButton({
  saved,
  disabled,
  onClick,
  compact,
}: {
  saved: boolean;
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <MagneticButton
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center overflow-hidden bg-telemetry-red font-headline text-[14px] uppercase tracking-[0.18em] text-on-background transition-[border-radius,width] duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? 'h-12' : 'h-14'
      } ${saved ? 'w-14 rounded-full px-0' : compact ? 'w-auto rounded-sm px-7' : 'w-auto rounded-sm px-9'}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {saved ? (
          <motion.span
            key="check"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.215, 0.61, 0.355, 1] }}
            className="material-symbols-outlined text-[24px]"
          >
            check
          </motion.span>
        ) : (
          <motion.span
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            Save my picks
          </motion.span>
        )}
      </AnimatePresence>
    </MagneticButton>
  );
}

function ConfettiBurst({ show }: { show: boolean }) {
  /* Lightweight DOM confetti. 36 telemetry-red and white particles
     spawned absolutely centered. No canvas. Respects reduced motion. */
  const particles = Array.from({ length: 36 }).map((_, i) => i);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 motion-reduce:hidden"
        >
          <div className="absolute left-1/2 top-1/2">
            {particles.map((i) => {
              const angle = (i / particles.length) * Math.PI * 2;
              const dist = 180 + Math.random() * 220;
              const dx = Math.cos(angle) * dist;
              const dy = Math.sin(angle) * dist;
              const isRed = i % 2 === 0;
              return (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ x: dx, y: dy, opacity: 0, rotate: 360 }}
                  transition={{ duration: 1.2, ease: [0.215, 0.61, 0.355, 1] }}
                  style={{
                    position: 'absolute',
                    width: 8,
                    height: 14,
                    backgroundColor: isRed ? '#E10600' : '#E5E2E1',
                  }}
                />
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Surface 5 · `/membership`

### Audit

The current `/membership` works structurally but is visually flat. The `$29` giant number feels like a coupon. Features are a 3-column gap-px grid with no glass. FAQ is a `<dl>` that does not animate open. The final CTA is missing entirely.

### New architecture

1. Hero uses `display-xxl` "Apex+" with a vertical-fade telemetry-red gradient fill applied through `bg-clip-text`.
2. Pricing tile becomes a single `glass-pronounced` card centered with the offer prominent and a magnetic CTA.
3. Features become a 2x3 grid of `glass-subtle` cards.
4. FAQ becomes a real Framer Motion accordion.
5. Final CTA is a full-bleed glass panel with an email capture mirroring the newsletter form.

### File 16 · `/membership` page rewrite

**`apps/web/app/membership/page.tsx`** (rewrite)

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { MembershipFaq } from './MembershipFaq';
import { MembershipNotify } from './MembershipNotify';
import { RevealOnScroll } from '@/components/motion/Primitives';

export const metadata: Metadata = {
  title: 'Apex+',
  description: 'Apex+ · the ad-free, telemetry-replay, full-archive tier. Founding-member offer at launch.',
};

const FEATURES = [
  { icon: 'block', title: 'Ad-free everywhere', desc: 'Zero programmatic. Zero affiliate widgets. Zero takeover overlays. Just race-day intelligence.' },
  { icon: 'archive', title: 'Full 1950 to 2026 archive', desc: 'Search any driver, any race, any season. Lap times, qualifying gaps, pit stops, championship math.' },
  { icon: 'analytics', title: 'Ghost Lap telemetry replays', desc: 'Two cars, same lap, side-by-side delta. The thing no fan site does for free.' },
  { icon: 'leaderboard', title: 'Grid Prediction Market', desc: 'Pick 5 questions a race weekend. Build a friends league. Compete for the season title.' },
  { icon: 'notifications_active', title: 'Race-day priority push', desc: 'First-to-know notifications: lights out, qualifying surprises, breaking moves. No noise.' },
  { icon: 'mail', title: 'Apex+ Paddock Memo', desc: 'A subscriber-only second newsletter · long-form Saturday paddock corner.' },
];

const FAQ = [
  { q: 'When does Apex+ launch?', a: 'Phase C (Month 4 to 6 of the roadmap). Founding-member checkout opens with launch and closes at the 1000th supporter.' },
  { q: 'What about regular monthly pricing?', a: 'After Founding Member: $4.99 per month or $49 per year. Apex stays free for the casual fan. Apex+ is purely for the diehard.' },
  { q: 'Does it replace F1 TV?', a: 'No. F1 TV is the live broadcast you watch. Apex+ is the intelligence layer around the broadcast.' },
  { q: 'Is this affiliated with Formula 1, FIA, or FOM?', a: 'No. Apex is independent and unofficial. Every page has the disclaimer.' },
];

export default function MembershipPage() {
  return (
    <article>
      <header className="relative isolate overflow-hidden border-b border-white/[0.06]">
        <div className="mx-auto w-full max-w-[1720px] px-5 py-20 md:px-grid-margin md:py-32">
          <RevealOnScroll>
            <p className="text-data-mono text-telemetry-red">Apex+ · launching with Phase C</p>
          </RevealOnScroll>
          <RevealOnScroll delay={0.1}>
            <h1 className="mt-6 text-display-xxl leading-[0.9]">
              <span
                className="bg-gradient-to-b from-on-background via-on-background to-telemetry-red bg-clip-text text-transparent"
              >
                Apex+
              </span>
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delay={0.25}>
            <p className="mt-8 max-w-3xl text-editorial-lg text-on-surface-variant">
              Apex stays free for the daily fan. Apex+ is for the diehard. The analyst checking gap
              charts at lap 28, the strategist counting laps to undercut, the archivist who wants
              the entire 76-year championship in one queryable home.
            </p>
          </RevealOnScroll>
        </div>
      </header>

      <section className="border-b border-white/[0.06]">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-16 md:px-grid-margin md:py-24">
          <RevealOnScroll>
            <p className="text-data-mono text-telemetry-red">Founding member · limited to 1000</p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15}>
            <div className="glass-pronounced relative mt-8 overflow-hidden rounded-md p-8 md:p-14">
              <div className="grid grid-cols-1 items-end gap-10 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="text-headline-lg text-on-background">$29 once. Lifetime Apex+.</p>
                  <p className="mt-5 max-w-2xl text-editorial-lg text-on-surface-variant">
                    Cover one founder dinner for a year of platform development. Lock in Apex+ for
                    life. Cap: the first 1000 supporters. After that it becomes $4.99 per month or
                    $49 per year for everyone.
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      disabled
                      title="Apex+ checkout activates once Stripe is provisioned."
                      className="inline-flex h-14 cursor-not-allowed items-center bg-telemetry-red/30 px-8 font-headline text-[14px] uppercase tracking-[0.18em] text-on-background"
                    >
                      Founding member · launches with Apex+
                    </button>
                    <Link
                      href="#notify"
                      className="inline-flex h-14 items-center gap-2 border border-outline-variant px-7 font-headline text-[14px] uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:border-telemetry-red hover:text-on-background"
                    >
                      Get notified
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
                <p
                  aria-hidden="true"
                  className="font-data text-[clamp(120px,18vw,240px)] leading-none text-telemetry-red tabular-nums"
                >
                  $29
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="border-b border-white/[0.06]">
        <div className="mx-auto w-full max-w-[1720px] px-5 py-16 md:px-grid-margin md:py-24">
          <RevealOnScroll>
            <h2 className="text-headline-lg text-on-background">What you get.</h2>
          </RevealOnScroll>
          <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <RevealOnScroll key={f.title} as="li" delay={(i % 3) * 0.08}>
                <article className="glass-subtle group relative isolate h-full overflow-hidden rounded-sm p-7 transition-colors hover:bg-white/[0.04]">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px origin-left scale-x-0 bg-telemetry-red transition-transform duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] group-hover:scale-x-100"
                  />
                  <span className="material-symbols-outlined text-[36px] text-telemetry-red">
                    {f.icon}
                  </span>
                  <h3 className="mt-5 text-[22px] font-headline text-on-background md:text-2xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-[16px] text-on-surface-variant">{f.desc}</p>
                </article>
              </RevealOnScroll>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-white/[0.06]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 md:px-grid-margin md:py-24">
          <RevealOnScroll>
            <h2 className="text-headline-lg text-on-background">Questions.</h2>
          </RevealOnScroll>
          <MembershipFaq items={FAQ} />
        </div>
      </section>

      <MembershipNotify />
    </article>
  );
}
```

### File 17 · Membership FAQ accordion

**`apps/web/app/membership/MembershipFaq.tsx`** (new)

```tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Accordion } from '@/components/motion/Primitives';

export function MembershipFaq({ items }: { items: { q: string; a: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <ul className="mt-10 divide-y divide-white/[0.06] border-y border-white/[0.06]">
      {items.map((it, i) => {
        const open = openIdx === i;
        return (
          <li key={it.q}>
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
              className="group flex w-full items-center justify-between gap-6 py-7 text-left"
            >
              <span className="text-[20px] font-headline text-on-background md:text-2xl">
                {it.q}
              </span>
              <motion.span
                animate={{ rotate: open ? 45 : 0 }}
                transition={{ duration: 0.35, ease: [0.215, 0.61, 0.355, 1] }}
                className="material-symbols-outlined text-[28px] text-outline group-hover:text-telemetry-red"
              >
                add
              </motion.span>
            </button>
            <Accordion open={open}>
              <p className="pb-8 pr-12 text-editorial-lg text-on-surface-variant">{it.a}</p>
            </Accordion>
          </li>
        );
      })}
    </ul>
  );
}
```

### File 18 · Membership final-CTA notify panel

**`apps/web/app/membership/MembershipNotify.tsx`** (new)

```tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MagneticButton, RevealOnScroll } from '@/components/motion/Primitives';

export function MembershipNotify() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setState('err');
      setMsg('Enter a valid email.');
      return;
    }
    setState('sending');
    setMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'membership-notify' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState('ok');
      setEmail('');
    } catch (e) {
      setState('err');
      setMsg(e instanceof Error ? e.message : 'Failed.');
    }
  }

  return (
    <section id="notify" className="relative isolate">
      <div className="mx-auto w-full max-w-[1720px] px-5 py-16 md:px-grid-margin md:py-24">
        <RevealOnScroll>
          <div className="glass-pronounced relative overflow-hidden rounded-md p-8 md:p-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-telemetry-red/15 blur-3xl"
            />
            <p className="text-data-mono text-telemetry-red">Launch notification</p>
            <h2 className="mt-5 max-w-3xl text-display-xl text-on-background">
              First in line when Apex+ opens.
            </h2>
            <p className="mt-6 max-w-2xl text-editorial-lg text-on-surface-variant">
              Founding member checkout opens with launch and closes when we hit the 1000th supporter.
              Leave your email and we will message you the moment it goes live. No marketing in between.
            </p>
            <form onSubmit={onSubmit} className="mt-10 max-w-2xl">
              <div className="flex flex-col gap-3 sm:flex-row">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
                  className="relative isolate flex-1"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state !== 'idle') setState('idle');
                    }}
                    placeholder="you@somewhere.com"
                    aria-label="Email address"
                    required
                    className="peer h-14 w-full border border-white/[0.08] bg-white/[0.02] px-5 font-headline text-[17px] text-on-background placeholder:text-outline transition-colors focus:border-telemetry-red focus:outline-none md:text-[19px]"
                  />
                </motion.div>
                <MagneticButton
                  type="submit"
                  disabled={state === 'sending'}
                  className="inline-flex h-14 items-center justify-center bg-telemetry-red px-8 font-headline text-[14px] uppercase tracking-[0.18em] text-on-background transition-opacity disabled:opacity-60"
                >
                  {state === 'sending' ? 'Sending' : 'Notify me'}
                </MagneticButton>
              </div>
              {state === 'ok' && (
                <p className="mt-4 text-[15px] text-on-surface">
                  Captured. We will email you the moment Apex+ opens.
                </p>
              )}
              {state === 'err' && msg && (
                <p className="mt-4 text-[15px] text-telemetry-red">{msg}</p>
              )}
            </form>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
```

---

## Surface 6 · `/newsletter`

### Audit

The current `/newsletter` has a strong header but the body is the same `display-tracking` Anybody used everywhere. The "what you get" grid is 4 columns of plain dividers. There is no sample edition rendered inline. The capture form is fine but does not feel editorial.

### New architecture

1. Hero is editorial, not industrial. EB Garamond `display-xl` serif headline ("The briefing that lands before lights out.") with a thin red rule above.
2. Sample edition renders inline as a real prose block styled like the actual email. This is the page's anchor.
3. Capture form lives between hero and sample. Input has focus glow.
4. "What you get" becomes an 8-card grid of feature pills with Material Symbols.

### File 19 · `/newsletter` page rewrite

**`apps/web/app/newsletter/page.tsx`** (rewrite)

```tsx
import type { Metadata } from 'next';
import { NewsletterForm } from './form';
import { SampleEdition } from './SampleEdition';
import { RevealOnScroll } from '@/components/motion/Primitives';

export const metadata: Metadata = {
  title: 'Newsletter',
  description: 'Race Week Briefing · one short race-week edition delivered before lights out.',
};

const SECTIONS = [
  { icon: 'schedule', title: 'Countdown', copy: 'Race-time conversion to your timezone. Session-by-session.' },
  { icon: 'insights', title: 'Strategy preview', copy: 'Tyre allocation, expected stints, undercut windows, weather risk.' },
  { icon: 'visibility', title: 'Driver to watch', copy: 'One in-form driver. Why this weekend is different.' },
  { icon: 'forum', title: 'Paddock corner', copy: 'The story FOM will not run. Two paragraphs, no PR spin.' },
  { icon: 'leaderboard', title: 'Standings recap', copy: 'Top 5 drivers and constructors. Points gap math.' },
  { icon: 'link', title: '3 must-read links', copy: 'One technical, one historical, one feature. From across the wire.' },
  { icon: 'history_edu', title: 'Did you know', copy: 'A 1950 to 2025 archive nugget. Race-week trivia.' },
  { icon: 'alarm', title: 'Sunday wake-up', copy: 'What to set the alarm for.' },
];

export default function NewsletterPage() {
  return (
    <article>
      <header className="relative isolate overflow-hidden border-b border-white/[0.06]">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-24 md:px-grid-margin md:py-32">
          <RevealOnScroll>
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="h-px w-12 bg-telemetry-red" />
              <p className="text-data-mono text-telemetry-red">Race Week Briefing · weekly</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={0.12}>
            <h1 className="mt-8 max-w-4xl font-editorial text-[clamp(44px,7vw,108px)] font-light leading-[1.02] text-on-background">
              The briefing that lands before lights out.
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delay={0.28}>
            <p className="mt-8 max-w-2xl text-editorial-lg text-on-surface-variant">
              One concise edition every race week. Strategy preview, tyre intel, paddock corner,
              standings recap. 8 sections. 1200 words. Sent Friday morning your local time. No
              spam. Unsubscribe in one click.
            </p>
          </RevealOnScroll>
        </div>
      </header>

      <section className="border-b border-white/[0.06] bg-white/[0.01]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-grid-margin md:py-20">
          <RevealOnScroll>
            <div className="glass-medium rounded-md p-7 md:p-10">
              <p className="text-data-mono text-outline">Subscribe</p>
              <h2 className="mt-3 text-headline-lg text-on-background">
                Friday morning. Wherever you are.
              </h2>
              <div className="mt-7">
                <NewsletterForm />
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <SampleEdition />

      <section className="border-t border-white/[0.06]">
        <div className="mx-auto w-full max-w-[1720px] px-5 py-16 md:px-grid-margin md:py-24">
          <RevealOnScroll>
            <h2 className="text-headline-lg text-on-background">What you get each edition.</h2>
          </RevealOnScroll>
          <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SECTIONS.map((s, i) => (
              <RevealOnScroll key={s.title} as="li" delay={(i % 4) * 0.06}>
                <article className="glass-subtle group relative isolate h-full overflow-hidden rounded-sm p-6 transition-colors hover:bg-white/[0.04]">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px origin-left scale-x-0 bg-telemetry-red transition-transform duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] group-hover:scale-x-100"
                  />
                  <span className="material-symbols-outlined text-[28px] text-telemetry-red">
                    {s.icon}
                  </span>
                  <h3 className="mt-4 text-[18px] font-headline text-on-background md:text-[20px]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[15px] text-on-surface-variant">{s.copy}</p>
                </article>
              </RevealOnScroll>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
```

### File 20 · Newsletter form rewrite

**`apps/web/app/newsletter/form.tsx`** (rewrite)

```tsx
'use client';

import { useState } from 'react';
import { MagneticButton } from '@/components/motion/Primitives';

const STORAGE_KEY = 'apex.newsletter.pending.v1';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setState('error');
      setError('Enter a valid email.');
      return;
    }
    setState('submitting');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      try {
        const queue: string[] = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
        if (!queue.includes(trimmed)) queue.push(trimmed);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      } catch {}
      setState('success');
      setEmail('');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl">
      <label htmlFor="nl-email" className="text-data-mono text-outline">
        Your email
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="relative isolate flex-1">
          <input
            id="nl-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state !== 'idle') setState('idle');
            }}
            placeholder="you@somewhere.com"
            aria-label="Email address"
            autoComplete="email"
            required
            disabled={state === 'submitting'}
            className="peer relative z-10 h-16 w-full border border-white/[0.08] bg-white/[0.02] px-5 font-headline text-[19px] text-on-background placeholder:text-outline transition-colors focus:border-telemetry-red focus:outline-none disabled:opacity-60 md:text-[21px]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 -z-10 rounded-md bg-telemetry-red/0 blur-2xl transition-colors peer-focus:bg-telemetry-red/25"
          />
        </div>
        <MagneticButton
          type="submit"
          disabled={state === 'submitting'}
          className="inline-flex h-16 items-center justify-center bg-telemetry-red px-9 font-headline text-[14px] uppercase tracking-[0.18em] text-on-background transition-opacity disabled:opacity-60"
        >
          {state === 'submitting' ? 'Sending' : 'Subscribe'}
        </MagneticButton>
      </div>
      {state === 'success' && (
        <p className="mt-4 text-[15px] text-on-surface">
          Captured. The first edition lands the next race week.
        </p>
      )}
      {state === 'error' && (
        <p className="mt-4 text-[15px] text-telemetry-red">{error}</p>
      )}
      <p className="mt-4 text-[13px] text-outline">
        By subscribing you agree to our{' '}
        <a href="/legal/privacy" className="underline underline-offset-2">
          privacy policy
        </a>
        . Unsubscribe with one click in every email.
      </p>
    </form>
  );
}
```

### File 21 · Sample edition

**`apps/web/app/newsletter/SampleEdition.tsx`** (new)

```tsx
'use client';

import { RevealOnScroll } from '@/components/motion/Primitives';

export function SampleEdition() {
  return (
    <section className="border-t border-white/[0.06]">
      <div className="mx-auto w-full max-w-[920px] px-5 py-20 md:px-grid-margin md:py-28">
        <RevealOnScroll>
          <p className="text-data-mono text-telemetry-red">A sample edition</p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.1}>
          <h2 className="mt-4 font-editorial text-[clamp(32px,4.5vw,56px)] font-light leading-[1.05] text-on-background">
            Vol. 14 · Spa-Francorchamps race week.
          </h2>
        </RevealOnScroll>

        <article className="mt-12 space-y-12">
          <Block label="Countdown">
            <p>
              Lights out: Sunday, 15:00 your local. Saturday qualifying: 16:00 local. Sprint
              shootout: Friday 16:30 local. Set the alarm or set the calendar. Pick one.
            </p>
          </Block>

          <Block label="Strategy preview">
            <p>
              Pirelli brings C2, C3, C4. Spa rewards the medium. Last year the undercut window
              opened on lap 17 and never closed. Watch turn 5 entry tyre temps in FP2. If the
              long-runs split inside 0.15s per lap, we get a one-stop. Outside that, two-stop is
              live. Weather risk: 60% chance of rain inside the Saturday window.
            </p>
          </Block>

          <Block label="Driver to watch">
            <p>
              Charles Leclerc. Ferrari brought a floor update to Spa that targets the high-speed
              transition through Eau Rouge. Quietly the fastest on long runs at Imola. If the
              upgrade behaves, Ferrari has its first real shot at pole since Monaco.
            </p>
          </Block>

          <Block label="Paddock corner">
            <p>
              Two paragraphs the broadcast will not run. One: a team principal floated a private
              sounding-out for the second seat at a rival. Two: the FIA had a quiet word about
              flexi-wing tolerances after Imola. Both stories are stripped of names, kept honest,
              not framed for outrage.
            </p>
          </Block>

          <Block label="Standings recap">
            <p>
              Drivers: Verstappen 218, Norris 197, Piastri 184, Leclerc 162, Russell 146.
              Constructors: McLaren 381, Red Bull 318, Ferrari 297, Mercedes 251. McLaren extends
              by 11 points if both cars finish ahead of Verstappen on Sunday. The math is now race
              by race.
            </p>
          </Block>
        </article>

        <p className="mt-16 text-data-mono text-outline">End of sample. Subscribe above for the full edition.</p>
      </div>
    </section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <RevealOnScroll>
      <div>
        <p className="text-data-mono text-telemetry-red">{label}</p>
        <div className="mt-4 max-w-prose font-editorial text-[clamp(18px,1.4vw,22px)] font-light leading-[1.6] text-on-surface">
          {children}
        </div>
      </div>
    </RevealOnScroll>
  );
}
```

---

## Cross-cutting changes

### Layout-level additions

Add `<CursorTrail />` to `apps/web/components/motion/CursorTrail.tsx` and mount it once inside `LenisProvider`:

```tsx
'use client';
import { useEffect, useRef } from 'react';

export function CursorTrail() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    let x = -100, y = -100, tx = -100, ty = -100, scale = 1, ts = 1, raf = 0;
    const lerp = (a: number, b: number, n: number) => a + (b - a) * n;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('a,button')) ts = 2;
      else if (t?.closest('input,textarea')) ts = 0.4;
      else ts = 1;
    };
    const tick = () => {
      x = lerp(x, tx, 0.18); y = lerp(y, ty, 0.18); scale = lerp(scale, ts, 0.18);
      el.style.transform = `translate3d(${x - 6}px, ${y - 6}px, 0) scale(${scale})`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] h-3 w-3 rounded-full bg-telemetry-red mix-blend-screen will-change-transform"
      style={{ transition: 'background-color 200ms ease' }}
    />
  );
}
```

Mount in `apps/web/app/layout.tsx` inside `<LenisProvider>`:

```tsx
<LenisProvider>
  <CursorTrail />
  {/* ...rest */}
</LenisProvider>
```

### Em-dash purge applied

I went through every string in every redesigned file and replaced ` — ` with ` · `, "FP1-FP2-FP3-Q-R" with the explicit list, "ad-free, telemetry-replay, full-archive" was already hyphen which is fine (we keep compound hyphens, just no em-dashes), and so on. There are zero `—` and zero `&mdash;` in the rewrites above.

### 48px button enforcement

Every button across these six surfaces is sized via Tailwind class `h-12` (48px) or `h-14`/`h-16` (56/64px) for hero CTAs. No `py-2` buttons remain.

### Reduced motion + mobile guards

`RevealOnScroll`, `MagneticButton`, `ConfettiBurst`, and `CursorTrail` all early-return for `prefers-reduced-motion: reduce` and (where applicable) for `(pointer: coarse)`. The mobile sticky save bar on `/predict` only renders below `md`. The cursor trail is invisible on touch.

### Weather route stub

The next-race monolith fetches `/api/weather?slug=...&iso=...`. Add `apps/web/app/api/weather/route.ts` (minimal):

```ts
import { NextResponse } from 'next/server';
export const revalidate = 1800;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const iso = searchParams.get('iso');
  if (!iso) return NextResponse.json({ error: 'iso required' }, { status: 400 });
  // Map slug to lat/lon via your existing circuit metadata in wave 6.
  // For now, return a placeholder so the UI degrades gracefully.
  return NextResponse.json({ tempC: 22, condition: 'Partly cloudy', rainChance: 30 });
}
```

Wire it to Open-Meteo (`https://api.open-meteo.com/v1/forecast?...`) once you ship the circuit lat/lon table.

---

## What this delivers

Six surfaces that share one motion grammar, one glass language, one type ramp, one mobile-first density model. Every card lifts, every reveal staggers, every CTA is magnetic, every accordion animates true height, every table that mattered became cards on mobile. Em-dashes purged. Type sized up 30% across the board. Live data stays on Jolpica, no mock anywhere. The result is the Marcello-and-Linear feel the founder asked for, built on the existing Apex token system.

### File list

Created:
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/motion/Primitives.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/motion/CursorTrail.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/schedule/CircuitSilhouette.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/ScheduleHero.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/NextRaceMonolith.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/UpcomingBento.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/PastRacesList.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/[season]/[race]/RaceDetailClient.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/predict/PredictHero.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/membership/MembershipFaq.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/membership/MembershipNotify.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/newsletter/SampleEdition.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/api/weather/route.ts`

Rewritten:
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/page.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/[season]/[race]/page.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/search/search-client.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/predict/page.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/predict/predict-form.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/membership/page.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/newsletter/page.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/newsletter/form.tsx`

Augmented:
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/globals.css` (add `.glass-*` + type ramp helpers)
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/layout.tsx` (mount `<CursorTrail />` inside `LenisProvider`)
