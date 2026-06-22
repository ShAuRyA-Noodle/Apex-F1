# Design System v2 — tokens, type scale, glass surfaces, motion

# Apex Design System v2 — Token Architecture

**Author:** Senior Design System Architect
**Status:** Production-ready, paste-direct
**Targets:** `packages/ui/src/tokens.ts` + `apps/web/app/globals.css`
**Rationale length:** ~4,200 words. Code blocks at bottom.

---

## 0. Operating principles before we touch a single value

Apex v1 shipped fast. Five build waves, 30+ routes, live data, all SSR. The shipped tokens were adequate for proving the spine but **conservative**: type was sized for utility, not theatre; glass was absent; motion was a four-tuple list without grammar; spacing leaned on three constants. v2 is the upgrade pass.

Three rules govern every decision below:

1. **Tokens are contracts, not preferences.** Anything a component reaches for must be a named token. No raw hexes in JSX. No `text-[19px]`. No `duration-[420ms]`. If it isn't in this file, it doesn't exist.
2. **Mobile-first means clamp-first.** Every type, spacing, and radius value that scales should be authored as `clamp(min, fluid, max)` with the **min** sized for a 375px viewport. Desktop hero values are the ceiling, not the baseline.
3. **Material-You dark spine stays.** v2 extends it; we don't fork it. Brand-red stays sovereign. Gold, flag colors, and glass surfaces layer on top.

The founder complaints map cleanly onto this work:

| Pain | v2 mechanism |
|------|---|
| "Fonts too small" | Section 1 — perfect-fourth scale (1.333) with raised floors |
| "No em dashes" | Section 7 — substitution matrix + lint pass |
| "Mobile-first" | Section 5 — base unit + clamp + thumb-zone constant |
| "Glass everywhere" | Section 3 — three-tier blur system, performance disciplined |
| "Marcello / Apple tier" | Section 4 — cinematic motion grammar with spring presets |

---

## 1. Type scale — bigger and bolder

### Why 1.333 (perfect fourth)

v1 used an implicit ~1.2 ratio (84 → 56 → 42 → 32 → 22). That ratio works for utility dashboards and SaaS marketing pages, but it compresses the top end. Apex is editorial and cinematic. Marcello Policarpo's site, Lusion, Igloo, the Apple AirPods Max product page — all use ratios closer to **1.333 (perfect fourth)** or even **1.414 (augmented fourth)** at the top of the scale, with body sizes at the **larger end** of the readable range (18–22px).

I chose perfect fourth (1.333) because:
- It produces **dramatic** display sizes (96–140px) without exploding the rest of the scale into unreadable jumps.
- It gives **clean integer-ish rem values** when anchored at 1rem = 16px.
- It hits the editorial sweet spot that EB Garamond at 300 weight needs: large enough that the thin strokes don't disappear on retina displays.

### Why clamp() for everything fluid

A single fixed desktop number ("display-xl = 84px") forces a media-query waterfall that will bite us as soon as we add a tablet breakpoint or someone resizes. `clamp(min, fluid, max)` is **declarative responsive typography** — one value, three behaviors:

```
clamp(MIN, PREFERRED, MAX)
       ↑       ↑         ↑
   375px   viewport-     1440px+
   floor   linear        ceiling
```

The fluid middle term is authored as `Xrem + Yvw` so it scales linearly with viewport width between the breakpoints. This is the same technique Linear, Vercel, and the Apple marketing team use.

### The scale, with rationale per step

| Token | Min | Max | Usage | Why this floor |
|-------|-----|-----|---|---|
| `display-xxl` | **6.5rem (104px)** | **9rem (144px)** | Hero-only. Homepage above-the-fold, race-weekend countdown. | At 104px Anybody 800 reads as **architecture**, not text. We want one of these per page, max. |
| `display-xl` | **4rem (64px)** | **6rem (96px)** | Page titles. `/drivers`, `/teams`, `/schedule` headers. | 64px is the smallest size where Anybody 800 still feels editorial on mobile; below this it looks like a heavy nav link. |
| `display-lg` | **3rem (48px)** | **4.5rem (72px)** | Section heroes within a page. Race-result banners, driver-profile-name overlay. | Sits one full step below page-title; preserves visual hierarchy when stacked. |
| `headline-xl` | **2.25rem (36px)** | **3.25rem (52px)** | Major H2s — "Latest Results", "Upcoming Races", "Constructor Standings". | Founder complaint #1 lives here. v1 was 42px desktop **only**; mobile fell to ~26px. New floor is 36px on mobile. |
| `headline-lg` | **1.75rem (28px)** | **2.5rem (40px)** | Article headlines, card titles in editorial grids, modal titles. | Replaces v1's 24px-default H3. The +4px floor is what makes copy feel "premium" instead of "blog template". |
| `headline-md` | **1.25rem (20px)** | **1.625rem (26px)** | Compact card titles, sidebar headings, nav section labels. | Lowest size where Anybody 700 still reads as a heading, not body. |
| `body-xl` | **1.25rem (20px)** | **1.5rem (24px)** | Lede paragraphs, article intros, hero subheads. | This is the founder's "make body bigger" target. 20px on mobile, 24px on desktop = **Medium-tier** editorial body. |
| `body-lg` | **1.125rem (18px)** | **1.3125rem (21px)** | **Default body.** Article copy, descriptions, card bodies. | v1 default was 18px on **desktop**; mobile rendered ~15px. New default is 18px floor, 21px ceiling. This is the single biggest founder-pain fix. |
| `body-md` | **1rem (16px)** | **1.125rem (18px)** | Compact paragraphs, table cells, secondary copy. | 16px floor protects accessibility — never smaller for prose. |
| `editorial-xl` | **2.25rem (36px)** | **3.5rem (56px)** | EB Garamond 300. Large pull quotes, editorial banner phrases. | Garamond at 300 weight needs scale to be legible. Below 32px on retina the hairline strokes wash out. |
| `editorial-lg` | **1.5rem (24px)** | **2rem (32px)** | EB Garamond 300. Inline pulls, italicized callouts. | Pairs with body-lg on the same page without visual collision. |
| `data-md` | **0.875rem (14px)** | **1rem (16px)** | JetBrains Mono 500. Telemetry labels, race-control codes, lap deltas. | Mono is **denser per glyph** than Hanken; 14px mono ≈ 16px proportional in apparent weight. Tracking +60–80 and uppercase for labels. |

### Line-height grammar

