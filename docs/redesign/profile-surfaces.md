# Driver + Team profile premium redesign

Typecheck is now **fully clean** (no errors anywhere — including my code). The only remaining lint output on my files is the `<img>` warning for Wikidata Commons portraits in `ParallaxHero.tsx`, which is intentional — Wikidata returns external URLs that next/image cannot optimize without a configured remotePatterns entry. The four files all compile cleanly.

Now the design treatise.

---

# Apex · Driver & Team Portrait Surfaces · Redesign

**Files written:**

Pages (full rewrites):
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/drivers/[slug]/page.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/drivers/[slug]/career/page.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/teams/[slug]/page.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/teams/[slug]/history/page.tsx`

New shared components:
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/CountUpBadge.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/ParallaxHero.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/MagneticButton.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/StatStrip.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/CareerArc.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/SeasonCard.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/RecentFormPanel.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/DecadeTabs.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/TeamHistoryDecade.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/ViewTransitionLink.tsx`

Globals:
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/globals.css` — added View Transitions ease/duration block at the bottom.

---

## Design Thesis

The previous driver and team pages were honest but utilitarian: a header, a four-column stat strip, a CTA button, a paragraph apologising for missing data. That language is fine for a CMS dashboard. It is not the language of a product that wants to feel like Apple's AirPods Max page, Marcello Policarpo's portfolio, or Linear's product surfaces. The brief asked for **portrait-style premium surfaces**, and the right mental model is editorial photography: every page is a poster first, a data table second.

Four ideas drive every decision below.

**One — the name is the hero.** Drivers and teams are brands. Apex must treat them as such. Hamilton, Verstappen, Ferrari are display-xxl, not headline-lg. The driver's last name now clamps from `9rem` to `14rem` (`clamp(4.5rem, 18vw, 14rem)`) and deliberately breaks the layout grid by extending past the safe-area on wide viewports. The car number rides at `clamp(5rem, 14vw, 11rem)` in telemetry-red and **animates from 0 on count-up**, so the first thing the user sees and remembers is the number, the way Formula 1 broadcasts cut to a driver tag on the lower-third. The team name on the team profile sits at the same clamp range over a 135-degree linear gradient from the team's own livery color to carbon-black — Ferrari is red-on-dark, Red Bull is blue-on-dark, McLaren is papaya-on-dark. The page identity changes with the team the way Apple's product pages change with the product.

**Two — telemetry, not template.** This is a Formula 1 product. Every number that can be a number should count up the way a telemetry overlay would: scroll into view, the stat ticks from zero, lands on the actual value, settles. We never use `Intl.NumberFormat` and a static span where a `CountUpBadge` could exist instead. The `CountUpBadge` component uses Framer Motion's `animate` function (hardware accelerated) with the `ease-cinematic` curve, triggers once via `useInView` with a `-10% 0px -10% 0px` margin so it fires when the stat is clearly in frame (not when it's a pixel from the fold), and supports `decimals` (for height in meters), `prefix` (for `P3` or `$M`), `suffix` (for `m` or `PTS`), and `group` (for thousands separators on point totals). This single component is reused in the driver hero, the driver stat strip, the career page stat strip, every season card's points total, every race card on expansion, every team championship badge, every team history points bar, and every history decade stat. Numbers become motion.

**Three — the page is a portrait.** The driver profile hero is full-bleed `100svh`. The Wikidata Commons portrait sits as the background, anchored at `center 18%` so the face lands above the lower-third where the name will be. It's scaled `1.08` at rest and runs a 30% downward parallax + scale-to-`1.18` as you scroll, using Framer Motion's `useScroll` + `useTransform` against the hero ref. Above the portrait we layer (in this order, top to bottom): a top-left radial telemetry-red glow at `rgba(225,6,0,0.15)` simulating a tower light, a 90-degree left-fade gradient guaranteeing legible text over any portrait, and a 180-degree bottom vignette that fades to surface-container-lowest so the hero blends into the next section without a hard edge. The team page does the same composition with a linear team-color gradient instead of a portrait, plus a subtle carbon-weave SVG overlay at 25% opacity mix-blend-overlay — so when the gradient hits the carbon weave you get something that reads as a constructor's actual carbon-fibre tub rather than a generic CSS gradient. The 8-pixel team-color stripe runs the full height of the right edge on both driver hero and career hero, so the page has a literal racing stripe.

**Four — motion is the layout system.** Every reveal, expand, hover and transition is timed against the same `cubic-bezier(0.215, 0.61, 0.355, 1)` curve already defined in tokens as `ease-cinematic`. The stat strip cells reveal with `opacity: 0, y: 32` staggered by 80ms per cell. The career arc track draws a 1px telemetry-red line left-to-right over 1.6 seconds. Each year-cell's team-color block scales vertically from `scaleY: 0` to `scaleY: 1`, staggered against position in the timeline so the arc literally fills in chronologically — a 70-year career takes about 0.9 seconds to "play". Season cards animate height-auto with Framer Motion's `<motion.div layout>` plus `<AnimatePresence>`; each child race-card inside an opened season fades and slides up with a 25ms cascade so it reads as a flock landing rather than a CSS dump. The decade tabs use `layoutId="decade-indicator"` so the active background slides between tabs as a single shared element — the exact pattern Linear uses for its tab indicators. The MagneticButton on every primary CTA tracks the cursor at 0.25 strength via a spring-damped `useMotionValue` pair and runs a diagonal sheen sweep across its surface on hover. All of these respect `useReducedMotion` and the `prefers-reduced-motion` media query already in `globals.css`.

---

## Page-by-Page

### `/drivers/[slug]` — Driver Profile

The page reads top-down as: hero → 4-stat strip → career arc → recent form → CTA section → references.

The hero is a `ParallaxHero` with `height="xl"`. The Wikidata portrait (already wired through `getDriverFactsFromWikidata`) loads at width `1600` (up from `800` in the old code) for retina sharpness, with the parallax driven by Framer Motion's `useScroll` against the hero ref so it stays GPU-cheap and never triggers a layout. The top utility row is a back-link with a back-arrow that shifts left on hover (`group-hover:-translate-x-1`) and a code/team tag on the right (`VER · Red Bull Racing`). The name lock-up uses a structural pattern I want to highlight: `firstName` is rendered as a small caps-style label above the name (`text-[0.32em]`, tracking-`0.18em`, headline weight — feels like a serif's small-cap), and the `lastName` underneath at the display-xxl clamp. This is the typographic trick Marcello Policarpo, Lusion, Igloo and every premium portfolio uses — the lesser word stays as utility above and the brand word sits as the hero. The car number hangs below the name at display-lg in telemetry-red with the `CountUpBadge` counting from 0 to its actual value on mount. View Transition names (`driver-name-${slug}`, `driver-number-${slug}`) are stitched onto the H1 and the number so when the user navigates to `/career`, the browser morphs these elements between routes rather than re-painting them.

The 4-card stat strip below uses the shared `StatStrip` component. Per brief: NATIONALITY (flag emoji + nationality), BORN (DOB plus place of birth from Wikidata as a smaller editorial subline, including age if computable), HEIGHT (Wikidata meters with `decimals: 2` and ` m` suffix on the CountUp), DEBUT (first racing season pulled from the results aggregation, with the latest year as subline). On mobile the strip becomes a horizontal snap-scroll carousel where each card is `min-width: 68vw` and `snap-start`. On desktop it's a 4-column grid with hairline dividers. Each cell reveals with the staggered fade pattern. Every numeric value runs through CountUp.

The career arc section is a horizontal 1950 → present timeline rendered by the `CareerArc` component. Decade labels (1950, 1960, ... 2020) hang above; the active and latest year labels hang below. The track itself is a 56px tall band with a top-border that's a 1px line which Framer Motion `animate`s from `width: 0` to `width: 100%` on first reveal. The years range is split into equal-width cells (75 cells for 1950→2024). For every year the driver raced, a vertical color block (the constructor's color from `teamColorBySlug`) scale-Y's into the cell, staggered so the timeline fills chronologically. Champion years (we leave the detection hook in as `isChampion`; the actual champion-detection requires a season-end standings query which Phase B's seed will resolve) carry a 18px podium-gold star above the cell with a soft drop-shadow. On hover or focus of an active year, a tooltip appears below the track showing the year (telemetry-red), the team name (headline), best result of that year (`WIN`, `PODIUM`, or `P<n>`), and a gold "★ WORLD CHAMPION" line if applicable. The tooltip animates in with `opacity` + `y: 8` and is positioned absolute against the percentage along the track.

The recent-form panel below renders the last 5 races as `RecentFormPanel`. Five cards in a row on desktop, two-up on mobile. Each card has a thin team-color stripe on its left edge, the round number in mono data type, the race name in headline, the country code, and a podium-tinted pill showing the position text. Position 1 is podium-gold background, 2 is silver, 3 is bronze, top-10 is telemetry-red wash, anywhere else is a neutral surface tint, DNF/DSQ is neutral. Behind all five cards an SVG polyline draws a "trend line" connecting normalized finishing positions — better finishes pull the line up. The line animates its `pathLength` from 0 to 1 on scroll-into-view. The line sits at `opacity-50` so it's a whisper, not a chart.

The CTA section sits over a radial gradient tinted with the driver's current team color and uses `MagneticButton` for "Full career" pointing to `/career`. The headline next to the button reads `Every race. Every season. Every point scored.` in display-headline. This block is intentionally tall — `py-32 md:py-40` — because the whole page rhythm benefits from one big breath before the references.

The references section is restyled away from a bulleted list with ugly arrows into a structured two-column grid: editorial paragraph about data provenance on the left, source chips (Wikipedia and Wikidata QID) on the right. Each chip is a bordered pill that flips to telemetry-red on hover with a `north_east` arrow that shifts right.

### `/drivers/[slug]/career` — Career

The career page reuses the same `ParallaxHero` but at `height="md"` (60svh) — the tighter hero per brief. Same portrait. Same name + view-transition lock. Same right-edge team stripe. Below the hero, a 6-cell `StatStrip` with: STARTS, WINS, PODIUMS, POLES, FASTEST LAPS, POINTS — all numeric, all running CountUp animations, POINTS using `group: true` for thousands separator on Hamilton-tier totals.

The season-by-season section is the heart of this page. Each season is a `SeasonCard`. The closed state of a card is a single button-row with the year at display-lg (5xl mobile, 7xl desktop) and five columns of meta to the right: RACES, WINS (telemetry-red if > 0), POINTS (large display), BEST RESULT, championship position. The card uses Framer Motion's `layout` prop so it animates its own height changes smoothly. Click anywhere on the row, and `<AnimatePresence>` mounts a height-auto panel with `overflow: hidden`. Inside, race cards render in a responsive grid: 1 column on phone, 2 on small tablet, 3 on laptop, 4 on wide. Each race card has a team-color stripe on its left edge, round + country labels at the top, the race name in headline, the team name in mono caption, then a podium-tinted position pill bottom-left and a points number bottom-right. The points number runs CountUp when the panel opens — so expanding a season triggers a cascade of numbers ticking up. Each race card has its own entrance animation with a 25ms stagger by index, keyed to the open state so the cards re-cascade if the section is closed and reopened. The most-recent season is `defaultOpen`.

### `/teams/[slug]` — Team Profile

The team page replaces the portrait with a livery-driven gradient hero. The background is `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}AA 35%, #0f0f0f 90%)` so the page starts saturated in the team's color and fades to carbon-black at the bottom. Over that we lay the carbon-weave SVG tile at 25% mix-blend-overlay so the color reads as fabric rather than CSS. A telemetry-red radial sits bottom-right as the brand watermark. Top-right corner houses a championship badge — gold border at `#f5c945/50`, gold tinted background, gold number with CountUp + `×` + `CONSTRUCTORS' TITLES` label. The hidden conditional handles the not-yet-derivable case from Jolpica: until Phase B's Wikidata constructor ingest provides championship counts, this badge is gracefully suppressed rather than showing a fake number — this is the founder's no-fixtures rule.

