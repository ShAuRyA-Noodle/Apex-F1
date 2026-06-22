# Mobile-first responsive spec — every breakpoint, gestures, thumb-zone

# APEX — Mobile-First Frontend Architecture Plan

A complete reorientation from "desktop site that shrinks" to "thumb-zone native that expands." This document is the implementation bible for the mobile-first wave. Every pattern is production-grade, every snippet is copy-paste ready, every decision is justified against Apple HIG, Material 3, and the reference tier (Apple, Linear, Marcello, Lusion).

The mental model shift: stop thinking "viewport." Start thinking "thumb arc, glance distance, one-handed reachability." A Pixel 6a in landscape on a commuter train is the target, not a 27-inch iMac.

---

## 1. BREAKPOINT SYSTEM

### 1.1 Token definition (Tailwind v4 @theme)

Tailwind v4 lets us define breakpoints inside `@theme` directly. Replace the current implicit breakpoint set in `apps/web/app/globals.css`:

```css
/* apps/web/app/globals.css */
@import "tailwindcss";

@theme {
  /* Breakpoints — mobile first, 360px base */
  --breakpoint-sm: 30rem;     /* 480px  large phones */
  --breakpoint-md: 48rem;     /* 768px  tablets */
  --breakpoint-lg: 64rem;     /* 1024px small laptops */
  --breakpoint-xl: 80rem;     /* 1280px desktop */
  --breakpoint-2xl: 90rem;    /* 1440px large desktop */
  --breakpoint-3xl: 100rem;   /* 1600px max content */

  /* Container queries enabled per parent */
  --container-xs: 20rem;      /* 320px */
  --container-sm: 24rem;      /* 384px */
  --container-md: 32rem;      /* 512px */
  --container-lg: 48rem;      /* 768px */
}
```

**Base styles target 360px.** Every component renders correctly with zero media query overrides at that width. Larger breakpoints add density, never reorganize critical hierarchy.

### 1.2 Fluid sizing via clamp()

Replace fixed font/spacing tokens with fluid `clamp()` so we avoid breakpoint cliffs. The formula: `clamp(min, preferred, max)` where preferred uses `vw` for viewport-relative scaling.

Convert these tokens in `packages/ui/src/tokens.ts` and mirror in `@theme`:

```css
@theme {
  /* Type scale — fluid, mobile-first floor */
  --text-display-xl: clamp(2.75rem, 6vw + 1rem, 5.25rem);     /* 44 → 84px */
  --text-display-lg: clamp(2.25rem, 5vw + 0.75rem, 4.25rem);  /* 36 → 68px */
  --text-headline-lg: clamp(1.75rem, 3vw + 0.75rem, 2.625rem);/* 28 → 42px */
  --text-headline-md: clamp(1.375rem, 2vw + 0.75rem, 2rem);   /* 22 → 32px */
  --text-title-lg: clamp(1.125rem, 1vw + 0.875rem, 1.5rem);   /* 18 → 24px */
  --text-body-lg: clamp(1.0625rem, 0.3vw + 1rem, 1.25rem);    /* 17 → 20px */
  --text-body-md: clamp(1rem, 0.25vw + 0.95rem, 1.125rem);    /* 16 → 18px */
  --text-editorial: clamp(1.5rem, 2.5vw + 0.5rem, 2rem);      /* 24 → 32px */
  --text-data-mono: clamp(0.8125rem, 0.2vw + 0.75rem, 0.875rem); /* 13 → 14px */

  /* Spacing — fluid */
  --space-safe-area: clamp(1rem, 5vw, 4rem);
  --space-grid-margin: clamp(1rem, 4vw, 4rem);
  --space-section-y: clamp(3rem, 8vw, 8rem);
}
```

**Which Tailwind utilities should swap to clamp:**

| Current utility | Replace with |
|---|---|
| `text-[84px]` on hero | `text-display-xl` (clamp) |
| `text-[42px]` on headlines | `text-headline-lg` (clamp) |
| `px-16` page padding | `px-[var(--space-safe-area)]` |
| `py-32` section spacing | `py-[var(--space-section-y)]` |
| `gap-12` major grids | `gap-[clamp(1rem,3vw,3rem)]` |
| `text-[18px]` body | `text-body-md` (clamp from 16) |
| `max-w-7xl` containers | `max-w-[min(100rem,100%-2*var(--space-safe-area))]` |

### 1.3 Container queries

Viewport queries break when components are nested in narrower parents (sidebars, cards, sheets). Container queries let a component decide its own layout based on the parent.

