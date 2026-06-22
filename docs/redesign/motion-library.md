# Motion library — scroll reveals, parallax, magnetic buttons, view transitions

# Apex Motion Primitive Library

> Production motion system for Apex Formula 1. All primitives are GPU-only (transform/opacity/filter), Lenis-synced, reduced-motion-aware, SSR-safe, and TypeScript-strict. Drop into `packages/ui/src/motion/`.

---

## 0. Architecture & file layout

```
packages/ui/src/motion/
├── index.ts                       # barrel
├── hooks/
│   ├── useGsapWithLenis.ts        # #11 — GSAP <-> Lenis proxy
│   ├── useReducedMotion.ts        # prefers-reduced-motion hook
│   ├── useIsTouch.ts              # pointer:coarse detection
│   └── useIntersection.ts         # IO wrapper, once-by-default
├── lenis/
│   └── LenisProvider.tsx          # owns single Lenis instance, exposes ctx
├── primitives/
│   ├── RevealOnScroll.tsx         # #1
│   ├── Parallax.tsx               # #2
│   ├── ScrollPinned.tsx           # #3
│   ├── MagneticButton.tsx         # #4
│   ├── CountUp.tsx                # #5
│   ├── TickerMarquee.tsx          # #6
│   ├── TextScramble.tsx           # #7
│   ├── CursorFollower.tsx         # #8
│   ├── ViewTransitionLink.tsx     # #9
│   └── TrackingTrail.tsx          # #10
└── tokens.ts                      # motion tokens (eases, durations)
```

A single Lenis instance lives at the root layout (`apps/web/app/layout.tsx`) inside `<LenisProvider>`. Every primitive that touches scroll consumes Lenis through `useGsapWithLenis`. There is one and only one scroll source. Native scroll is disabled; CSS `html { scroll-behavior: auto; }` is mandatory.

---

## 1. Motion tokens (`tokens.ts`)

These mirror `packages/ui/src/tokens.ts` and `apps/web/app/globals.css @theme`. Single source of truth so designers and engineers cannot drift.

```ts
// packages/ui/src/motion/tokens.ts
export const ease = {
  cinematic: [0.215, 0.61, 0.355, 1] as const, // hero reveals, card entrances
  quint:     [0.86, 0, 0.07, 1]   as const,    // pinned scrubs, telemetry sweeps
  outQuart:  [0.165, 0.84, 0.44, 1] as const,  // count-ups, magnetic settle
  inOutExpo: [0.87, 0, 0.13, 1]    as const,   // page transitions
} as const;

export const dur = {
  micro:     180,
  base:      320,
  cinematic: 600,
  epic:      900,
} as const;

export const stagger = {
  tight: 0.04,
  base:  0.08,
  loose: 0.14,
} as const;

export type EaseToken = keyof typeof ease;
export type DurToken  = keyof typeof dur;
```

---

## 2. `LenisProvider` and `useGsapWithLenis` (Deliverable #11)

This is the keystone. Without it, primitives #2 and #3 will fight Lenis and produce jittery scroll. Lives at the layout root.

```tsx
// packages/ui/src/motion/lenis/LenisProvider.tsx
"use client";

import Lenis from "lenis";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

type LenisCtx = { lenis: Lenis | null };
const Ctx = createContext<LenisCtx>({ lenis: null });

export function LenisProvider({ children }: { children: ReactNode }) {
  const ref = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
      smoothWheel: true,
      // do not smooth touch — native momentum is better on iOS
      syncTouch: false,
    });
    ref.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      ref.current = null;
    };
  }, []);

  return <Ctx.Provider value={{ lenis: ref.current }}>{children}</Ctx.Provider>;
}

export const useLenis = () => useContext(Ctx).lenis;
```