The team name renders at display-xxl over the gradient with `text-shadow: 0 6px 60px rgba(0,0,0,0.45)` so it reads cleanly even over the brightest livery (McLaren papaya at peak saturation is hostile to white text without that). View-transition name `team-name-${slug}` morphs into the history page hero. Below the name, the current-season metrics render at display-headline scale: championship position as `P<CountUp>`, points-this-season with thousands group, wins count. These come from the constructor standings endpoint already in `jolpica`, with graceful absence if the team isn't on the current grid.

The stat strip below has 4 cards: BASE (with flag emoji), CURRENT GRID (count of drivers from results), SEASON (current year), and P-CHAMPS (titles, dot if unknown). All numeric values CountUp.

The driver roster section pulls every driver who started a race for this constructor in the last three seasons, sorted by most-recent first, capped at 8. Each driver card is a Link to `/drivers/${slug}`. The card is a transparent-bordered block whose `border-left` is colored with the team color at 4px; the surface is `bg-surface-container-lowest/70` with `backdrop-blur`. On hover the surface deepens to `bg-surface-container/70` with 500ms cinematic transition. The driver's code (e.g. `VER`) sits at the top in mono data type, then a typography-split name with first/middle in white and last name in telemetry-red (the same trick the homepage hero uses for editorial pull), then a bottom row with last season and a `→` glyph that shifts right on hover.