```css
/* RaceTicker chip — adapts to its panel, not the viewport */
@layer components {
  .race-ticker {
    container-type: inline-size;
    container-name: ticker;
  }
}

@container ticker (min-width: 24rem) {
  .race-ticker__chip {
    grid-template-columns: auto 1fr auto;
    gap: 0.75rem;
  }
}

@container ticker (min-width: 40rem) {
  .race-ticker__chip {
    grid-template-columns: auto auto 1fr auto auto;
  }
  .race-ticker__chip .lap-delta { display: inline; }
}
```

**Components that MUST use container queries (not viewport):**

- `RaceTicker` chip (lives in panels of varying widths)
- `DriverCard` (used in 1-col mobile list, 3-col tablet, 4-col desktop grid, 2-col side-rail)
- `StandingsRow` (full-width on mobile, embedded in sidebar on `/drivers/[slug]`)
- `LatestArticleCard` (1-col mobile, masonry on desktop, side-rail variant on `/`)
- `LiveTimingTableRow` (4 cols on mobile, 9 cols on landscape tablet, 14 on desktop)

Tailwind v4 has first-class `@container` support: `<div class="@container"><span class="@md:text-lg"/></div>`. Use `@xs`, `@sm`, `@md`, `@lg` modifiers freely.

### 1.4 Viewport units

| Use case | Unit | Why |
|---|---|---|
| Full-bleed hero | `100dvh` | Accounts for iOS dynamic toolbar |
| Sticky top-of-viewport heroes that should respect address-bar collapse | `100svh` | Renders at smallest viewport, no jump |
| Body min-height for layout | `100lvh` | Accounts for largest viewport |
| Aspect-locked cards | `aspect-ratio` over vh math | More predictable |

Kill every `min-h-screen` (= `100vh`). Replace with `min-h-dvh` in Tailwind v4.

---

## 2. MOBILE-NATIVE PATTERNS

### 2.1 Bottom sheet (replaces desktop modal)

Modals on mobile are an accessibility regression — they fail screen readers' focus, push controls into thumb-impossible zones, and break iOS swipe-back. Bottom sheets are the platform-native primitive.

Add the dependency: `npm i vaul` (built by the same author as Sonner, headless, accessibility-correct, 8KB gzipped).

```tsx
// apps/web/components/ui/Sheet.tsx
"use client";
import { Drawer } from "vaul";
import { useEffect } from "react";

type Snap = 0.4 | 0.7 | 1;
const SNAPS: Snap[] = [0.4, 0.7, 1];

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  initialSnap = 0.7,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
  initialSnap?: Snap;
}) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={SNAPS}
      activeSnapPoint={initialSnap}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex h-[96dvh] flex-col rounded-t-3xl bg-[var(--color-surface-container)] outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[var(--color-outline-variant)]" />
          <Drawer.Title className="px-6 pt-4 text-[var(--text-title-lg)] font-display font-bold">
            {title}
          </Drawer.Title>
          <div className="overflow-y-auto overscroll-contain px-6 pb-6 pt-3">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

Vaul handles drag-to-dismiss, snap-point physics, scroll lock, focus trap, and inert background out of the box. The grabber handle (the 1.5px pill at top) is the universal mobile cue.

**Where to use bottom sheets instead of modals:**

- `/schedule/[season]/[race]` tabs → bottom sheet on `< md`
- "Filter by team" on `/results` → sheet
- Driver quick-view from list tap → sheet at snap 0.4 (peek), drag up to 1.0 (full)
- Predict pick confirmation → sheet snap 0.4
- Newsletter signup → sheet at snap 0.4

### 2.2 Pull-to-refresh

We don't want to fight the browser's native pull-to-refresh, but for in-page lists (`/latest`, `/live/timing` constructor view, race ticker) we need a custom feedback layer because the user's intent is "refresh THIS list," not the whole document.

```tsx
// apps/web/components/ui/PullToRefresh.tsx
"use client";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useRef } from "react";