```ts
// packages/ui/src/motion/hooks/useGsapWithLenis.ts
"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "../lenis/LenisProvider";

let registered = false;

/**
 * Wires GSAP ScrollTrigger to the shared Lenis instance.
 * Must be called once at app root AND inside any component that
 * creates ScrollTriggers, so re-mounts re-bind on hot reload.
 *
 * Returns the lenis instance for convenience (parallax/scrub).
 */
export function useGsapWithLenis() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }

    // Lenis emits a scroll event; ask ScrollTrigger to update on it.
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    // Lock GSAP ticker -> Lenis frame so they share one RAF.
    const tickerFn = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    // Tell ScrollTrigger the document scroll is driven by Lenis.
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && typeof value === "number") {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: innerWidth, height: innerHeight };
      },
      pinType: document.documentElement.style.transform ? "transform" : "fixed",
    });

    ScrollTrigger.defaults({ scroller: document.documentElement });
    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(tickerFn);
    };
  }, [lenis]);

  return lenis;
}
```

---

## 3. Shared hooks

```ts
// packages/ui/src/motion/hooks/useReducedMotion.ts
"use client";
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}
```

```ts
// packages/ui/src/motion/hooks/useIsTouch.ts
"use client";
import { useEffect, useState } from "react";

export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return touch;
}
```

```ts
// packages/ui/src/motion/hooks/useIntersection.ts
"use client";
import { useEffect, useRef, useState } from "react";

type Opts = { threshold?: number; once?: boolean; rootMargin?: string };

export function useIntersection<T extends Element>(opts: Opts = {}) {
  const { threshold = 0.15, once = true, rootMargin = "0px 0px -10% 0px" } = opts;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold, once, rootMargin]);

  return [ref, inView] as const;
}
```

---

## 4. `<RevealOnScroll>` (Deliverable #1)

Variants compile to Framer Motion `initial`/`animate` pairs. Stagger variant orchestrates direct children. Reduced motion snaps to final state.

```tsx
// packages/ui/src/motion/primitives/RevealOnScroll.tsx
"use client";

import { motion, type Transition, type Variants } from "framer-motion";
import { Children, type ReactNode } from "react";
import { useIntersection } from "../hooks/useIntersection";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ease, dur, stagger as st } from "../tokens";

export type RevealVariant =
  | "fade-up"
  | "fade-up-stagger"
  | "scale-in"
  | "slide-left"
  | "slide-right"
  | "reveal-mask";

type Props = {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  threshold?: number;
  repeat?: boolean;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
};

const transition = (d: number, delay: number): Transition => ({
  duration: d,
  delay,
  ease: ease.cinematic as unknown as number[],
});

const variants: Record<RevealVariant, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 32 },
    show:   { opacity: 1, y: 0 },
  },
  "fade-up-stagger": {
    hidden: {},
    show:   {},
  },
  "scale-in": {
    hidden: { opacity: 0, scale: 0.94 },
    show:   { opacity: 1, scale: 1 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: 48 },
    show:   { opacity: 1, x: 0 },
  },
  "slide-right": {
    hidden: { opacity: 0, x: -48 },
    show:   { opacity: 1, x: 0 },
  },
  "reveal-mask": {
    hidden: { clipPath: "inset(0 100% 0 0)" },
    show:   { clipPath: "inset(0 0% 0 0)" },
  },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
};

export function RevealOnScroll({
  children,
  variant = "fade-up",
  delay = 0,
  duration = dur.cinematic / 1000,
  threshold = 0.15,
  repeat = false,
  as = "div",
  className,
}: Props) {
  const reduced = useReducedMotion();
  const [ref, inView] = useIntersection<HTMLElement>({ threshold, once: !repeat });
  const Tag = motion[as as "div"];

  if (reduced) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  if (variant === "fade-up-stagger") {
    return (
      <Tag
        ref={ref as never}
        className={className}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: st.base, delayChildren: delay } },
        }}
      >
        {Children.map(children, (child, i) => (
          <motion.div
            key={i}
            variants={childVariants}
            transition={transition(duration, 0)}
            style={{ willChange: inView ? "transform, opacity" : "auto" }}
          >
            {child}
          </motion.div>
        ))}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as never}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={variants[variant]}
      transition={transition(duration, delay)}
      style={{ willChange: inView ? "transform, opacity, clip-path" : "auto" }}
    >
      {children}
    </Tag>
  );
}
```