The CTA section is the same pattern as the driver CTA — magnetic button, radial wash, oversized headline — pointing at the history page. The MagneticButton is tinted with the team color (`bg={color}`), so a Ferrari history button is red, a Mercedes history button is petronas-cyan, etc. This is a small detail but it's the kind of thing that sells "designed-not-templated" instantly.

### `/teams/[slug]/history` — Heritage

The history page mirrors the team-profile hero treatment but at 60svh. Same gradient, same carbon weave, same vignette, same team-name lock-up with the same view-transition-name so the team name morphs as the user navigates.

Below the hero, the page is one component: `TeamHistoryDecade`. It groups all available seasons by decade (math: `Math.floor(year / 10) * 10`), renders a `DecadeTabs` strip with one tab per decade where data exists, and shows the seasons inside the currently-selected decade as a vertical stack of bar cards. The decade indicator is a single `motion.span` with `layoutId="decade-indicator"` so when you click `2010s`, the team-color background morphs across the tabs with a spring-physics transition (`stiffness: 240, damping: 28`). This is the exact pattern Linear's product nav uses, and the founder named Linear as a reference tier.

Each season card inside a decade carries: the year at display-5xl/6xl, the lineup of drivers as chips with mono data type, four stat columns (RACES, WINS, PODIUMS, POINTS), and a single horizontal points bar at the bottom showing that season's points as a fraction of the decade's max. The bar's width animates from 0 to its percentage on scroll-into-view, with the team color as its fill — or podium gold if this season is the decade's best. The "best of decade" card additionally gets a podium-gold ring (`ring-1 ring-[#f5c945]/60`) and a `★ BEST OF DECADE` data tag below the year. The decade switch animates the entire seasons block in/out with a vertical swap (`y: 24 → 0` enter, `0 → -24` exit, 500ms cinematic, `mode="wait"`). Each season card inside the active decade staggers in with 60ms delay per index.

