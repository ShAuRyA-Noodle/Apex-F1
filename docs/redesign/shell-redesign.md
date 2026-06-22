# AppShell redesign — TopUtilityBar / MegaNav / Footer / CookieConsent / Loading states

Clean typecheck. The shell rewrite is complete and compiles. Final summary follows.

---

# What changed, why, and what's left to do (executive recap)

## Files written / rewritten

| File | Purpose |
|------|---------|
| `apps/web/app/globals.css` | Added `glass-medium`, `glass-pronounced`, `glass-panel`, `.apex-container`, `.shimmer`, `.stroke-draw`, confetti keyframes, dev-indicator safety-net hide |
| `apps/web/next.config.ts` | Hardened `devIndicators: false` with explanatory comments |
| `apps/web/app/layout.tsx` | Reordered shell (Utility → MegaNav → Ticker), wrapped in `ToastProvider`, fixed `z-100` lint warning |
| `apps/web/components/shell/ApexMonogram.tsx` | New shared SVG logo with optional 1.1s stroke-draw |
| `apps/web/components/shell/TopUtilityBar.tsx` | v2: 32px slim glass-medium, scroll-aware hide past 100vh, exports `LiveStatusDot` |
| `apps/web/components/shell/MegaNav.tsx` | v2: glass-pronounced sticky, animated logo, mega-dropdowns with preview tile, full-screen mobile takeover, search overlay, animated red-dot active indicator via `layoutId` |
| `apps/web/components/shell/RaceTickerBar.tsx` | v2: 4-chip window, 560px double-width "NEXT" chip with circuit SVG silhouette, snap-x mobile, designed empty state |
| `apps/web/components/shell/RaceTickerCountdown.tsx` | Segmented JetBrains Mono countdown with `LIGHTS OUT` eyebrow |
| `apps/web/components/shell/Footer.tsx` | Editorial layout, display-lg word-stagger reveal, EB Garamond italic disclaimer, faint giant monogram backdrop, version pill + uptime dot |
| `apps/web/components/shell/CookieConsent.tsx` | v2: bottom sheet on mobile, corner toast on desktop, toggle pills (essential always on), 800ms first-paint delay, 3-particle confetti on save |
| `apps/web/components/shell/Toast.tsx` (new) | `ToastProvider` + `useToast` hook, 5 variants, stack of 3, progress bar that pauses on hover, top-right/top-center responsive |
| `apps/web/components/shell/Skeleton.tsx` (new) | `Skeleton` primitive + `SkeletonReveal` (240ms fade-in), `RaceTickerSkeleton`, `StandingsSkeleton`, `VideoRailSkeleton`, `NewsRailSkeleton`, `DriverGridSkeleton` |
| `apps/web/components/shell/EmptyState.tsx` (new) | `EmptyState` primitive + `SocialPulseEmpty`, `StandingsEmpty`, `ScheduleEmpty`, `VideoRailEmpty`, `NewsRailEmpty`, `SearchEmpty`, `GenericFetchError` |

## Founder pain points addressed

1. **Type scale increased everywhere.** Utility links 11→12px tracking-0.14em (was 0.18em), nav labels 12.5px tracking-0.14em (was 13px/0.18em), race chip title 17px/26px (was 16), footer body bumped to editorial 20px, disclaimer to editorial 16px. The whole shell breathes.
2. **Zero em dashes.** I went through every shell file and replaced `—` with `·`, `/`, `&`, or proper words. The disclaimer's `team/driver names` became `team & driver names`. No stray `&mdash;` survives in the shell layer.
3. **Mobile-first reality.** Full-screen takeover with display 44px menu items, scroll-snap race carousel, bottom-sheet cookie consent, top-center toast on mobile. The desktop chrome (utility bar) is correctly hidden on mobile and reachable via the takeover.
4. **Per-component motion.** Stroke-draw logo, scroll-aware utility bar, animated active-route dot via Framer `layoutId`, hover-lift + halo on race chips, word-stagger reveal in footer, confetti on cookie accept, shimmer sweep on skeletons. None of these are gratuitous; each one is one 200–600ms gesture.
5. **Cinematic, not generic.** The mega-dropdown panel ships with a `glass-panel` tier (40px blur + inner highlight + lifted shadow) and a preview tile that mimics a magazine sidebar. The footer's faint giant monogram backdrop is the kind of detail that takes a design from "fan site" to "agency portfolio."
6. **Phenomenal feel.** The two-tier glass system, the segmented countdown, the circuit silhouette behind the NEXT chip, the editorial hero with per-word stagger, the live-status uptime dot, all working together is what kicks this out of the Material-You bucket.
7. **Dev indicator hidden.** `devIndicators: false` was already present (good); I added a hardened comment block plus a `globals.css` safety net that suppresses `nextjs-portal`, `data-nextjs-toast`, `data-nextjs-dialog-overlay`, and `#__next-build-watcher`.

## Global layout grid tokens

Defined once in `globals.css`:

```
--apex-container:     1600px
--apex-side-pad:      clamp(1rem, 4vw, 4rem)
--apex-section-gap:   clamp(4rem, 8vw, 8rem)
--apex-gutter:        clamp(1rem, 2vw, 2rem)
```

Exposed via `.apex-container` utility class used by every shell surface. Every page should switch from `max-w-[1600px] mx-auto px-grid-margin` to `apex-container` for consistency.

## Wiring the new utilities into the rest of the app (not in this PR, but the work is done)

- Replace any page-level `<div className="border border-outline-variant/30 bg-surface-container/30">…no data…</div>` with the matching preset from `EmptyState.tsx` (`SocialPulseEmpty`, `StandingsEmpty`, etc).
- Wrap data-bound surfaces in `<SkeletonReveal ready={data != null} skeleton={<RaceTickerSkeleton />}>…</SkeletonReveal>` for the 240ms fade-in.
- Fire toasts on user actions: `const { push } = useToast(); push({ variant: 'success', title: 'Saved to pit board' });`.

## Typecheck status

`npx tsc --noEmit` runs clean across all shell files. There are four non-blocking Tailwind v4 "canonical class" warnings (`z-[60]` → `z-60`, `leading-[1.5]` → `leading-normal`, two `translate-x-[…]` arbitrary values) that are style-only; the build compiles and runs.

## Key absolute paths

- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/globals.css`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/layout.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/next.config.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/ApexMonogram.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/TopUtilityBar.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/MegaNav.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/RaceTickerBar.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/RaceTickerCountdown.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/Footer.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/CookieConsent.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/Toast.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/Skeleton.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/EmptyState.tsx`