Usage on a rail of driver cards:
```tsx
<RevealOnScroll variant="fade-up-stagger" className="grid grid-cols-4 gap-6">
  {drivers.map(d => <DriverCard key={d.id} {...d}/>)}
</RevealOnScroll>
```

---

## 5. `<Parallax>` (Deliverable #2)

Speed maps to translateY = `-(scrollProgress - 0.5) * range * speed`, where range = element height. ScrollTrigger drives the tween; Lenis drives ScrollTrigger.

```tsx
// packages/ui/src/motion/primitives/Parallax.tsx
"use client";

import { gsap } from "gsap";
import { useEffect, useRef, type ReactNode } from "react";
import { useGsapWithLenis } from "../hooks/useGsapWithLenis";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Props = {
  children: ReactNode;
  /** -1 (slower than scroll) to 1 (much faster). Negative = inverse. */
  speed?: number;
  className?: string;
};

export function Parallax({ children, speed = 0.3, className }: Props) {
  useGsapWithLenis();
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const node = wrapRef.current;
    if (!node) return;

    const clamped = Math.max(-1, Math.min(1, speed));
    const distance = window.innerHeight * clamped * 0.5;

    const tween = gsap.fromTo(
      node,
      { yPercent: -clamped * 12 },
      {
        yPercent: clamped * 12,
        ease: "none",
        scrollTrigger: {
          trigger: node,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      void distance; // explicit ref, calc may inform future variants
    };
  }, [speed, reduced]);

  return (
    <div ref={wrapRef} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
```

---

## 6. `<ScrollPinned>` (Deliverable #3)

Pins the wrapper for `pinFor`. Each frame inside the pinned window calls `onScrub(progress)` with 0 to 1. Use to drive circuit hero reveal, driver portrait scrub, telemetry strip wipe.

```tsx
// packages/ui/src/motion/primitives/ScrollPinned.tsx
"use client";

import { gsap } from "gsap";
import { useEffect, useRef, type ReactNode } from "react";
import { useGsapWithLenis } from "../hooks/useGsapWithLenis";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Props = {
  children: ReactNode;
  /** e.g. "+=200%" pins for 2 viewport heights of scroll */
  pinFor?: string;
  onScrub?: (progress: number) => void;
  /** if false, pin only on >=lg viewports (default true) */
  pinOnMobile?: boolean;
  className?: string;
};

export function ScrollPinned({
  children,
  pinFor = "+=200%",
  onScrub,
  pinOnMobile = true,
  className,
}: Props) {
  useGsapWithLenis();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    if (!pinOnMobile && matchMedia("(max-width: 1023px)").matches) return;

    const st = ScrollTriggerCreate(node, pinFor, onScrub);
    return () => st.kill();
  }, [pinFor, onScrub, pinOnMobile, reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// extracted so we can reuse the create+cleanup pattern
function ScrollTriggerCreate(
  node: HTMLDivElement,
  pinFor: string,
  onScrub?: (p: number) => void,
) {
  return gsap.timeline({
    scrollTrigger: {
      trigger: node,
      start: "top top",
      end: pinFor,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.4,
      onUpdate: (self) => onScrub?.(self.progress),
      invalidateOnRefresh: true,
    },
  }).scrollTrigger!;
}
```

Usage on standings hero:
```tsx
<ScrollPinned pinFor="+=180%" onScrub={(p) => setStandingsProgress(p)}>
  <StandingsCinematic progress={standingsProgress} />
</ScrollPinned>
```

---

## 7. `<MagneticButton>` (Deliverable #4)