const TRIGGER = 72;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, TRIGGER], [0, 1]);
  const rotate = useTransform(y, [0, TRIGGER * 2], [0, 360]);
  const refreshing = useRef(false);

  return (
    <div
      className="relative"
      style={{ overscrollBehavior: "contain" }}
      onTouchStart={(e) => {
        if (window.scrollY > 0) return;
      }}
      onTouchMove={(e) => {
        if (window.scrollY > 0 || refreshing.current) return;
        const delta = e.touches[0].clientY - (e.currentTarget as any)._startY;
        if (delta > 0) y.set(Math.min(delta * 0.5, TRIGGER * 1.5));
      }}
      onTouchEnd={async () => {
        if (y.get() >= TRIGGER && !refreshing.current) {
          refreshing.current = true;
          navigator.vibrate?.(8);
          animate(y, TRIGGER, { duration: 0.18 });
          await onRefresh();
          refreshing.current = false;
        }
        animate(y, 0, { duration: 0.32, ease: [0.215, 0.61, 0.355, 1] });
      }}
    >
      <motion.div
        style={{ y, opacity }}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-4"
      >
        <motion.div
          style={{ rotate }}
          className="size-8 rounded-full border-2 border-[var(--color-telemetry-red)] border-t-transparent"
        />
      </motion.div>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
```

`overscroll-behavior: contain` prevents the document-level bounce from interfering. On Android Chrome, this also disables native page-reload, so we own the gesture explicitly.

### 2.3 Sticky bottom action bar

Primary CTAs belong in the thumb arc. Period.

```tsx
// apps/web/components/ui/StickyActionBar.tsx
export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/85 backdrop-blur-xl md:static md:border-0 md:bg-transparent md:backdrop-blur-none"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
        paddingTop: "0.75rem",
        paddingLeft: "max(env(safe-area-inset-left), 1rem)",
        paddingRight: "max(env(safe-area-inset-right), 1rem)",
      }}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2">{children}</div>
    </div>
  );
}
```

Used on `/predict` (save pick), `/membership` (subscribe), `/newsletter` (sign up), `/drivers/[slug]` (follow).

Crucial detail: the `max()` around `env(safe-area-inset-bottom)` ensures we have padding even on devices without a safe-area inset (e.g., Android phones), so the touch target isn't flush against screen edge.

### 2.4 Swipe-back navigation

iOS Safari already gives swipe-back for free from the left edge of the screen. Android Chrome 113+ also supports it via `overscroll-behavior-x: auto` on the document. We should respect both natively and add a visual hint.

```tsx
// apps/web/components/nav/EdgeHint.tsx — on nested routes
export function EdgeHint() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white/[0.03] to-transparent md:hidden"
    />
  );
}
```

For routes that should expose an EXPLICIT back button (deep nested like `/drivers/[slug]/career`), pair with a top-left back chevron that's 48×48px:

```tsx
<Link
  href="/drivers"
  aria-label="Back"
  className="inline-flex size-12 items-center justify-center -ml-3"
>
  <span className="material-symbols-outlined text-[28px]">arrow_back_ios_new</span>