Below the decade explorer, a single mono `SOURCE · JOLPICA F1` line preserves the honest sourcing.

---

## Cross-cutting Decisions

**View Transition API.** The `globals.css` addition wires up duration `600ms`/`700ms` and the `ease-cinematic` curve for the root group and all named groups. Every hero element that should morph carries an inline `viewTransitionName` (`driver-name-${slug}`, `driver-number-${slug}`, `team-name-${slug}`, `team-back`, `driver-back`). The `ViewTransitionLink` component wraps `next/link` and, when the browser supports `document.startViewTransition`, intercepts the click and runs the navigation inside the transition. Firefox and any older browser falls through to the normal Next router push without any visible regression. The transitions are not navigation-blocking; the CTA buttons remain plain `next/link` so accessibility (open-in-new-tab, prefetch) is untouched. The `ViewTransitionLink` is wired specifically on the profile-to-career link to make it the smoothest motion path for the most common user journey.

**Lazy load + blur-up.** All hero `<img>` elements have `loading="eager"` (they're the LCP element so we want them prioritized) and `decoding="async"`. The portrait `objectPosition` is `center 18%` to lock the face above the eventual text. Wikidata Commons URLs include `?width=1600` so we get a single-resolution crisp image without next/image config. (We do _not_ pipe these through `next/image` because Wikidata's `Special:FilePath` URLs need a `remotePatterns` whitelist; the brief explicitly defers next/image config.)

**Number formatting.** Every count uses tabular-nums (`fontVariantNumeric: 'tabular-nums'`) on the count-up span so the digits don't visibly jiggle during the animation as different glyph widths slot in. This is the difference between an animation that reads as premium and one that reads as a homework assignment.