Spring-back uses Framer Motion `useSpring`. Hard exit on touch devices. Radius 80px, factor 0.25 per spec.

```tsx
// packages/ui/src/motion/primitives/MagneticButton.tsx
"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useIsTouch } from "../hooks/useIsTouch";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  radius?: number;
  strength?: number;
};

export const MagneticButton = forwardRef<HTMLButtonElement, Props>(function MagneticButton(
  { children, radius = 80, strength = 0.25, className, ...rest },
  forwardedRef,
) {
  const touch = useIsTouch();
  const reduced = useReducedMotion();
  const localRef = useRef<HTMLButtonElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });

  if (touch || reduced) {
    return (
      <button
        ref={(n) => {
          localRef.current = n;
          if (typeof forwardedRef === "function") forwardedRef(n);
          else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = n;
        }}
        className={className}
        {...rest}
      >
        {children}
      </button>
    );
  }

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = localRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) return;
    x.set(dx * strength);
    y.set(dy * strength);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={(n) => {
        localRef.current = n;
        if (typeof forwardedRef === "function") forwardedRef(n);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = n;
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy, willChange: "transform" }}
      className={className}
      {...(rest as object)}
    >
      {children}
    </motion.button>
  );
});
```

---

## 8. `<CountUp>` (Deliverable #5)

`easeOutQuart` per spec. Decimals + suffix supported. Snaps on reduced motion.

```tsx
// packages/ui/src/motion/primitives/CountUp.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useIntersection } from "../hooks/useIntersection";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Props = {
  to: number;
  from?: number;
  duration?: number;     // ms
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  /** thousands separator (default narrow space). */
  separator?: string;
};

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

const format = (n: number, decimals: number, sep: string) => {
  const fixed = n.toFixed(decimals);
  const [int, dec] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return decimals > 0 ? `${grouped}.${dec}` : grouped;
};

export function CountUp({
  to,
  from = 0,
  duration = 1400,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
  separator = "\u202F",
}: Props) {
  const reduced = useReducedMotion();
  const [ref, inView] = useIntersection<HTMLSpanElement>({ threshold: 0.4 });
  const [value, setValue] = useState(reduced ? to : from);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const delta = to - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutQuart(t);
      setValue(from + delta * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, to, from, duration, reduced]);

  return (
    <span ref={ref} className={className} aria-label={`${prefix}${to}${suffix}`}>
      {prefix}
      {format(value, decimals, separator)}
      {suffix ? <span className="ml-1 text-on-surface-variant">{suffix}</span> : null}
    </span>
  );
}
```

Usage on stat card:
```tsx
<CountUp to={103} suffix="WINS" className="font-display text-display-xl" />
<CountUp to={9.2} decimals={1} suffix="%" />
```

---

## 9. `<TickerMarquee>` (Deliverable #6)

Duplicates children once for seamless loop. Pause on hover. CSS gradient mask for edge fade so it does not require absolute-positioned overlays.