</Link>
```

### 2.5 Bottom tab bar

The most thumb-reachable nav primitive ever invented. Replaces the top nav on `< md`.

```tsx
// apps/web/components/nav/MobileTabBar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  { href: "/", icon: "home", label: "Home" },
  { href: "/schedule", icon: "event", label: "Race" },
  { href: "/drivers", icon: "sports_motorsports", label: "Drivers" },
  { href: "/latest", icon: "bolt", label: "Latest" },
  { href: "/more", icon: "menu", label: "More" },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const active = TABS.findIndex(
    (t) => t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-outline-variant)]/70 bg-[var(--color-bg)]/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.25rem)" }}
      aria-label="Primary"
    >
      <ul className="relative mx-auto grid max-w-md grid-cols-5">
        {TABS.map((t, i) => {
          const isActive = i === active;
          return (
            <li key={t.href} className="relative">
              <Link
                href={t.href}
                className="flex h-14 flex-col items-center justify-center gap-0.5"
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={`material-symbols-outlined text-[24px] transition-colors ${
                    isActive ? "text-[var(--color-telemetry-red)]" : "text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  {t.icon}
                </span>
                <span
                  className={`text-[11px] font-medium tracking-wide transition-colors ${
                    isActive ? "text-[var(--color-on-background)]" : "text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  {t.label}
                </span>
              </Link>
              {isActive && (
                <motion.div
                  layoutId="tabbar-active"
                  className="absolute inset-x-4 top-0 h-0.5 bg-[var(--color-telemetry-red)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

Framer Motion's `layoutId` gives us free shared-element animation between tabs.

### 2.6 Floating quick action button (FAB)

Lower-right, single-thumb reach, opens a radial menu of high-intent shortcuts: "Predict next race," "Set alert," "Live timing."

```tsx
// apps/web/components/nav/QuickActionFAB.tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const ACTIONS = [
  { href: "/predict", icon: "online_prediction", label: "Predict" },
  { href: "/live/timing", icon: "speed", label: "Live" },
  { href: "/newsletter", icon: "notifications", label: "Alerts" },
];

export function QuickActionFAB() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="fixed bottom-20 right-4 z-30 md:hidden"
      style={{
        bottom: `calc(env(safe-area-inset-bottom) + 5rem)`,
        right: `max(env(safe-area-inset-right), 1rem)`,
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-16 right-0 flex flex-col gap-3"
          >
            {ACTIONS.map((a, i) => (
              <motion.li
                key={a.href}
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.9 }}
                transition={{ delay: i * 0.04, ease: [0.215, 0.61, 0.355, 1] }}
              >
                <Link
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center gap-3 rounded-full bg-[var(--color-surface-container)] pl-4 pr-5 shadow-xl ring-1 ring-white/5"
                >
                  <span className="material-symbols-outlined text-[var(--color-telemetry-red)]">
                    {a.icon}
                  </span>
                  <span className="text-sm font-medium">{a.label}</span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => {
          setOpen((o) => !o);
          navigator.vibrate?.(6);
        }}
        whileTap={{ scale: 0.92 }}
        animate={{ rotate: open ? 45 : 0 }}
        className="flex size-14 items-center justify-center rounded-full bg-[var(--color-telemetry-red)] text-white shadow-2xl shadow-[var(--color-telemetry-red)]/30"
        aria-label="Quick actions"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </motion.button>
    </div>
  );
}
```

### 2.7 Haptic feedback

```ts
// apps/web/lib/haptics.ts
export const haptic = {
  light: () => navigator.vibrate?.(6),
  medium: () => navigator.vibrate?.(12),
  heavy: () => navigator.vibrate?.([20, 8, 20]),
  success: () => navigator.vibrate?.([12, 40, 12]),
  warn: () => navigator.vibrate?.([40, 20, 40, 20, 40]),
};
```

**Hook to these moments:**
- Race start countdown reaching `0` → `haptic.heavy()`
- Predict pick saved → `haptic.success()`
- Pull-to-refresh trigger threshold reached → `haptic.light()`
- Swipe-back gesture committed → `haptic.light()`
- Sheet snap-point reached → `haptic.light()`
- Failed login or rate-limited request → `haptic.warn()`

iOS Safari does NOT support Vibration API (Apple decision). The optional chaining ensures graceful degradation. For iOS, the visual feedback alone must carry — never depend on haptic for critical state communication.

---

## 3. TOUCH TARGET AUDIT

### 3.1 The minimums

- Apple HIG: 44pt × 44pt
- Material 3: 48dp × 48dp
- WCAG 2.5.5 (AAA): 44 CSS pixels minimum
- Recommended Apex default: **48px** (= 3rem at 16px root, satisfies both)

### 3.2 Audit findings (current Apex)

| Component | Current | Issue | Fix |
|---|---|---|---|
| Header nav links | ~36px h | Too small for thumb | Wrap in `min-h-12 px-3 -mx-3 inline-flex items-center` |
| `Button` variant default | h-9 (36px) | Mobile fails | Bump base to h-12, add `mobile:h-14` variant |
| Article card "Read more" | inline text link | No hit area | Make entire card a Link with `block` |
| Driver list row | h-10 | Borderline | Bump to h-16, full-width tap |
| Table row in `/results` | h-9 cell | Hard to tap row | Make `<tr>` the tap target, h-14 min |
| Predict +/- steppers | size-8 (32px) | Fails | size-12, gap-3 between pair |
| Tab pills on race page | h-8 | Fails | h-11, px-4 |
| Pagination arrows | size-9 | Borderline | size-12, gap-2 |
| Search input clear (×) | size-6 | Fails | size-11, hit-area extended |

### 3.3 Spacing between targets

Adjacent tap targets need ≥ 8px gap. The cheapest way to enforce: `gap-2` minimum (Tailwind = 0.5rem = 8px) on all flex/grid containers that hold tappable elements.

For dense tables on mobile (live timing), we use the **whole row as one target + secondary action exposed via long-press**, rather than trying to cram multiple targets into one row.

### 3.4 Table-row-to-card transformation

Tables are a desktop affordance. On mobile they fail catastrophically. The transformation:

```tsx
// apps/web/components/results/DriverStandingRow.tsx
export function DriverStandingRow({ driver, isMobile }: Props) {
  if (isMobile) {
    return (
      <Link
        href={`/drivers/${driver.slug}`}
        className="flex min-h-16 items-center gap-4 px-4 py-3 -mx-4 active:bg-white/[0.03]"
        onContextMenu={(e) => {
          e.preventDefault();
          // open long-press quick actions
        }}
      >
        <span className="font-mono tabular-nums text-2xl font-bold w-8 text-[var(--color-on-surface-variant)]">
          {driver.position}
        </span>
        <Flag code={driver.country} className="size-6 rounded-sm" />
        <div className="flex-1 min-w-0">
          <div className="truncate font-display font-bold">{driver.name}</div>
          <div className="truncate text-xs text-[var(--color-on-surface-variant)]">
            {driver.team}
          </div>
        </div>
        <span className="font-mono tabular-nums font-bold text-[var(--color-telemetry-red)]">
          {driver.points}
        </span>
      </Link>
    );
  }
  // ...desktop table-row variant
}
```

`-mx-4` is critical: extends the tap target to the screen edge, removes the perceptual "wall" of a narrow tap zone.

---

## 4. TYPOGRAPHY MOBILE FIRST

### 4.1 Body type minimums

Apple HIG body = 17pt (= 17px at default zoom). Material 3 body-large = 16sp but Material 3's research is desktop-biased. Going to **17px floor** and clamping up to 20px on wide screens via the fluid `--text-body-md` token above.

### 4.2 The 18px rule for thin weights

`EB Garamond 300` is used for editorial pulls. Garamond at 300 weight below 18px becomes unreadable on a 1x density display (Android budget phones). Rule: any `font-weight: 300` declaration must be paired with a size ≥ 18px.

```css
/* Enforced at the @layer base level */
@layer base {
  :where(.font-editorial, [class*="text-editorial"]) {
    font-weight: 300;
    font-size: max(1.125rem, var(--text-editorial));
  }
}
```

### 4.3 Line-height & measure

```css
@layer base {
  :where(p, li, blockquote) {
    line-height: 1.6;
    max-width: 70ch;
  }
  :where(.font-display, h1, h2, h3) {
    line-height: 1.05;
    text-wrap: balance;  /* prevent ugly orphans */
    letter-spacing: -0.02em;
  }
  :where(.font-data, .font-mono) {
    line-height: 1.4;
    font-variant-numeric: tabular-nums;
  }
}
```

`text-wrap: balance` is supported in Chrome 114+, Safari 17.5+. It eliminates the "single word on last line" headline ugliness with zero JS.

### 4.4 Font loading strategy

```tsx
// apps/web/app/layout.tsx
import localFont from "next/font/local";

const anybody = localFont({
  src: [
    { path: "../public/fonts/Anybody-Bold.woff2", weight: "700" },
    { path: "../public/fonts/Anybody-ExtraBold.woff2", weight: "800" },
  ],
  variable: "--font-display",
  display: "swap",       // FOUT not FOIT — show fallback immediately
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
  preload: true,
  adjustFontFallback: "Arial",  // metric-matched fallback prevents CLS
});

const hanken = localFont({
  src: "../public/fonts/HankenGrotesk-Variable.woff2",
  variable: "--font-body",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

// EB Garamond — editorial only, not on every page
const garamond = localFont({
  src: "../public/fonts/EBGaramond-Light.woff2",
  variable: "--font-editorial",
  display: "optional",   // skip if not ready within 100ms — editorial is non-critical
  preload: false,
});

const mono = localFont({
  src: "../public/fonts/JetBrainsMono-Medium.woff2",
  variable: "--font-mono",
  display: "swap",
  preload: true,
});
```

`display: swap` for primary fonts (display + body) — render fallback instantly, swap when ready. `display: optional` for editorial — if it's not in cache within 100ms, don't bother (avoids late shift on slow connections). `adjustFontFallback` uses Next.js's metric-matching to make Arial visually match the actual font, eliminating CLS.

---

## 5. THUMB-ZONE OPTIMIZATION

### 5.1 The map

On a 6.1" phone held one-handed (right thumb dominant):

- **Easy zone** (bottom 33%, center-right): primary CTAs, tab bar, FAB
- **Stretch zone** (middle 33%): secondary CTAs, scroll content
- **Hard zone** (top 33%): branding, breadcrumbs, settings (rare actions)

### 5.2 The rule changes

| Element | Desktop home | Mobile home |
|---|---|---|
| Logo | top-left, large | top-center small, just for brand recall |
| Primary nav | top horizontal | bottom tab bar |
| Search | top-right | dedicated /search route accessed via tab |
| "Subscribe" CTA | top-right header pill | sticky bottom bar on key pages |
| Hero "Watch" / "Predict" CTA | inline below H1 | sticky-floats above tab bar |
| Account | top-right avatar | nested in "More" tab |
| Live timing toggle | top-right | bottom FAB radial |

### 5.3 The inversion mindset

When designing a new component, mentally start from the bottom:

1. What's the ONE primary action? Place at bottom, full-width on mobile.
2. What's the secondary content (info)? Stack above the action, scrollable.
3. What's the context (header, breadcrumbs)? Top, smallest priority on mobile.

This inverts the typical "design at 1440px first" approach. Start at 360 × 800px, design bottom-up.

---

## 6. PAGE-BY-PAGE MOBILE REDESIGN BRIEFS

### 6.1 `/` Homepage

**Current problems:** Hero copy too dense, hero "rail" of scrolling thumbnails fights with vertical scroll, 10-section stack overwhelms.

**Mobile redesign:**

- Hero H1: `text-display-lg` (clamp 36-68px), 2 lines max
- Hero subhead: `text-body-lg`, 2 lines max, max-width 32ch
- Single primary CTA "See this weekend" — sticky bottom bar appears after hero scrolls 80% out
- Kill the horizontal hero rail (it competes with vertical thumb scroll). Replace with one large editorial card pinned below the hero
- Standings preview: collapse from 10-row table → top-3 driver cards + "See full standings" link → expand into accordion on tap
- Latest news section: vertical full-width cards, 1-col, never grid on mobile
- Section spacing: `py-[var(--space-section-y)]` (clamps 48-128px)
- Add `<MobileTabBar />` and remove top horizontal nav at `< md`

```tsx
// Hero condensed mobile-first
<section className="relative min-h-[80dvh] flex flex-col justify-end pb-24 pt-12 px-[var(--space-safe-area)]">
  <h1 className="font-display font-extrabold tracking-tight text-display-lg leading-[0.95]">
    Race weekend, decoded.
  </h1>
  <p className="mt-4 text-body-lg text-[var(--color-on-surface-variant)] max-w-[32ch]">
    Live timing, telemetry and editorial · independently built by fans, for fans.
  </p>
</section>
```

### 6.2 `/schedule`

- 2-col grid → vertical timeline with center axis, race cards alternating sides on `md+`
- Sticky "Next race" card at top via `position: sticky; top: 0; z: 10`
- Each race row shows: round number (top-left, monospace), country flag (large), GP name, date range, circuit icon
- Tap → bottom sheet preview with "Open race" button → `/schedule/[season]/[race]`
- Past races greyed but still tappable (full results inside)

### 6.3 `/schedule/[season]/[race]`

- Tabs (Overview / Practice / Qualifying / Race) become a bottom sheet trigger on `< md`. Default state shows Overview; tap "View Race" floating chip → sheet opens with tab content
- Results table → vertical accordion per driver row. Header row: position + name + points. Expand reveals: time gap, fastest lap, status, pit stops
- Telemetry charts: horizontal scroll within a `<div>` (touch-friendly), with snap points per chart

### 6.4 `/results/[season]/drivers`

Mobile strip-down to 3 columns: position / driver / points. Tap row → bottom sheet with full row data (wins, podiums, fastest laps, DNFs). Search/filter accessible via FAB.

### 6.5 `/drivers`

- Switch 2-col grid → single-col list
- Full-width cards (`-mx-[var(--space-safe-area)]`) with helmet image at left (size-20) + name + team + number
- Skeleton loaders during fetch
- Pull-to-refresh enabled

### 6.6 `/drivers/[slug]`

- Top half of screen (`50dvh`): giant car-number rendered in display font (clamp 120-220px), driver name beneath
- Below: stats accordion — Championships / Wins / Podiums / Poles / Fastest Laps. Tap each → expand for breakdown
- "Career" link → swipe-back chevron up top, navigates to `/drivers/[slug]/career`
- Sticky bottom action bar: "Follow driver" (saves to localStorage initially, full auth later)

### 6.7 `/live/timing`

The hardest page on mobile. 9-column data table.

- **Portrait phones < md:** show landscape-prompt overlay with rotation icon, allow "Use anyway" → enters condensed mode
- **Condensed mode (4 cols):** Position / Code / Gap / Tyre. Tap row → bottom sheet with full data (sector times, last lap, top speed, pit count)
- **Landscape phones:** rotate to 9-col view, sticky pos+code columns, scrollable rest
- Auto-update animations via Framer Motion `layout` prop for position swaps — visual diffing communicates change

### 6.8 `/latest` & `/video`

- Infinite scroll on mobile using `IntersectionObserver` + cursor-based pagination
- Single-column 1-up cards on mobile
- Switch to masonry (CSS columns) on `md+`
- Pull-to-refresh enabled
- Each card: full-bleed image (16:9), title `text-title-lg` on top, source pill + date below
- Tap entire card → article page

### 6.9 `/predict`

- Single-column form, every input full-width
- `<select>` becomes a bottom sheet picker (custom)
- "+/-" steppers are size-12 with 16px gap
- Sticky bottom save bar with disabled state until form valid
- Haptic success on save

---

## 7. iOS / ANDROID QUIRKS

### 7.1 Safe area handling

```css
@layer base {
  :root {
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    --safe-right: env(safe-area-inset-right, 0px);
  }

  body {
    padding-top: var(--safe-top);
  }
}
```

Apply `viewport-fit=cover` in the metadata so iOS extends content under the notch and we control the inset:

```tsx
// apps/web/app/layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141313",
};
```

### 7.2 iOS 100vh bug & Android Chrome resize

- Replace every `100vh` with `100dvh`
- For "snap-to-viewport" elements that shouldn't jump when the URL bar shows/hides: `100svh`
- For full-document min-height: `100lvh`

### 7.3 iOS bounce vs Android momentum

iOS rubber-band bounce at scroll boundaries is beloved and should NOT be disabled on the document. But on sheets, drawers, and pull-to-refresh containers we WANT to contain it:

```css
.sheet-content { overscroll-behavior: contain; }
.body-no-bounce { overscroll-behavior-y: none; }  /* rare, e.g. live timing */
```

### 7.4 Tap delay

Eliminate the 300ms touch-action delay (still present in some legacy mobile browsers):

```css
@layer base {
  :where(button, a, [role="button"], [role="link"]) {
    touch-action: manipulation;
  }
}
```

### 7.5 Disabling pull-to-refresh selectively

On `/live/timing` we don't want native page reload because the user is monitoring data. On other pages we DO want it. Per-route:

```tsx
// In /live/timing layout
useEffect(() => {
  document.body.style.overscrollBehaviorY = "none";
  return () => { document.body.style.overscrollBehaviorY = ""; };
}, []);
```

### 7.6 Form field zoom (iOS Safari)

iOS zooms in if input font-size is < 16px. Solution: enforce minimum 16px on inputs:

```css
@layer base {
  :where(input, textarea, select) {
    font-size: max(1rem, var(--text-body-md));
  }
}
```

---

## 8. PERFORMANCE ON MID-TIER ANDROID

Targets: Pixel 6a, Galaxy A52, Moto G Stylus. Lighthouse mobile (slow 4G + 4x CPU throttle).

### 8.1 LCP image budget

Homepage hero image ≤ 60KB gzipped.

```tsx
import Image from "next/image";

<Image
  src="/hero/race-night.avif"
  alt=""
  fill
  priority
  fetchPriority="high"
  sizes="(max-width: 768px) 100vw, 100vw"
  quality={72}
  className="object-cover"
/>
```

Use AVIF (Next.js generates by default). Tune `quality={72}` for hero, `quality={65}` for cards. Use `priority` only on LCP image. Confirm via `npm run build` output and Lighthouse.

### 8.2 Lazy-load below-fold

Default `<Image>` is lazy-loaded. Confirm we're not setting `priority` accidentally.

### 8.3 Conditional Lenis & GSAP on touch

Lenis fights native momentum on touch devices and burns CPU.

```tsx
// apps/web/components/motion/MotionProvider.tsx
"use client";
import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isTouch = matchMedia("(hover: none) and (pointer: coarse)").matches;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reduced) return;  // native scroll on touch

    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => { lenis.destroy(); };
  }, []);

  return <>{children}</>;
}
```

For GSAP ScrollTrigger: same guard. Use `gsap.matchMedia()`:

```tsx
useEffect(() => {
  const mm = gsap.matchMedia();
  mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
    // desktop animations only
    ScrollTrigger.create({ /* ... */ });
  });
  mm.add("(max-width: 767px)", () => {
    // simpler mobile: opacity-only reveals, no pinning
  });
  return () => mm.revert();
}, []);
```

### 8.4 JS budget

Target: < 180KB gzipped on homepage. Audit via `next build`. Concrete steps:

- Code-split Framer Motion: only import `motion`, not the kitchen sink
- Dynamic import for `vaul`, `embla-carousel`, GSAP plugins
- Tree-shake Lenis on touch (don't even load on mobile via dynamic import)
- Move admin routes to a separate route group, never bundled into public routes

```tsx
const Sheet = dynamic(() => import("@/components/ui/Sheet").then(m => m.Sheet), {
  ssr: false,
  loading: () => null,
});
```

### 8.5 React Server Components leverage

Every page that doesn't need interactivity stays RSC. Client components only at interaction leaves (Sheet trigger, FAB, tab bar active state, live timing updates). This dramatically reduces shipped JS.

---

## 9. GESTURE SUPPORT

### 9.1 Swipe between race rounds on `/schedule`

Use Embla Carousel (4KB gzipped, momentum-feel, accessibility-correct).

```tsx
"use client";
import useEmblaCarousel from "embla-carousel-react";

export function RaceSwiper({ races }: { races: Race[] }) {
  const [ref] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  return (
    <div ref={ref} className="overflow-hidden">
      <div className="flex gap-3 px-[var(--space-safe-area)]">
        {races.map(r => (
          <article key={r.id} className="flex-[0_0_88%] sm:flex-[0_0_60%] md:flex-[0_0_40%]">
            {/* card */}
          </article>
        ))}
      </div>
    </div>
  );
}
```

### 9.2 Swipe between driver/constructor tabs on `/results`

Same Embla pattern but linked to a tab control. Tapping a tab scrolls the carousel to that index; swiping the carousel updates the active tab.

### 9.3 Long-press driver card

```tsx
function useLongPress(callback: () => void, ms = 500) {
  const timer = useRef<number | null>(null);
  return {
    onTouchStart: () => { timer.current = window.setTimeout(() => { navigator.vibrate?.(12); callback(); }, ms); },
    onTouchEnd: () => { if (timer.current) clearTimeout(timer.current); },
    onTouchMove: () => { if (timer.current) clearTimeout(timer.current); },
    onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); callback(); },
  };
}
```

Opens a bottom sheet with: "Follow driver," "Share," "View career," "Compare."

### 9.4 Pinch-zoom in image lightbox

Use `react-zoom-pan-pinch` or implement directly via the Pointer Events API tracking two pointers and computing scale from distance ratio. Keep it scoped to the lightbox so the rest of the page doesn't fight viewport zoom.

In `<head>`: allow user zoom by NOT setting `maximum-scale=1` — accessibility requires it.

---

## 10. TESTING PROTOCOL

### 10.1 Physical devices

- iPhone SE 3rd gen (375 × 667, smallest current iOS)
- iPhone 15 Pro (393 × 852, with Dynamic Island)
- Pixel 6a (412 × 915, mid-tier Android baseline)
- Galaxy A52 (414 × 915, slow GPU baseline)
- iPad Mini 6 (768 × 1024, smallest current iPad)
- iPad Pro 11 (834 × 1194, landscape testing)

### 10.2 DevTools emulations

In Chrome DevTools → Device Mode:

- "Mobile S" 360 × 640 — smallest realistic
- iPhone SE — Apple smallest
- Pixel 7 — Android medium
- iPhone 14 Pro Max — Apple largest single-hand
- Galaxy Z Fold 5 unfolded — tablet-like phone
- iPad Mini — small tablet
- Surface Pro 7 — hybrid

### 10.3 Throttling profiles

- Lighthouse mobile default: slow 4G + 4x CPU
- Test slow connection: custom "3G mid" 1.6 Mbps down / 750ms RTT
- Test offline → service-worker fallback (Phase 4)

### 10.4 Lighthouse mobile targets

| Metric | Target |
|---|---|
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| SEO | ≥ 95 |
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.05 |
| TBT | < 200ms |

### 10.5 Real-device debugging

- **iOS:** Safari → Preferences → Advanced → "Show Develop menu." On iPhone: Settings → Safari → Advanced → Web Inspector. Plug in via cable, open Safari on Mac → Develop → [iPhone name] → page name.
- **Android:** Chrome on Android → Settings → Developer options → USB debugging. On desktop Chrome: `chrome://inspect/#devices` → inspect remote tabs.
- Test orientations: lock to portrait, rotate to landscape, watch for layout breaks (especially `/live/timing`).
- Test with VoiceOver (iOS) and TalkBack (Android) for accessibility regression.

### 10.6 Automated regression

Add Playwright mobile suite:

```ts
// tests/mobile.spec.ts
import { test, expect, devices } from "@playwright/test";

test.use({ ...devices["Pixel 7"] });

test("homepage tab bar visible on mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
});

test("schedule swipe carousel", async ({ page }) => {
  await page.goto("/schedule");
  // gesture testing
});
```

Run in CI on every PR with `--project=mobile-chrome --project=mobile-safari`.

---

## SUMMARY OF DELIVERABLES TO SHIP

1. New `apps/web/app/globals.css` `@theme` block with fluid clamps and breakpoint tokens
2. New `apps/web/components/ui/Sheet.tsx` (vaul-based)
3. New `apps/web/components/ui/PullToRefresh.tsx`
4. New `apps/web/components/ui/StickyActionBar.tsx`
5. New `apps/web/components/nav/MobileTabBar.tsx`
6. New `apps/web/components/nav/QuickActionFAB.tsx`
7. New `apps/web/components/nav/EdgeHint.tsx`
8. New `apps/web/lib/haptics.ts`
9. Refactor `apps/web/components/motion/MotionProvider.tsx` to gate Lenis on `(hover: hover)` and respect `prefers-reduced-motion`
10. Page-by-page mobile variants for `/`, `/schedule`, `/results`, `/drivers`, `/drivers/[slug]`, `/live/timing`, `/latest`, `/video`, `/predict`
11. Touch-target sweep across all `Button`, `Link`, table-row, stepper components
12. Font loading update in `apps/web/app/layout.tsx` (display strategy + adjustFontFallback)
13. Add Playwright mobile project to `playwright.config.ts`
14. Lighthouse CI step in build pipeline asserting mobile budget

Critical files to read before implementation: `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `packages/ui/src/tokens.ts`, `apps/web/components/motion/MotionProvider.tsx`, every page route under `apps/web/app/` for current layout patterns.

The shift in mindset is the whole game: Apex stops being a website that happens to work on phones, and becomes a thumb-native platform that happens to scale up beautifully on desktop. Every component decision flows from there.