**Typography scale.** Hero clamps used: driver last name `clamp(4.5rem, 18vw, 14rem)`; driver car number `clamp(5rem, 14vw, 11rem)`; team name `clamp(4.5rem, 16vw, 14rem)`; career H1 `clamp(3.5rem, 11vw, 8.5rem)`; history H1 `clamp(3.5rem, 11vw, 9rem)`. Section H2 lifts to `text-4xl uppercase md:text-6xl` — up from the previous `text-data` micro labels — directly addressing the founder's "text is too small" pain point. Editorial pull quotes sit at `text-lg md:text-xl` body / `text-xl md:text-2xl` lead.

**No em dashes.** Per founder veto, every em dash in copy is replaced with a middot (`·`), a forward slash, or proper words. The previous code had several `—`; they're now `·` or rewritten as full sentences. The single typographic apostrophe in `who's` was rewritten to `who has` rather than escaped, because escaped entities (`&apos;`) read worse than honest English.

**Glass morphism, named tiers.** The `globals.css` already defines `glass-medium`, `glass-pronounced`, and `glass-panel` tiers. I deliberately did NOT invent new glass treatments in these pages; everything that reads as glass uses Tailwind's `backdrop-blur-md` plus an opacity-tuned background-color over the existing carbon surface tokens. The stat strip cells, the season cards, the race cards, the decade tabs and the driver-roster cards all use this same recipe so the page reads as one material system rather than seven different glass-isms.

**Responsiveness.** Mobile-first per founder mandate. Stat strips collapse to horizontal scroll with snap on small viewports. Season-card header collapses to a stacked summary (`races/wins` mono caption + `points` number) rather than truncated columns. Driver-roster grid steps from 2 columns at phone width up through 3 on tablet, 4 on laptop. Decade tabs wrap with `flex-wrap` so they never overflow. Type clamps everywhere so no breakpoint produces a giant unreadable wall.

**Reduced motion.** The `ParallaxHero` reads `useReducedMotion()` and locks parallax `y` to `0%` when set. The `MagneticButton` short-circuits its `onMove` handler. The existing `@media (prefers-reduced-motion: reduce)` block in `globals.css` already zeroes animation/transition durations.

**Live data only.** No fixtures. The driver page derives debut year from `jolpica.getDriverResults(slug)` aggregated into a per-year team map. The team page pulls current `jolpica.getConstructorStandings` to surface live championship position + points + wins. The history page reuses the existing 10-season window — and honestly labels the Phase-B-pending gap rather than pretending to have pre-2016 data. Wikidata facts (DOB, place of birth, height, image) flow through `getDriverFactsFromWikidata` unchanged.

**Accessibility.** Every interactive element is a real `<button>` or `<a>`. The season-card button carries `aria-expanded` and `aria-controls`. The career-arc cells are focusable when active. Tooltips render with `role="tooltip"`. The hero parallax layers use `aria-hidden="true"` so screen readers skip the decorative chrome. Focus-visible inherits the global telemetry-red outline.

---

## What was deliberately NOT shipped (and why)

**Custom helmet SVG illustration on driver hero.** The brief tagged this as "Phase B Wave 7, optional". Building a generic helmet that scales tastefully across 20+ drivers without per-driver custom art is a trap — it'll feel templated. Better to leave the slot architecturally open (the `ParallaxHero` `children` accepts arbitrary right-side content) and ship per-driver helmet SVGs as a Phase-B asset pipeline.

**Champion-year detection on `CareerArc`.** Requires a season-end standings query per year to verify championship; `isChampion: false` is passed today so the gold-star machinery is wired and waiting for the Phase-B Wikidata enrichment that already covers "career titles".

**Founding year, base, principal, power unit on team profile.** Brief listed these but Jolpica doesn't expose them. The `StatStrip` swaps in `BASE / CURRENT GRID / SEASON / P-CHAMPS` honestly, matching the no-fixtures rule. Phase-B Wikidata constructor ingest will slot directly into the same `StatStrip` array.

**`next/image` for portraits.** Wikidata Commons URLs need a remotePatterns whitelist that the brief explicitly defers. The portrait still serves at 1600px with proper loading hints; replacing `<img>` with `<Image>` is a one-line swap once `next.config.ts` opens the Wikimedia origin.

These four omissions are forecasted, not forgotten — every one of them lands cleanly into the existing component contracts when Phase B ships.