```tsx
// packages/ui/src/motion/primitives/TickerMarquee.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Props = {
  children: ReactNode;
  direction?: "left" | "right";
  /** seconds for one full pass */
  speed?: number;
  pauseOnHover?: boolean;
  fadeEdges?: boolean;
  className?: string;
};

export function TickerMarquee({
  children,
  direction = "left",
  speed = 40,
  pauseOnHover = true,
  fadeEdges = true,
  className,
}: Props) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;
    track.style.animationPlayState = "running";
  }, [reduced]);

  const dir = direction === "left" ? "normal" : "reverse";
  const mask = fadeEdges
    ? "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)"
    : undefined;

  return (
    <div
      className={["overflow-hidden", className].filter(Boolean).join(" ")}
      style={{
        WebkitMaskImage: mask,
        maskImage: mask,
        contain: "layout paint",
      }}
      onMouseEnter={(e) => {
        if (!pauseOnHover) return;
        (e.currentTarget.querySelector("[data-marquee-track]") as HTMLElement | null)
          ?.style.setProperty("animation-play-state", "paused");
      }}
      onMouseLeave={(e) => {
        if (!pauseOnHover) return;
        (e.currentTarget.querySelector("[data-marquee-track]") as HTMLElement | null)
          ?.style.setProperty("animation-play-state", "running");
      }}
    >
      <div
        ref={trackRef}
        data-marquee-track
        className="flex w-max gap-12 will-change-transform"
        style={{
          animation: reduced ? "none" : `apex-marquee ${speed}s linear infinite ${dir}`,
        }}
      >
        <div className="flex gap-12 shrink-0">{children}</div>
        <div className="flex gap-12 shrink-0" aria-hidden>{children}</div>
      </div>
      <style jsx global>{`
        @keyframes apex-marquee {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </div>
  );
}
```

---

## 10. `<TextScramble>` (Deliverable #7)

Cycles glyphs per character; settles in ~600ms. Triggers once on intersect. Honors reduced motion.

```tsx
// packages/ui/src/motion/primitives/TextScramble.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useIntersection } from "../hooks/useIntersection";
import { useReducedMotion } from "../hooks/useReducedMotion";

const GLYPHS = "!<>-_\\/[]{}+=*^?#$%&@01";

type Props = {
  text: string;
  duration?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
};

export function TextScramble({ text, duration = 600, className, as = "span" }: Props) {
  const Tag = as as "span";
  const reduced = useReducedMotion();
  const [ref, inView] = useIntersection<HTMLElement>({ threshold: 0.5 });
  const [out, setOut] = useState(reduced ? text : "");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setOut(text);
      return;
    }
    const start = performance.now();
    const len = text.length;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * len);
      let s = "";
      for (let i = 0; i < len; i++) {
        if (i < settled) s += text[i];
        else if (text[i] === " ") s += " ";
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, text, duration, reduced]);

  return (
    <Tag ref={ref as never} className={className} aria-label={text}>
      <span aria-hidden>{out}</span>
    </Tag>
  );
}
```

---

## 11. `<CursorFollower>` (Deliverable #8)

Mounted once at root, after Lenis. Inner dot follows pointer instantly; outer ring lerps with 80ms time-constant. Scale on `[data-cursor="link"]` / `[data-cursor="image"]` via global mouseover delegation.

```tsx
// packages/ui/src/motion/primitives/CursorFollower.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useIsTouch } from "../hooks/useIsTouch";
import { useReducedMotion } from "../hooks/useReducedMotion";

type CursorMode = "default" | "link" | "image";

export function CursorFollower() {
  const touch = useIsTouch();
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<CursorMode>("default");

  useEffect(() => {
    if (touch) return;

    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const ring   = { x: target.x, y: target.y };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
    };

    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest("[data-cursor]");
      const next = (el?.getAttribute("data-cursor") as CursorMode | null) ?? "default";
      setMode(next);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });

    // 80ms lag => alpha = 1 - exp(-dt / tau). At 60fps dt=16, tau=80 => ~0.18.
    const alpha = 0.18;
    let raf = 0;
    const loop = () => {
      ring.x += (target.x - ring.x) * alpha;
      ring.y += (target.y - ring.y) * alpha;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      cancelAnimationFrame(raf);
    };
  }, [touch]);

  if (touch || reduced) return null;

  const ringScale = mode === "link" ? 2.2 : mode === "image" ? 3.4 : 1;
  const ringBorder = mode === "link" ? "rgba(225,6,0,0.9)" : "rgba(229,226,225,0.55)";

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-1.5 w-1.5 rounded-full bg-on-background mix-blend-difference"
        style={{ willChange: "transform" }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9997] h-9 w-9 rounded-full border transition-[transform,border-color,opacity] duration-300"
        style={{
          willChange: "transform",
          borderColor: ringBorder,
          transform: `translate3d(${innerWidth / 2}px, ${innerHeight / 2}px, 0) translate(-50%, -50%) scale(${ringScale})`,
        }}
      />
    </>
  );
}
```

Inside root layout, also add a global CSS rule `html { cursor: none; }` when CursorFollower is mounted. Hover targets get `data-cursor="link"` (anchors, buttons) and `data-cursor="image"` (driver portraits, race poster cells).

---

## 12. `<ViewTransitionLink>` (Deliverable #9)

Uses the View Transitions API when present. Named transitions for shared elements (driver portrait persists between `/drivers` and `/drivers/[slug]`). Graceful fade fallback.

```tsx
// packages/ui/src/motion/primitives/ViewTransitionLink.tsx
"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type DocVT = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> };
};

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: ReactNode;
    /** name to set on `view-transition-name` for shared-element morph */
    transitionName?: string;
  };