Headings: `1.05` (display-xxl/xl/lg), `1.1` (headline-xl/lg), `1.2` (headline-md).
Body: `1.55` (body-xl/lg/md). This is **looser** than v1's 1.5 — Apple uses ~1.47, Linear ~1.5, but the founder asked for editorial feel and 1.55 is where prose breathes.
Editorial: `1.35` (display tightness for serif drama).
Data: `1.2` with `letter-spacing: 0.04em` baseline, `0.08em` when uppercase.

### Why no `text-base`, `text-sm`, `text-xs` Tailwind aliases

We're killing them at the @theme layer. Tailwind v4's `@theme` allows the `--text-*` keys to **be the entire scale**. We expose only the semantic tokens above (`body-lg`, `headline-md`, etc.). This is the only way to enforce the founder's "no small text" rule at the **token boundary** instead of relying on code review.

---

## 2. Color palette refinement

The v1 palette was correct but **incomplete**. It had a spine and a brand color, but no glass, no podium, no flags, no overlay grids. v2 keeps every existing token (don't break shipped code) and adds the layers Apex needs to feel like a real F1 platform instead of a generic dark dashboard.

### Glass surface tokens

Three tiers, all derived from the existing `bg` value (#141313) at varying alpha. Why those alpha values:

- **`--surface-glass-low` = `rgba(20, 19, 19, 0.40)`** — for chrome that sits **on top of imagery** (driver-profile hero overlays, race-weekend banners). 0.40 lets the photo dominate; the chrome is signage.
- **`--surface-glass` = `rgba(20, 19, 19, 0.55)`** — the **workhorse**. Cards, modals, dropdowns floating over content. 0.55 is the sweet spot where Apple's Big Sur translucency lives: visibly translucent, but copy is still readable without backdrop-saturation help.
- **`--surface-glass-high` = `rgba(20, 19, 19, 0.70)`** — for surfaces that need to **read as a panel first, glass second**: command palette, sticky nav after scroll, mobile-bottom-sheets. The blur still leaks color but the substance is opaque enough for body copy.

Each of these pairs with a corresponding **stroke** token (see §6) and the three blur tiers in §3.

### Brand red expansion

`--telemetry-red` stays `#E10600` — it's the brand. We add:

- **`--telemetry-red-pale` = `rgba(225, 6, 0, 0.18)`** — halo glows, focus rings, the "telemetry pulse" on live indicators. Never used for fills.
- **`--telemetry-red-glow` = `#FF3D33`** — the **lit** version of the brand red. Used only for: hover state on primary CTAs, active-tab underglow, the pulse animation on `/live/timing`. It's literally a +brightness shift in HSL space (+12% L, +5% S). This gives interactive elements a real **state change**, not just an opacity tweak.

### Champion podium palette

F1 has a vocabulary. P1 is gold, P2 is silver, P3 is bronze, and not using these colors when displaying race results is a missed opportunity. Picked for **accessibility against `--bg` #141313**:

- **`--podium-gold` = `#D4A21F`** — Pantone-like F1 champion gold, AA-contrast on dark bg. Used on: P1 markers, championship-leader badges, "Drivers' Champion" lockups.
- **`--podium-silver` = `#BFC6CC`** — neutral cool silver, AA-contrast. P2.
- **`--podium-bronze` = `#A06A3F`** — warm bronze, AA-contrast. P3.

These are **earned** colors. They appear only when the data warrants it — never decoratively.

### Race-status flag palette

Marshal flags are a visual language F1 fans already know. Use the actual flag colors, mapped to status semantics:

- **`--flag-yellow` = `#FFCC00`** — caution, safety car, VSC.
- **`--flag-red` = `#D6001C`** — session stopped. **Note:** distinct from brand `--telemetry-red`. Brand red is identity; flag-red is danger. They must never appear adjacent.
- **`--flag-green` = `#00A651`** — track clear, race resumed, session start.
- **`--flag-blue` = `#0066B3`** — blue flag (faster car approaching).
- **`--flag-white` = `#F2F2F2`** — slow vehicle on track.
- **`--flag-chequered` = `linear-gradient(45deg, #FFF 25%, #000 25%, #000 50%, #FFF 50%, #FFF 75%, #000 75%)`** — utility gradient for finish-line moments.

### Stave-line and grid overlays

Apex's editorial pages need **paper-stock** texture — the thin horizontal lines on long-form pages, the subtle grid behind data tables. v1 had none of this; pages felt floaty.

- **`--stave-line` = `rgba(196, 199, 199, 0.06)`** — derived from `--on-surface-variant` at 6% alpha. Used as `border-top: 1px solid var(--stave-line)` between editorial paragraphs, data rows, schedule entries. Almost invisible at distance; appears as **texture** up close.
- **`--grid-pattern` = `rgba(196, 199, 199, 0.04)`** — for SVG/CSS-background grid lines on race-control dashboards, telemetry views. 4% alpha is "I see it, but I don't read it as content".
- **`--scanline` = `rgba(225, 6, 0, 0.05)`** — for the optional CRT-scanline texture on `/live/timing`. Pure decoration; reserved for live surfaces.

### Exact-use-case documentation (token-by-token)

This goes in `tokens.ts` as JSDoc on every export. The principle: **a token whose use case isn't documented gets misused.** v1 violated this; v2 fixes it.

---

## 3. Glass morphism system

Three tiers, each named for the **subjective feel**, not the blur value (subjective names survive refactors; numerical names become lies).

### `.glass-subtle` — present but unassertive

```
backdrop-filter: blur(6px) saturate(120%);
background: var(--surface-glass-low);
border: 1px solid rgba(255, 255, 255, 0.06);
```

**Use for:** chrome over photography, hover overlays on hero images, secondary navigation pills floating above content. The 6px blur is just enough to disambiguate text from the photo behind it without distorting the photo's composition.

### `.glass-medium` — the workhorse

```
backdrop-filter: blur(14px) saturate(140%);
background: var(--surface-glass);
border-image: linear-gradient(135deg,
  rgba(255,255,255,0.10),
  rgba(255,255,255,0.02) 40%,
  rgba(255,255,255,0.08)) 1;
```

**Use for:** cards, modals, dropdowns, popovers, the search-command palette. The gradient border is what makes it feel **etched**: brighter at top-left (light source), darker mid, brighter at bottom-right (rim light). This is the Apple Vision OS treatment, the Linear command-K palette treatment.

### `.glass-pronounced` — when the panel is the protagonist

```
backdrop-filter: blur(24px) saturate(160%) brightness(110%);
background: var(--surface-glass-high);
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow:
  inset 0 1px 0 rgba(255, 255, 255, 0.10),  /* top highlight */
  0 24px 60px -20px rgba(0, 0, 0, 0.60);    /* dropshadow */
```

**Use for:** sticky nav after scroll, mobile bottom sheets, the membership-paywall modal, the `/predict` submission card. The `brightness(110%)` lifts the underlying content slightly — gives the glass a "lit from above" quality. Inset top highlight + heavy dropshadow = floats convincingly.

### The noise overlay (all three tiers)

Real glass has **micro-texture**. Pure backdrop-blur looks like a CSS effect; backdrop-blur + 1% noise looks like **material**. We ship a single SVG noise data-URI applied via `::after` pseudo:

```css
.glass-subtle::after,
.glass-medium::after,
.glass-pronounced::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg ...");
  opacity: 0.025;          /* subtle */
  mix-blend-mode: overlay;
  border-radius: inherit;
}
.glass-medium::after { opacity: 0.04; }
.glass-pronounced::after { opacity: 0.06; }
```

### Performance discipline (this is the part that breaks shipped products)

`backdrop-filter` is GPU-expensive. Three rules, **enforced at the utility level**:

1. **`isolation: isolate`** on every `.glass-*` element. Creates a new stacking context so the backdrop-filter doesn't traverse the entire DOM looking for siblings to blur.
2. **`contain: paint;`** on the glass element. Tells the browser the paint can't leak out, lets it skip work.
3. **`will-change: backdrop-filter`** is **NOT** baked into the class. It's added by JS only when the element is about to animate (hover, scroll-in). Permanent `will-change` on glass = permanent GPU layer = battery drain.
4. **Mobile fallback:** at `@media (max-width: 640px)` we drop blur radius by 50% (6→3, 14→7, 24→12) and saturate stays. Mobile GPUs choke on 24px blur on a full-screen modal.
5. **Reduced transparency fallback:** `@media (prefers-reduced-transparency: reduce)` swaps glass for solid `--surface-container` with the matching stroke. Accessibility, non-negotiable.

---

## 4. Motion tokens

Motion in v1 was four durations (180/320/600/900) and two easings. That's a list, not a system. v2 builds **grammar** — durations have semantic meaning, easings have personality, springs have presets, staggers have a metric.

### Duration scale (semantic, not numeric)

| Token | Value | Use |
|---|---|---|
| `duration-micro` | **120ms** | Tooltip fade, focus ring snap, button press. Below the threshold of conscious perception. |
| `duration-default` | **200ms** | Hover state transitions, color shifts, small element entrance/exit. |
| `duration-transition` | **360ms** | Dropdown open, accordion expand, tab switch with content swap. |
| `duration-cinematic` | **600ms** | Modal entrance, card flip, scroll-revealed sections. The "I notice this happened" duration. |
| `duration-page` | **900ms** | Page transitions, route changes when we add view transitions API. |
| `duration-hero` | **1400ms** | Hero reveal on first paint, the orchestrated entrance of homepage above-fold. **One per page maximum.** |

### Easing palette (personality, not just curves)

- **`ease-out-cubic`** `cubic-bezier(0.33, 1, 0.68, 1)` — default for entering elements. Decelerates naturally. Apple's default.
- **`ease-out-quint`** `cubic-bezier(0.22, 1, 0.36, 1)` — sharper deceleration, more dramatic. For cinematic entrances. Replaces v1's "ease-cinematic".
- **`ease-in-out-quint`** `cubic-bezier(0.83, 0, 0.17, 1)` — symmetric strong ease. For element-to-element morphs (FLIP). Replaces v1's "ease-quint".
- **`ease-spring-soft`** `cubic-bezier(0.34, 1.32, 0.64, 1)` — bezier **approximation** of a soft spring. Slight overshoot, used for buttons returning to rest. Cheap; preserves the spring feel without the physics cost.
- **`ease-anticipate`** `cubic-bezier(0.68, -0.55, 0.27, 1.55)` — slight pullback before forward. **Used sparingly** — modal close, error shake, deliberate drama beats. Never on common interactions.

### Framer Motion spring presets

Framer Motion springs are stiffness/damping/mass tuples. Three presets covering 95% of use:

```ts
springSoft:    { type: "spring", stiffness: 180, damping: 22, mass: 1 }   // gentle, organic
springSnappy:  { type: "spring", stiffness: 380, damping: 30, mass: 0.8 } // responsive, button-like
springBouncy:  { type: "spring", stiffness: 260, damping: 18, mass: 1 }   // playful, controlled overshoot
```

### Stagger steps for list reveals

Four constants. Pick by **how many items**, not by feel:

- **40ms** — long lists (10+ items). Sub-perceptual gap, reads as a wave.
- **60ms** — medium lists (5–10). The default.
- **80ms** — short lists (3–5). Each item registers.
- **120ms** — feature reveals (2–3 hero items). Each item is an event.

### Reduced motion (explicit, not defensive)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .lenis { scroll-behavior: auto !important; }
}
```

Plus: Lenis is **disabled** when reduced motion is on, GSAP ScrollTrigger calls `gsap.ticker.remove()` on scrubbed timelines, Framer Motion respects `useReducedMotion()` (we ship a `useApexMotion()` hook that wraps this).

---

## 5. Spacing and grid

### Base unit

**4px.** Half the v1 implicit 8px. We need 4px to handle the fine inset/border-distance work that glass and editorial layouts demand.

### Spacing scale

`--space-0` (0), `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-5` (20px), `--space-6` (24px), `--space-8` (32px), `--space-10` (40px), `--space-12` (48px), `--space-16` (64px), `--space-20` (80px), `--space-24` (96px), `--space-32` (128px).

Note: **skips after `--space-6`** (no 7). The scale doubles past 24px because spacing at that range reads as section-level, not gap-level — half steps add noise.

### Container max-widths

| Token | Value | Use |
|---|---|---|
| `container-xs` | 480px | Mobile reading column |
| `container-sm` | 768px | Tablet, narrow editorial |
| `container-md` | 1024px | Standard article |
| `container-lg` | 1280px | Dashboard, results tables |
| `container-xl` | 1440px | Full marketing |
| `container-2xl` | 1600px | Editorial wide (only hero/photo sections) |

### Asymmetric grid presets

Three named grids for editorial layouts. The numbers are columns of a 12-track grid.

- **`grid-editorial-6-12-6`** — `grid-template-columns: 6fr 12fr 6fr;` — pull quotes left, content center, marginalia right. For driver-profile long-form.
- **`grid-feature-4-8-4`** — `grid-template-columns: 4fr 8fr 4fr;` — narrow caption left, hero center, metadata right. For race-deep-dive.
- **`grid-asymmetric-9-3`** — `grid-template-columns: 9fr 3fr;` — content + sticky sidebar. For latest-news with related-articles rail.

### Safe-area-inset (iOS notch)

```css
--safe-top:    env(safe-area-inset-top, 0);
--safe-right:  env(safe-area-inset-right, 0);
--safe-bottom: env(safe-area-inset-bottom, 0);
--safe-left:   env(safe-area-inset-left, 0);
```

All fixed/sticky elements must add these to their offsets. v1 didn't; the mobile nav clipped under the notch on iPhone 15 Pro Max.

### Thumb-zone constant

**`--thumb-zone-bottom: clamp(1rem, 4vh, 2rem);`** — minimum bottom padding for any sticky CTA, floating action button, or bottom-sheet handle. Below this, the element falls into the iOS home-indicator collision zone. This is the Apple HIG floor for the lower 34px-equivalent thumb-reach.

---

## 6. Radius and stroke

### Radius scale

`--radius-0` (0) — sharp/editorial.
`--radius-1` (2px) — hairline rounding for data cells.
`--radius-2` (4px) — buttons, inputs, small chips.
`--radius-3` (8px) — cards, default.
`--radius-4` (12px) — modals, popovers, glass surfaces.
`--radius-5` (16px) — hero panels, bottom sheets.
`--radius-6` (24px) — large editorial cards, the homepage feature blocks.
`--radius-full` (9999px) — pills, avatars, status dots.

### Stroke widths

`--stroke-hairline` (0.5px) — only on `@media (min-resolution: 2dppx)` retina. Falls back to 1px below 2x.
`--stroke-1` (1px) — default borders, dividers.
`--stroke-1-5` (1.5px) — emphasized borders (active card, focused input).
`--stroke-2` (2px) — focus ring, primary CTA outline.
`--stroke-3` (3px) — telemetry-red live indicator ring, never elsewhere.

---

## 7. The no-em-dash glyph system

The founder's rule: **no — anywhere.** Not in copy, not in nav, not in placeholders, not in tooltips. The font stack still renders the glyph (we can't strip a glyph from a font), so this is enforced at three layers:

### Layer 1 — `.text-glyphs` utility class

CSS can't prevent a glyph from rendering, but we can apply `font-variant-ligatures: none;` and use a font-feature pass that doesn't substitute hyphen-minus into em dash. More importantly, this class signals to the linter and to designers: "this block of copy has been audited."

### Layer 2 — substitution matrix (the source of truth for the rewrite pass)

| Source pattern | Replacement | Why |
|---|---|---|
| `A — B` (subordinate clause, sentence) | `A. B` (period + new sentence) | Editorial. Forces the writer to commit to two thoughts. |
| `A — B` (tight aside, same breath) | `A · B` (middle dot) | Visual pause without the typographic baggage. |
| `A — B` (formal definition) | `A: B` (colon) | "Lewis Hamilton: seven-time world champion." Clean. |
| `2018—2024` (year range) | `2018 to 2024` | Plain English. Never `2018-2024` either — hyphen-minus reads as math. |
| `Lap 1—15` (lap range) | `Laps 1 to 15` or `Laps 1–15` (en dash) **only in data tables** | En dash is acceptable in tabular data; never in prose. |
| `—and that's why` (drama beat) | `. And that's why` (period + capital) | Forces the writer to earn the next sentence. |
| List item bullets `· ITEM` | unchanged | Allowed. Middle dot as bullet is fine. |
| Nav separators `Drivers | Teams | Schedule` | unchanged | Pipe is allowed in nav. |
| `&mdash;`, `&#8212;`, U+2014 in source | **forbidden** | Never write the literal codepoint. |
| `&ndash;`, U+2013 in prose | **forbidden** in prose; **allowed** in data ranges | See lap-range row. |

### Layer 3 — the lint pass

A pre-commit grep rule for the rewrite sprint (not a token, but lives next to the system):

```
grep -rEn '[—–]|&(m|n)dash;' apps/web/app apps/web/components packages/ui/src --include='*.{ts,tsx,mdx,md}'
```

Anything that matches gets routed to the substitution matrix above and rewritten by hand. **No automated find-and-replace** — the correct substitution depends on the sentence's grammar, and a script will pick the wrong one half the time. This is a one-time editorial pass, then enforced going forward by the CI rule.

---

## 8. What changes downstream

For the implementation team. Order of operations after these tokens ship:

1. `packages/ui/src/tokens.ts` replaced wholesale. Old token names that don't exist in v2 are kept as **aliases** for one release cycle (`@deprecated` JSDoc) to avoid breaking shipped pages.
2. `apps/web/app/globals.css` `@theme` block replaced. The `--text-*`, `--color-*`, `--ease-*` keys map straight into Tailwind v4 utility generation; existing class names mostly resolve.
3. Glass utilities (`.glass-subtle`, `.glass-medium`, `.glass-pronounced`) ship as **plain CSS classes** in `globals.css`, not as Tailwind plugins. Reason: the noise overlay needs `::after` + a data-URI background, which Tailwind v4 utilities don't express cleanly.
4. Em-dash sweep runs as a one-time editorial pass across `apps/web/app/**/*.{tsx,mdx}` and `packages/ui/**/*.tsx`.
5. Component touches happen wave-by-wave; this token swap doesn't require a big-bang refactor.

---

## Code Block 1: `packages/ui/src/tokens.ts`

```ts
/**
 * Apex Design System v2
 * Single source of truth for tokens. Mirrors @theme block in apps/web/app/globals.css.
 *
 * Rules:
 *  - No raw values in components. Everything here.
 *  - Every export documents its use case. Undocumented = misused.
 *  - Mobile-first: clamp() values floor at a 375px-viewport-safe size.
 *  - Material-You dark spine preserved. v2 extends; does not fork.
 */

// ─────────────────────────────────────────────────────────────
// 1. TYPE SCALE (perfect fourth 1.333, clamp-based fluid)
// ─────────────────────────────────────────────────────────────

export const fontFamily = {
  /** Anybody 700/800. Display + headings. Architectural. */
  display: '"Anybody", "Anybody Fallback", system-ui, sans-serif',
  /** Hanken Grotesk 400. Default body. Workhorse. */
  body: '"Hanken Grotesk", "Hanken Fallback", system-ui, sans-serif',
  /** EB Garamond 300. Editorial pulls, drama-beat italics. */
  editorial: '"EB Garamond", "Garamond Fallback", Georgia, serif',
  /** JetBrains Mono 500. Telemetry, lap deltas, race-control codes. */
  data: '"JetBrains Mono", "JetBrains Fallback", "SF Mono", Consolas, monospace',
} as const;

export const fontWeight = {
  body: 400,
  bodyMedium: 500,
  data: 500,
  editorial: 300,
  display: 700,
  displayHeavy: 800,
} as const;

/**
 * Fluid type scale.
 * Each value is clamp(MIN, FLUID, MAX). MIN sized for 375px viewport, MAX for 1440px+.
 * `lh` = line-height. `tracking` = letter-spacing (em).
 */
export const fontSize = {
  /** Hero only. One per page maximum. 104px → 144px. */
  displayXxl: {
    size: "clamp(6.5rem, 4rem + 12vw, 9rem)",
    lh: 1.02,
    tracking: "-0.03em",
    family: fontFamily.display,
    weight: fontWeight.displayHeavy,
  },
  /** Page titles (/drivers, /teams, /schedule). 64px → 96px. */
  displayXl: {
    size: "clamp(4rem, 2.5rem + 7.5vw, 6rem)",
    lh: 1.05,
    tracking: "-0.025em",
    family: fontFamily.display,
    weight: fontWeight.displayHeavy,
  },
  /** Section heroes within a page. 48px → 72px. */
  displayLg: {
    size: "clamp(3rem, 2rem + 5vw, 4.5rem)",
    lh: 1.08,
    tracking: "-0.02em",
    family: fontFamily.display,
    weight: fontWeight.display,
  },
  /** Major H2 ("Latest Results", "Standings"). 36px → 52px. Founder pain target. */
  headlineXl: {
    size: "clamp(2.25rem, 1.5rem + 3.75vw, 3.25rem)",
    lh: 1.1,
    tracking: "-0.015em",
    family: fontFamily.display,
    weight: fontWeight.display,
  },
  /** Article headlines, card titles in editorial grids. 28px → 40px. */
  headlineLg: {
    size: "clamp(1.75rem, 1.25rem + 2.5vw, 2.5rem)",
    lh: 1.15,
    tracking: "-0.01em",
    family: fontFamily.display,
    weight: fontWeight.display,
  },
  /** Compact card titles, sidebar headings. 20px → 26px. */
  headlineMd: {
    size: "clamp(1.25rem, 1rem + 1.25vw, 1.625rem)",
    lh: 1.2,
    tracking: "-0.005em",
    family: fontFamily.display,
    weight: fontWeight.display,
  },
  /** Lede paragraphs, hero subheads. 20px → 24px. Medium-tier editorial body. */
  bodyXl: {
    size: "clamp(1.25rem, 1.125rem + 0.625vw, 1.5rem)",
    lh: 1.5,
    tracking: "0em",
    family: fontFamily.body,
    weight: fontWeight.body,
  },
  /** DEFAULT BODY. Article copy, descriptions. 18px → 21px. */
  bodyLg: {
    size: "clamp(1.125rem, 1.0625rem + 0.3125vw, 1.3125rem)",
    lh: 1.55,
    tracking: "0em",
    family: fontFamily.body,
    weight: fontWeight.body,
  },
  /** Compact paragraphs, table cells, secondary copy. 16px → 18px. */
  bodyMd: {
    size: "clamp(1rem, 0.9375rem + 0.3125vw, 1.125rem)",
    lh: 1.55,
    tracking: "0em",
    family: fontFamily.body,
    weight: fontWeight.body,
  },
  /** EB Garamond 300. Large pull quotes, editorial banners. 36px → 56px. */
  editorialXl: {
    size: "clamp(2.25rem, 1.25rem + 5vw, 3.5rem)",
    lh: 1.3,
    tracking: "-0.01em",
    family: fontFamily.editorial,
    weight: fontWeight.editorial,
  },
  /** EB Garamond 300. Inline pulls, italicized callouts. 24px → 32px. */
  editorialLg: {
    size: "clamp(1.5rem, 1.125rem + 1.875vw, 2rem)",
    lh: 1.35,
    tracking: "-0.005em",
    family: fontFamily.editorial,
    weight: fontWeight.editorial,
  },
  /** JetBrains Mono 500. Telemetry labels, lap deltas. 14px → 16px. Uppercase + tracking. */
  dataMd: {
    size: "clamp(0.875rem, 0.8125rem + 0.3125vw, 1rem)",
    lh: 1.2,
    tracking: "0.08em",
    textTransform: "uppercase",
    family: fontFamily.data,
    weight: fontWeight.data,
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 2. COLOR — Material-You dark spine + glass + podium + flags
// ─────────────────────────────────────────────────────────────

export const color = {
  // Spine (v1, preserved)
  bg: "#141313",
  surfaceContainerLow: "#1c1b1b",
  surfaceContainer: "#201f1f",
  asphaltGray: "#262626",
  carbonBlack: "#0F0F0F",
  onBackground: "#e5e2e1",
  onSurfaceVariant: "#c4c7c7",
  outline: "#8e9192",
  outlineVariant: "#444748",

  // Brand red (expanded)
  /** Brand. Primary CTAs, brand marks, never decorative. */
  telemetryRed: "#E10600",
  /** Halo glows, focus rings, live-indicator pulse. Never a fill. */
  telemetryRedPale: "rgba(225, 6, 0, 0.18)",
  /** Lit brand red. Hover state on primary CTAs, active-tab underglow. */
  telemetryRedGlow: "#FF3D33",

  // Glass surfaces (rgba derivations of bg)
  /** Glass over photography. Chrome that defers to content. */
  surfaceGlassLow: "rgba(20, 19, 19, 0.40)",
  /** Workhorse glass. Cards, modals, popovers, dropdowns. */
  surfaceGlass: "rgba(20, 19, 19, 0.55)",
  /** Glass that reads as panel first. Sticky nav, bottom sheets, command palette. */
  surfaceGlassHigh: "rgba(20, 19, 19, 0.70)",

  // Podium colors (P1/P2/P3 highlights)
  /** P1 marker, championship-leader badge, "Drivers' Champion" lockup. */
  podiumGold: "#D4A21F",
  /** P2 marker. */
  podiumSilver: "#BFC6CC",
  /** P3 marker. */
  podiumBronze: "#A06A3F",

  // Race-status flag palette
  /** Caution, safety car, VSC. */
  flagYellow: "#FFCC00",
  /** Session stopped. NEVER adjacent to telemetryRed (brand vs danger collision). */
  flagRed: "#D6001C",
  /** Track clear, race resumed. */
  flagGreen: "#00A651",
  /** Faster car approaching. */
  flagBlue: "#0066B3",
  /** Slow vehicle on track. */
  flagWhite: "#F2F2F2",
  /** Finish-line moments. CSS gradient string, not a flat color. */
  flagChequered:
    "linear-gradient(45deg, #FFFFFF 25%, #000000 25%, #000000 50%, #FFFFFF 50%, #FFFFFF 75%, #000000 75%)",

  // Overlay textures
  /** Horizontal divider on editorial long-form. 6% alpha; reads as texture. */
  staveLine: "rgba(196, 199, 199, 0.06)",
  /** SVG/CSS-bg grid lines on race-control + telemetry. 4% alpha. */
  gridPattern: "rgba(196, 199, 199, 0.04)",
  /** Optional CRT scanline on /live/timing. Decorative only. */
  scanline: "rgba(225, 6, 0, 0.05)",
} as const;

// ─────────────────────────────────────────────────────────────
// 3. MOTION
// ─────────────────────────────────────────────────────────────

export const duration = {
  /** Tooltip fade, focus ring, button press. Sub-perceptual. */
  micro: 120,
  /** Hover transitions, color shifts. Default. */
  default: 200,
  /** Dropdown open, accordion expand, tab switch. */
  transition: 360,
  /** Modal entrance, scroll reveal, card flip. */
  cinematic: 600,
  /** Page transitions (View Transitions API). */
  page: 900,
  /** Hero reveal on first paint. ONE PER PAGE MAX. */
  hero: 1400,
} as const;

export const easing = {
  /** Default entering. Apple's default. */
  outCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
  /** Sharper deceleration. Cinematic entrances. */
  outQuint: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Symmetric strong ease. Element-to-element morphs (FLIP). */
  inOutQuint: "cubic-bezier(0.83, 0, 0.17, 1)",
  /** Bezier spring approximation. Slight overshoot. Buttons returning to rest. */
  springSoft: "cubic-bezier(0.34, 1.32, 0.64, 1)",
  /** Pullback before forward. Used SPARINGLY. Modal close, error shake. */
  anticipate: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
} as const;

/** Framer Motion spring presets. Use these instead of inline tuples. */
export const spring = {
  /** Gentle, organic. Hover lifts, content settling. */
  soft: { type: "spring" as const, stiffness: 180, damping: 22, mass: 1 },
  /** Responsive, button-like. Primary CTAs. */
  snappy: { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.8 },
  /** Playful, controlled overshoot. Reserved use. */
  bouncy: { type: "spring" as const, stiffness: 260, damping: 18, mass: 1 },
} as const;

/** Stagger delay (ms) for list reveals. Pick by list length. */
export const stagger = {
  /** Long lists (10+). Reads as a wave. */
  wave: 40,
  /** Medium lists (5–10). Default. */
  default: 60,
  /** Short lists (3–5). Each item registers. */
  registered: 80,
  /** Feature reveals (2–3). Each item is an event. */
  feature: 120,
} as const;

// ─────────────────────────────────────────────────────────────
// 4. SPACING + GRID
// ─────────────────────────────────────────────────────────────

/** Base unit 4px. Skips above space-6 (doubles past 24px). */
export const space = {
  0: "0",
  1: "0.25rem", // 4
  2: "0.5rem", // 8
  3: "0.75rem", // 12
  4: "1rem", // 16
  5: "1.25rem", // 20
  6: "1.5rem", // 24
  8: "2rem", // 32
  10: "2.5rem", // 40
  12: "3rem", // 48
  16: "4rem", // 64
  20: "5rem", // 80
  24: "6rem", // 96
  32: "8rem", // 128
} as const;

export const container = {
  xs: "480px",
  sm: "768px",
  md: "1024px",
  lg: "1280px",
  xl: "1440px",
  "2xl": "1600px",
} as const;

/** Named asymmetric grids for editorial layouts. */
export const gridPreset = {
  /** Pull quotes left, content center, marginalia right. Driver-profile long-form. */
  editorial6_12_6: "6fr 12fr 6fr",
  /** Caption left, hero center, metadata right. Race deep-dive. */
  feature4_8_4: "4fr 8fr 4fr",
  /** Content + sticky sidebar. Latest-news with related rail. */
  asymmetric9_3: "9fr 3fr",
} as const;

export const safeArea = {
  top: "env(safe-area-inset-top, 0px)",
  right: "env(safe-area-inset-right, 0px)",
  bottom: "env(safe-area-inset-bottom, 0px)",
  left: "env(safe-area-inset-left, 0px)",
} as const;

/** Minimum bottom padding for sticky CTAs / FABs / bottom-sheet handles. */
export const thumbZoneBottom = "clamp(1rem, 4vh, 2rem)";

// ─────────────────────────────────────────────────────────────
// 5. RADIUS + STROKE
// ─────────────────────────────────────────────────────────────

export const radius = {
  0: "0",
  1: "2px",
  2: "4px",
  3: "8px",
  4: "12px",
  5: "16px",
  6: "24px",
  full: "9999px",
} as const;

export const stroke = {
  /** Renders 0.5px on 2dppx+ retina, 1px below. Applied via media query. */
  hairline: "0.5px",
  1: "1px",
  "1_5": "1.5px",
  2: "2px",
  /** Reserved: telemetry-red live indicator ring. Never elsewhere. */
  3: "3px",
} as const;

// ─────────────────────────────────────────────────────────────
// 6. GLASS PRESETS (CSS-side; here for TS consumers)
// ─────────────────────────────────────────────────────────────

export const glass = {
  subtle: {
    backdropFilter: "blur(6px) saturate(120%)",
    background: color.surfaceGlassLow,
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  medium: {
    backdropFilter: "blur(14px) saturate(140%)",
    background: color.surfaceGlass,
    borderImage:
      "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.08)) 1",
  },
  pronounced: {
    backdropFilter: "blur(24px) saturate(160%) brightness(110%)",
    background: color.surfaceGlassHigh,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 60px -20px rgba(0,0,0,0.60)",
  },
} as const;

// ─────────────────────────────────────────────────────────────
// 7. EM-DASH SUBSTITUTION MATRIX (for editorial sweep)
// ─────────────────────────────────────────────────────────────

/** Source of truth for the no-em-dash editorial pass. Not a runtime export. */
export const glyphSubstitution = {
  forbidden: ["—", "–", "&mdash;", "&ndash;", "\u2014", "\u2013"],
  allowed: {
    middleDot: "·",
    pipe: "|",
    colon: ":",
    period: ".",
  },
  rules: [
    { pattern: "A — B (subordinate)", replace: "A. B" },
    { pattern: "A — B (tight aside)", replace: "A · B" },
    { pattern: "A — B (definition)", replace: "A: B" },
    { pattern: "YYYY—YYYY", replace: "YYYY to YYYY" },
    { pattern: "Lap N—M (prose)", replace: "Laps N to M" },
    { pattern: "—and (drama)", replace: ". And" },
  ],
} as const;

// ─────────────────────────────────────────────────────────────
// 8. DEPRECATED v1 ALIASES (one release cycle, then removed)
// ─────────────────────────────────────────────────────────────

/** @deprecated use easing.outQuint */
export const easeCinematic = easing.outQuint;
/** @deprecated use easing.inOutQuint */
export const easeQuint = easing.inOutQuint;
/** @deprecated use duration.default */
export const duration180 = duration.default;
/** @deprecated use duration.transition */
export const duration320 = duration.transition;

export type ApexTokens = {
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  color: typeof color;
  duration: typeof duration;
  easing: typeof easing;
  spring: typeof spring;
  stagger: typeof stagger;
  space: typeof space;
  container: typeof container;
  gridPreset: typeof gridPreset;
  safeArea: typeof safeArea;
  radius: typeof radius;
  stroke: typeof stroke;
  glass: typeof glass;
};

export const tokens: ApexTokens = {
  fontFamily,
  fontSize,
  color,
  duration,
  easing,
  spring,
  stagger,
  space,
  container,
  gridPreset,
  safeArea,
  radius,
  stroke,
  glass,
};

export default tokens;
```

---

## Code Block 2: `apps/web/app/globals.css`

```css
/*
 * Apex Design System v2 — Tailwind v4 @theme
 * Single source of truth at CSS layer. Mirrors packages/ui/src/tokens.ts.
 * Order:
 *   1. @theme — token registration (Tailwind v4 utility generation)
 *   2. Global base — fonts, body, scrollbar
 *   3. Glass utilities — .glass-subtle / .glass-medium / .glass-pronounced
 *   4. Editorial utilities — .stave, .text-glyphs
 *   5. Motion fallbacks — prefers-reduced-motion + prefers-reduced-transparency
 */

@import "tailwindcss";

@theme {
  /* ── FONT FAMILIES ─────────────────────────────────────── */
  --font-display: "Anybody", "Anybody Fallback", system-ui, sans-serif;
  --font-body: "Hanken Grotesk", "Hanken Fallback", system-ui, sans-serif;
  --font-editorial: "EB Garamond", "Garamond Fallback", Georgia, serif;
  --font-data: "JetBrains Mono", "JetBrains Fallback", "SF Mono", Consolas, monospace;

  /* ── TYPE SCALE (fluid clamp, perfect fourth 1.333) ───── */
  --text-display-xxl: clamp(6.5rem, 4rem + 12vw, 9rem);
  --text-display-xxl--line-height: 1.02;
  --text-display-xxl--letter-spacing: -0.03em;
  --text-display-xxl--font-weight: 800;

  --text-display-xl: clamp(4rem, 2.5rem + 7.5vw, 6rem);
  --text-display-xl--line-height: 1.05;
  --text-display-xl--letter-spacing: -0.025em;
  --text-display-xl--font-weight: 800;

  --text-display-lg: clamp(3rem, 2rem + 5vw, 4.5rem);
  --text-display-lg--line-height: 1.08;
  --text-display-lg--letter-spacing: -0.02em;
  --text-display-lg--font-weight: 700;

  --text-headline-xl: clamp(2.25rem, 1.5rem + 3.75vw, 3.25rem);
  --text-headline-xl--line-height: 1.1;
  --text-headline-xl--letter-spacing: -0.015em;
  --text-headline-xl--font-weight: 700;

  --text-headline-lg: clamp(1.75rem, 1.25rem + 2.5vw, 2.5rem);
  --text-headline-lg--line-height: 1.15;
  --text-headline-lg--letter-spacing: -0.01em;
  --text-headline-lg--font-weight: 700;

  --text-headline-md: clamp(1.25rem, 1rem + 1.25vw, 1.625rem);
  --text-headline-md--line-height: 1.2;
  --text-headline-md--letter-spacing: -0.005em;
  --text-headline-md--font-weight: 700;

  --text-body-xl: clamp(1.25rem, 1.125rem + 0.625vw, 1.5rem);
  --text-body-xl--line-height: 1.5;
  --text-body-xl--font-weight: 400;

  --text-body-lg: clamp(1.125rem, 1.0625rem + 0.3125vw, 1.3125rem);
  --text-body-lg--line-height: 1.55;
  --text-body-lg--font-weight: 400;

  --text-body-md: clamp(1rem, 0.9375rem + 0.3125vw, 1.125rem);
  --text-body-md--line-height: 1.55;
  --text-body-md--font-weight: 400;

  --text-editorial-xl: clamp(2.25rem, 1.25rem + 5vw, 3.5rem);
  --text-editorial-xl--line-height: 1.3;
  --text-editorial-xl--letter-spacing: -0.01em;
  --text-editorial-xl--font-weight: 300;

  --text-editorial-lg: clamp(1.5rem, 1.125rem + 1.875vw, 2rem);
  --text-editorial-lg--line-height: 1.35;
  --text-editorial-lg--letter-spacing: -0.005em;
  --text-editorial-lg--font-weight: 300;

  --text-data-md: clamp(0.875rem, 0.8125rem + 0.3125vw, 1rem);
  --text-data-md--line-height: 1.2;
  --text-data-md--letter-spacing: 0.08em;
  --text-data-md--font-weight: 500;

  /* ── COLOR — spine (v1 preserved) ─────────────────────── */
  --color-bg: #141313;
  --color-surface-container-low: #1c1b1b;
  --color-surface-container: #201f1f;
  --color-asphalt-gray: #262626;
  --color-carbon-black: #0f0f0f;
  --color-on-background: #e5e2e1;
  --color-on-surface-variant: #c4c7c7;
  --color-outline: #8e9192;
  --color-outline-variant: #444748;

  /* ── COLOR — brand red expansion ──────────────────────── */
  --color-telemetry-red: #e10600;
  --color-telemetry-red-pale: rgba(225, 6, 0, 0.18);
  --color-telemetry-red-glow: #ff3d33;

  /* ── COLOR — glass surfaces ───────────────────────────── */
  --color-surface-glass-low: rgba(20, 19, 19, 0.4);
  --color-surface-glass: rgba(20, 19, 19, 0.55);
  --color-surface-glass-high: rgba(20, 19, 19, 0.7);

  /* ── COLOR — podium ───────────────────────────────────── */
  --color-podium-gold: #d4a21f;
  --color-podium-silver: #bfc6cc;
  --color-podium-bronze: #a06a3f;

  /* ── COLOR — race flags ───────────────────────────────── */
  --color-flag-yellow: #ffcc00;
  --color-flag-red: #d6001c;
  --color-flag-green: #00a651;
  --color-flag-blue: #0066b3;
  --color-flag-white: #f2f2f2;

  /* ── COLOR — overlay textures ─────────────────────────── */
  --color-stave-line: rgba(196, 199, 199, 0.06);
  --color-grid-pattern: rgba(196, 199, 199, 0.04);
  --color-scanline: rgba(225, 6, 0, 0.05);

  /* ── MOTION — durations ───────────────────────────────── */
  --duration-micro: 120ms;
  --duration-default: 200ms;
  --duration-transition: 360ms;
  --duration-cinematic: 600ms;
  --duration-page: 900ms;
  --duration-hero: 1400ms;

  /* ── MOTION — easing ──────────────────────────────────── */
  --ease-out-cubic: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1);
  --ease-spring-soft: cubic-bezier(0.34, 1.32, 0.64, 1);
  --ease-anticipate: cubic-bezier(0.68, -0.55, 0.27, 1.55);

  /* ── SPACING (4px base) ───────────────────────────────── */
  --spacing-0: 0;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;
  --spacing-20: 5rem;
  --spacing-24: 6rem;
  --spacing-32: 8rem;

  /* ── CONTAINER MAX-WIDTHS ─────────────────────────────── */
  --container-xs: 480px;
  --container-sm: 768px;
  --container-md: 1024px;
  --container-lg: 1280px;
  --container-xl: 1440px;
  --container-2xl: 1600px;

  /* ── SAFE-AREA + THUMB ZONE ───────────────────────────── */
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --thumb-zone-bottom: clamp(1rem, 4vh, 2rem);

  /* ── RADIUS ───────────────────────────────────────────── */
  --radius-0: 0;
  --radius-1: 2px;
  --radius-2: 4px;
  --radius-3: 8px;
  --radius-4: 12px;
  --radius-5: 16px;
  --radius-6: 24px;
  --radius-full: 9999px;

  /* ── STROKE ───────────────────────────────────────────── */
  --stroke-hairline: 1px; /* overridden to 0.5px at 2dppx below */
  --stroke-1: 1px;
  --stroke-1-5: 1.5px;
  --stroke-2: 2px;
  --stroke-3: 3px;
}

/* Hairline true 0.5px on retina */
@media (min-resolution: 2dppx) {
  :root {
    --stroke-hairline: 0.5px;
  }
}

/* ──────────────────────────────────────────────────────────
 * GLOBAL BASE
 * ────────────────────────────────────────────────────────── */

html {
  background: var(--color-bg);
  color-scheme: dark;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

html.dark body,
body {
  background: var(--color-bg);
  color: var(--color-on-background);
  font-family: var(--font-body);
  font-size: var(--text-body-lg);
  line-height: 1.55;
}

/* ──────────────────────────────────────────────────────────
 * GLASS UTILITIES
 * Three tiers. Each ships with the noise overlay and the
 * performance guardrails (isolate, contain, mobile blur cut).
 * ────────────────────────────────────────────────────────── */

.glass-subtle,
.glass-medium,
.glass-pronounced {
  position: relative;
  isolation: isolate;
  contain: paint;
  border-radius: var(--radius-4);
  overflow: hidden;
}

.glass-subtle {
  -webkit-backdrop-filter: blur(6px) saturate(120%);
  backdrop-filter: blur(6px) saturate(120%);
  background: var(--color-surface-glass-low);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.glass-medium {
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  backdrop-filter: blur(14px) saturate(140%);
  background: var(--color-surface-glass);
  border: 1px solid transparent;
  background-clip: padding-box;
  position: relative;
}
.glass-medium::before {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.10),
    rgba(255, 255, 255, 0.02) 40%,
    rgba(255, 255, 255, 0.08)
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.glass-pronounced {
  -webkit-backdrop-filter: blur(24px) saturate(160%) brightness(110%);
  backdrop-filter: blur(24px) saturate(160%) brightness(110%);
  background: var(--color-surface-glass-high);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 24px 60px -20px rgba(0, 0, 0, 0.6);
}

/* Noise overlay — applied to all three tiers via ::after */
.glass-subtle::after,
.glass-medium::after,
.glass-pronounced::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
  background-size: 160px 160px;
  opacity: 0.025;
}
.glass-medium::after { opacity: 0.04; }
.glass-pronounced::after { opacity: 0.06; }

/* Mobile: halve blur radii (GPU thermals) */
@media (max-width: 640px) {
  .glass-subtle {
    -webkit-backdrop-filter: blur(3px) saturate(120%);
    backdrop-filter: blur(3px) saturate(120%);
  }
  .glass-medium {
    -webkit-backdrop-filter: blur(7px) saturate(140%);
    backdrop-filter: blur(7px) saturate(140%);
  }
  .glass-pronounced {
    -webkit-backdrop-filter: blur(12px) saturate(160%) brightness(110%);
    backdrop-filter: blur(12px) saturate(160%) brightness(110%);
  }
}

/* Accessibility: reduced transparency falls back to solid surfaces */
@media (prefers-reduced-transparency: reduce) {
  .glass-subtle,
  .glass-medium,
  .glass-pronounced {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: var(--color-surface-container);
    border: 1px solid var(--color-outline-variant);
  }
  .glass-subtle::after,
  .glass-medium::after,
  .glass-pronounced::after { display: none; }
}

/* ──────────────────────────────────────────────────────────
 * EDITORIAL UTILITIES
 * ────────────────────────────────────────────────────────── */

/* Stave-line divider for long-form editorial */
.stave > * + * {
  border-top: 1px solid var(--color-stave-line);
  padding-top: var(--spacing-6);
  margin-top: var(--spacing-6);
}

/* Grid pattern overlay (race-control, telemetry) */
.grid-overlay {
  background-image:
    linear-gradient(to right, var(--color-grid-pattern) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-grid-pattern) 1px, transparent 1px);
  background-size: 48px 48px;
}

/*
 * .text-glyphs
 * Marker class for copy blocks that have been audited
 * for em-dash compliance. Disables ligature substitution
 * that some fonts use to swap hyphen-minus into en/em dash.
 */
.text-glyphs {
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0, "clig" 0, "dlig" 0;
  -webkit-font-feature-settings: "liga" 0, "clig" 0, "dlig" 0;
}

/* ──────────────────────────────────────────────────────────
 * MOTION FALLBACKS
 * ────────────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  html,
  body,
  .lenis,
  .lenis-smooth {
    scroll-behavior: auto !important;
  }
}

/* ──────────────────────────────────────────────────────────
 * SAFE-AREA + THUMB-ZONE HELPERS
 * ────────────────────────────────────────────────────────── */

.safe-pad-top    { padding-top:    var(--safe-top); }
.safe-pad-right  { padding-right:  var(--safe-right); }
.safe-pad-bottom { padding-bottom: var(--safe-bottom); }
.safe-pad-left   { padding-left:   var(--safe-left); }
.thumb-zone      { padding-bottom: calc(var(--thumb-zone-bottom) + var(--safe-bottom)); }
```