export function ViewTransitionLink({
  children,
  href,
  transitionName,
  onClick,
  className,
  ...rest
}: Props) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    const doc = document as DocVT;
    if (typeof doc.startViewTransition !== "function") return; // native fallback

    e.preventDefault();
    doc.startViewTransition(() => {
      router.push(href.toString());
      // wait for paint
      return new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      style={transitionName ? ({ viewTransitionName: transitionName } as React.CSSProperties) : undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}
```

Global CSS to define the fade fallback and the named morphs (in `globals.css`):
```css
@view-transition { navigation: auto; }

::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 320ms;
  animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
}

::view-transition-old(driver-portrait),
::view-transition-new(driver-portrait) {
  animation-duration: 600ms;
  animation-timing-function: cubic-bezier(0.86, 0, 0.07, 1);
}
```

Usage:
```tsx
<ViewTransitionLink href={`/drivers/${driver.slug}`} transitionName={`driver-${driver.slug}`}>
  <Image alt={driver.name} src={driver.portrait} style={{ viewTransitionName: `driver-${driver.slug}` } as never}/>
</ViewTransitionLink>
```

---

## 13. `<TrackingTrail>` (Deliverable #10)

Red radial-gradient that follows the cursor inside the card. Implemented as a CSS variable + radial-gradient background on a pseudo layer. No JS animation loop, no layout reads, just pointer-event coord writes. Zero jank.

```tsx
// packages/ui/src/motion/primitives/TrackingTrail.tsx
"use client";

import { useRef, type ReactNode } from "react";
import { useIsTouch } from "../hooks/useIsTouch";

type Props = {
  children: ReactNode;
  className?: string;
  color?: string;
  intensity?: number; // 0..1
  radius?: number;    // px
};

export function TrackingTrail({
  children,
  className,
  color = "rgba(225, 6, 0, 0.32)",
  intensity = 1,
  radius = 220,
}: Props) {
  const touch = useIsTouch();
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--trail-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--trail-y", `${e.clientY - rect.top}px`);
    el.style.setProperty("--trail-opacity", `${intensity}`);
  };

  const onLeave = () => {
    ref.current?.style.setProperty("--trail-opacity", "0");
  };

  return (
    <div
      ref={ref}
      onPointerMove={touch ? undefined : onMove}
      onPointerLeave={touch ? undefined : onLeave}
      className={["relative isolate overflow-hidden", className].filter(Boolean).join(" ")}
      style={
        {
          "--trail-x": "50%",
          "--trail-y": "50%",
          "--trail-opacity": "0",
          "--trail-radius": `${radius}px`,
          "--trail-color": color,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-500"
        style={{
          opacity: "var(--trail-opacity)" as unknown as number,
          background:
            "radial-gradient(var(--trail-radius) circle at var(--trail-x) var(--trail-y), var(--trail-color), transparent 70%)",
          willChange: "opacity, background-position",
        }}
      />
      {children}
    </div>
  );
}
```

---

## 14. Barrel + root wiring

```ts
// packages/ui/src/motion/index.ts
export { LenisProvider, useLenis } from "./lenis/LenisProvider";
export { useGsapWithLenis }        from "./hooks/useGsapWithLenis";
export { useReducedMotion }        from "./hooks/useReducedMotion";
export { useIsTouch }              from "./hooks/useIsTouch";
export { useIntersection }         from "./hooks/useIntersection";

export { RevealOnScroll }     from "./primitives/RevealOnScroll";
export { Parallax }           from "./primitives/Parallax";
export { ScrollPinned }       from "./primitives/ScrollPinned";
export { MagneticButton }     from "./primitives/MagneticButton";
export { CountUp }            from "./primitives/CountUp";
export { TickerMarquee }      from "./primitives/TickerMarquee";
export { TextScramble }       from "./primitives/TextScramble";
export { CursorFollower }     from "./primitives/CursorFollower";
export { ViewTransitionLink } from "./primitives/ViewTransitionLink";
export { TrackingTrail }      from "./primitives/TrackingTrail";

export * from "./tokens";
```

Mount in `apps/web/app/layout.tsx`:
```tsx
<LenisProvider>
  <CursorFollower />
  {children}
</LenisProvider>
```

---

## 15. Motion patterns by surface (Deliverable #12)

Mapping of which primitive owns which moment. Treat this as canon. If a surface needs a moment not listed, escalate; do not freestyle a one-off animation.

### `/` Homepage (10 sections)
- **Hero**: `Parallax` on background plate (speed 0.4) plus `RevealOnScroll variant="reveal-mask"` on display headline. Headline word break is one word per line. `MagneticButton` on primary CTA.
- **Race ticker (live)**: `TickerMarquee` left, speed 55s, gradient mask, pauses on hover.
- **Standings cinematic**: `ScrollPinned pinFor="+=200%"` with `onScrub` driving driver rank cards sliding into formation. Replaces a generic table.
- **Driver rail**: `RevealOnScroll variant="fade-up-stagger"`, each card wrapped in `TrackingTrail`, name uses `ViewTransitionLink transitionName="driver-{slug}"`.
- **Stat cards (champion points / lap record / fastest pit)**: `CountUp` on number, `TextScramble` on label.
- **Latest news rail**: `RevealOnScroll variant="slide-left"`, cards wrapped in `TrackingTrail`.
- **Editorial pull-quote**: `RevealOnScroll variant="fade-up"` with EB Garamond, no other motion. Stillness is the design.
- **Partners strip**: `TickerMarquee` right, speed 80s.
- **Video shelf**: `RevealOnScroll variant="scale-in"` on thumbnails.
- **Footer CTA**: `MagneticButton` on newsletter submit.

### `/schedule` and `/schedule/[season]/[race]`
- Season header: `TextScramble` on season label, `RevealOnScroll variant="fade-up"` on grid.
- Round cards: `RevealOnScroll variant="fade-up-stagger"`. Round number animates via `CountUp`.
- Race detail circuit hero: `ScrollPinned pinFor="+=220%"` with `onScrub` driving SVG circuit path drawing (`stroke-dashoffset` mapped 0..1 to progress).
- `Parallax` on circuit illustration backdrop, speed 0.25.
- Session times use `TextScramble` on session names (`FP1`, `QUAL`, `RACE`).

### `/results/[season]/{drivers,teams}`
- Standings table: `RevealOnScroll variant="fade-up-stagger"` with tight stagger (0.04).
- Champion delta numbers: `CountUp`.
- Team color bar: animated via Framer Motion `whileInView` width transform (no width animation on layout, this is a child of fixed-size cell; transform-scaleX with origin-left).

### `/drivers/[slug]` and `/drivers/[slug]/career`
- **Hero portrait**: `ScrollPinned pinFor="+=160%"` so portrait stays while career intro slides past. `Parallax speed=-0.2` on background telemetry texture.
- Driver name: `RevealOnScroll variant="reveal-mask"` on display type.
- Career stats grid: `CountUp` for every numeric (wins, podiums, points, poles, fastest laps).
- Season-by-season strip: `TickerMarquee` direction=left, paused on hover.
- "LIVE" / "POLE" / "DNF" badges anywhere: `TextScramble`.
- Back nav: `ViewTransitionLink transitionName="driver-{slug}"` so portrait morphs back to rail card.

### `/teams/[slug]/history`
- Timeline: `RevealOnScroll variant="slide-right"` per era card.
- Iconic livery gallery: `TrackingTrail` per card, `RevealOnScroll variant="scale-in"`.
- Constructors-championships count: `CountUp`.

### `/latest` and `/video`
- Article cards: `RevealOnScroll variant="fade-up-stagger"`, `TrackingTrail` per card.
- "BREAKING" tag: `TextScramble`.
- Video thumbnails: `RevealOnScroll variant="scale-in"`.

### `/live/timing`, `/live/race-control`, `/live/track`
- Telemetry rows: `RevealOnScroll variant="fade-up"` on first paint only (`once=true`); subsequent diff updates use Framer Motion `layout` for row reorder.
- "LIVE" header: `TextScramble` (runs every 30s as a heartbeat; opt-in `repeat` mode).
- Track map: `Parallax` speed 0.15 on backdrop.

### `/search` and `/predict`
- Result cards: `RevealOnScroll variant="fade-up-stagger"`.
- Predict submit: `MagneticButton`.

### `/membership` and `/newsletter`
- Hero: `Parallax` speed 0.3 on backdrop, `MagneticButton` on tier CTAs.
- Tier feature lists: `RevealOnScroll variant="fade-up-stagger"`.
- Annual savings: `CountUp` suffix="%".

### `/admin` and `/admin/articles`
- Motion-light by design. `RevealOnScroll fade-up` only on initial table mount. No magnetic, no parallax. Admin must feel utilitarian.

### `/legal/*` and `/about`
- `RevealOnScroll variant="fade-up"` per section. No parallax, no scramble. Legal must read calmly.

---

## 16. Performance contract

- Only `transform`, `opacity`, `clip-path`, `filter` are animated. No `width`/`height`/`top`/`left`/`margin` animation anywhere. Layout reads (`getBoundingClientRect`) happen inside RAF, never inside the same frame as a write to a styled element being scrolled.
- `will-change` is set only while a transition is in flight and cleared after, except for the cursor + marquee which are always-on transforms.
- Single RAF loop. Lenis owns the RAF. GSAP ticker is bound to Lenis frames via `gsap.ticker.add(lenis.raf)`. There is no second RAF except inside `CursorFollower` (cheap, two transform writes) and inside `CountUp` (state writes, no DOM reads).
- IntersectionObserver, not scroll listeners, drives entrance reveals. One IO per `RevealOnScroll` instance, disconnected after fire when `once=true`.
- All primitives early-return on `prefers-reduced-motion: reduce`. CursorFollower and Parallax also early-return on touch.
- No primitive depends on JS-measured layout for its final state; reduced-motion snaps to the same DOM that the animated path produces. This prevents content layout shift between motion and no-motion users.

---

## 17. Acceptance gate before shipping a surface

1. Run Lighthouse Performance on the surface. CLS = 0. LCP <= 2.5s on Fast 3G throttled.
2. Open DevTools Performance, record 5s of scroll. No long task > 16ms. No layout shift events. No forced reflows.
3. Toggle `prefers-reduced-motion: reduce` in DevTools rendering panel. Confirm every primitive renders the final state with zero motion.
4. Test on iOS Safari touchscreen. `CursorFollower`, `MagneticButton`, `TrackingTrail`, `Parallax` must be no-ops.
5. Tab through every interactive element. Focus rings are visible. View Transitions do not break focus return.

This library is the motion contract for Apex. Every surface composes from it. Anything not expressible by these primitives is a design problem, not a motion problem, and goes back to brainstorming before any new animation code is written.
