# UX / cinematic design brief — page-by-page motion choreography

# APEX — Motion & UX Design Brief
*Phase A→B handoff. Senior design engineer perspective. ms-level. No filler.*

---

## 1. DESIGN DNA STATEMENT

Apex looks like a black-box telemetry instrument that someone wrapped in cinematic editorial paper — dense data hidden under wide negative space, type-as-architecture, every transition feeling mechanically engineered rather than "designed." It moves like a paddock-shift gearbox: short, decisive, slightly overshooting, never bouncing; nothing easesInOut into a soft landing because F1 doesn't soft-land. It feels premium-quiet — the way [apple.com/airpods-max](https://www.apple.com/airpods-max/) reveals product copy at 1px scroll-per-pixel, the way [marcellopolicarpo.com](https://marcellopolicarpo.com) holds typography for half a second longer than feels safe, and the way [locomotive.ca](https://locomotive.ca) uses scroll-pinned chapters as the primary IA.

**Three studied references:**
1. **[apple.com/airpods-max](https://www.apple.com/airpods-max/)** — for scroll-locked product reveal choreography, ~3000ms pinned hero, hardware-only transforms, and the discipline of *one motion per viewport*.
2. **[igloo.inc](https://igloo.inc)** — for dark cinematic surface treatment, slow scroll-scrubbed reveals (no rubber-band), and the way they let video / WebGL breathe with 200vh of silence around it.
3. **[marcellopolicarpo.com](https://marcellopolicarpo.com)** — for type-as-hero, custom cursor restraint (one-state cursor, never gimmicky), and slow display weight reveals that feel editorial not flashy.

**Explicit anti-pattern rejection: [formula1.com](https://www.formula1.com)** itself — the bento-grid carousel-stack, the fluorescent red CTA noise, the "everything above the fold" panic, and the carousel-on-autoplay everywhere. Apex is the antithesis: one decision per viewport, generous silence, type before image, scroll before click.

Also explicitly rejected: the "Vercel template" look — gradient mesh blobs, glassmorphism cards floating on noise textures, marquee logo strips, and the universally-deployed `framer-motion` initial={{opacity:0, y:20}} fade-up that signals "AI-generated portfolio."

---

## 2. MOTION SYSTEM SPEC

### 2.1 Duration scale (locked tokens)

| Token | ms | Use case |
|-------|----|----|
| `motion.fast` | **180ms** | Hover state changes, button press, tooltip show, icon swap, focus ring appear, checkbox/toggle flip. Sub-perceptual feedback. |
| `motion.base` | **320ms` | Default. Card hover lift, accordion expand, nav dropdown open, tab switch, modal close, drawer slide-in, toast enter. |
| `motion.slow` | **600ms** | Hero text reveal, image cross-fade, route transition body, large card expand-to-detail, sticky header collapse, mega-menu pane swap. |
| `motion.cinematic` | **900ms** | Hero choreography beats, scroll-pinned section unlock, page-load logo lockup, route-transition full-bleed wipe, "scene change." |
| `motion.scrub` | **scroll-bound** | ScrollTrigger scrub:0.8 — for parallax, pinned reveals, telemetry sparkline draw-on-scroll. Never use a fixed ms here. |

**Rule:** if it's >900ms and not scroll-bound, you've designed wrong. F1 doesn't dwell.

### 2.2 Easing palette (locked)

```ts
export const ease = {
  // The Apex signature — slight overshoot at the tail. Use 80% of the time.
  apex:        [0.215, 0.61, 0.355, 1],     // a.k.a. easeOutCubic refined
  // Slow-in/slow-out for big scene changes. Reserved.
  cinematic:   [0.83, 0, 0.17, 1],          // easeInOutQuint
  // Sharp deceleration — telemetry / data updates.
  telemetry:   [0.16, 1, 0.3, 1],           // easeOutExpo
  // For exit only. Never use for enter.
  exit:        [0.7, 0, 0.84, 0],           // easeInQuint
  // Linear scrub. ScrollTrigger only.
  linear:      [0, 0, 1, 1],
};
```

| Curve | When |
|-------|------|
| `ease.apex` | DEFAULT. Buttons, cards, drawers, taps, list reveals. Confident, decisive landing. |
| `ease.cinematic` | Hero choreography, full-bleed route transitions, modal open from center, video chrome reveal. |
| `ease.telemetry` | Live timing number tick, lap delta sparkline animation, gear-change indicator, fuel/tyre bar update. Sharp, instrument-grade. |
| `ease.exit` | Always pair with `ease.apex` enter. Things leave faster than they arrive (220ms exit vs 320ms enter). |
| `ease.linear` | Only inside ScrollTrigger `scrub`. Never standalone. |

**Banned:** `easeInOutCubic` (looks AI), `easeOutBack` overshoot >1.05 (cartoonish), spring with `bounce > 0.1`.

### 2.3 Stagger patterns

| Pattern | Stagger | Direction | Use |
|---------|---------|-----------|-----|
| **Vertical list** (driver standings, news feed) | **40ms** | top→bottom | Standings table, article list, nav items |
| **Grid** (driver cards, team cards) | **60ms with `from: 'start'`** | row-major | `/drivers`, `/teams` |
| **Editorial rail** (horizontal stories) | **80ms** | left→right | Latest carousel, "more from this race" |
| **Telemetry burst** (live timing rows refresh) | **24ms** | top→bottom, fast | Live timing tower — must feel instrument-like |
| **Hero word-by-word reveal** | **60ms per word** | left→right | Display headlines on homepage, race detail |
| **Hero char-by-char** | **18ms per char** | left→right | Driver name on `/drivers/[slug]` only. Reserved. |

**Rule:** total stagger duration ≤ 600ms even for 30-item lists. After 600ms, freeze stagger and animate rest in unison. Users will not wait for the 17th item.

### 2.4 Hover lift / press depress micro-spec

**Cards (driver, team, article, race):**
```ts
hover:  { y: -4, scale: 1.012, transition: { duration: 0.18, ease: ease.apex } }
press:  { y:  0, scale: 0.985, transition: { duration: 0.12, ease: ease.apex } }
```
Shadow doesn't grow on hover — instead, an **inner top border** brightens from `border-white/8` → `border-white/22`. Brand red `#E10600` *never* appears on hover unless the card is a CTA. This is the discipline.

**Buttons (primary):**
```ts
hover:  { backgroundColor: '#FF1A0A', transition: 0.18 }   // +10% L
press:  { scale: 0.96, transition: 0.12 }
```
No translateY on buttons — they're cemented to the page, only the surface state changes.

**Nav links:**
Underline grows from `width: 0` to `width: 100%` in **220ms** with `ease.apex`, **transform-origin: left**. Never center-out.

**Telemetry numbers (live):**
On value change → flash background `#E10600/15%` for **120ms** then decay over **400ms** with `ease.telemetry`. The number itself never animates position — only the surface behind it.

### 2.5 Page transition language

**Strategy: hybrid View Transitions API + Framer `AnimatePresence` fallback.**

```ts
// app/layout.tsx — opt-in routes only
<ViewTransitions>
  <AnimatePresence mode="wait" initial={false}>
    {children}
  </AnimatePresence>
</ViewTransitions>
```

**Three transition tiers:**

1. **Sibling routes** (e.g. `/drivers` → `/drivers/verstappen`):
   View Transitions API with shared-element on the driver card → driver hero portrait. **600ms** `ease.cinematic`. The card *becomes* the page. This is the Marcello move.

2. **Section jumps** (`/drivers` → `/teams`):
   Full-bleed black wipe from right→left over **480ms**, content of new page revealed from left→right with same wipe. Total: **480ms wipe in + 320ms content reveal** with 80ms overlap.

3. **Hard navigations** (homepage → live timing):
   No transition. Snap. Live mode is a context shift — the user should feel they've entered a different room. **0ms.**

### 2.6 Reduced-motion fallbacks (per pattern, non-negotiable)

```ts
const prefersReducedMotion = useReducedMotion();
```

| Pattern | Normal | `prefers-reduced-motion: reduce` |
|---------|--------|----------------------------------|
| Hero choreography | 900ms cinematic sequence | Cross-fade only, 200ms |
| Scroll-pinned reveal | GSAP scrub, transform | `position: static`, no pin, content visible immediately |
| Stagger list | 40ms per item | All items 200ms fade-in together |
| Hover lift | `y: -4, scale: 1.012` | `border-color` change only |
| Custom cursor | Active | `cursor: default`, native cursor restored |
| Live timing flash | 120ms red flash | Border-left changes color, no flash |
| Page transition | View Transitions | Instant `display: block` swap |
| Lenis smooth scroll | Active | `lenis.destroy()`, native scroll |
| Track map pan | Spring | Instant snap |

GSAP gets `gsap.matchMedia` with `(prefers-reduced-motion: no-preference)` as a hard gate on every ScrollTrigger.

---

## 3. PAGE-BY-PAGE CHOREOGRAPHY

### 3.1 Homepage `/`

**Hero (ms-by-ms):**
- `0ms` — Page paint. Black `#0A0A0A` surface, single hairline rule at 12.5% from top.
- `0–200ms` — Top utility bar slides down from `y: -32` to `0`, opacity 0→1, `ease.apex`, **200ms**.
- `120ms` — Race ticker bar fades in beneath it (delayed overlap), **180ms**.
- `300ms` — Display headline "**THE SEASON IS A STORY.**" begins word-by-word reveal: 4 words × 60ms stagger = **540ms total**, each word `y: 20 → 0, opacity: 0 → 1, ease.apex 600ms`.
- `600ms` — Subhead (Hanken Grotesk) fades in below, **400ms**, `y: 12 → 0`.
- `900ms` — Primary CTA "Read the latest" fades in + small underline grows L→R **300ms** `ease.telemetry`.
- `1100ms` — Hero background video begins **opacity 0 → 1 over 1200ms**, `ease.cinematic`. Video starts at 0.4× speed, ramps to 1× over 800ms via `playbackRate` interpolation. This is the Apple move.

**Scroll-pinned sections (GSAP ScrollTrigger):**

```ts
// Section 2: Race countdown — pinned, scrubbed
ScrollTrigger.create({
  trigger: '#section-countdown',
  start: 'top top',
  end: '+=120%',           // pin for 1.2 viewports
  pin: true,
  scrub: 0.8,              // 0.8s smoothing
  anticipatePin: 1,
});

// Section 5: Driver of the moment — pinned, not scrubbed (uses timeline)
ScrollTrigger.create({
  trigger: '#section-driver-moment',
  start: 'top top',
  end: '+=100%',
  pin: true,
  scrub: false,
  onEnter: () => driverMomentTimeline.play(),
});
```

**Framer micro-interactions (5):**
1. **Race ticker countdown digits** — when seconds tick, the changing digit flips with a 180ms rotate-X 0→90→0 sequence (Apple Watch style).
2. **Section number badges** (`01 / 10`, `02 / 10` ...) — fade in 80ms before each section pin, lock in place during pin.
3. **"Read the latest" CTA** — magnetic cursor: button center attracts cursor within 24px radius via spring `{ stiffness: 150, damping: 15 }`. Disable on touch + reduced-motion.
4. **Editorial pull-quote (EB Garamond)** — drop-cap grows from 0→1× scale over 600ms `ease.cinematic`, body text streams in below.
5. **Footer countdown handoff** — when user scrolls past hero, the ticker countdown "moves" to top utility bar via shared-element transition. Continuity beat.

**Custom cursor:**
A 12px hollow ring `border-white/30`. On hover over interactive: scales to 32px and fills `bg-white/8`, mix-blend-mode: difference. On hover over video: shows "PLAY" text inside, ring grows to 56px. **Single cursor state per context** — never four different states.

**Typography sequencing:**
Display reveals word-by-word with `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` over 600ms, `ease.cinematic`. *Not* opacity fade-up — that's the AI-portfolio tell.

**Hover states:**
- Cards: see 2.4
- Hero video: cursor becomes PLAY ring, video dims to `brightness(0.7)` over 200ms
- Section nav dots (right edge): expand from 4px to 16px on hover, 180ms `ease.apex`

**Loading skeleton:**
Black surface, single hairline ruler animates left→right (300ms) → "APEX" wordmark appears at center → fades to hero. Total: **800ms**. Never use shimmer-gradient skeleton — that's bento-template energy.

**Empty state:**
Doesn't exist on homepage. Always at least the ticker.

**Error state:**
Full-bleed black. Single line of JetBrains Mono: `ERR_// session_unavailable`. One link below: "Take me home." That's it. Premium error = quiet error.

**Mobile <768px deltas:**
- Hero word-by-word reveal switches to line-by-line (3 lines × 100ms stagger).
- Background video pauses by default, autoplays only on tap. Battery + data discipline.
- ScrollTrigger pins → unpinned, sections become static stacks separated by 120vh.
- Custom cursor disabled.
- Mega menu becomes full-screen drawer (already in AppShell).
- Lenis scroll continues but with `lerp: 0.12` (slightly less smooth) — mobile users have stronger spatial memory of scroll position.

---

### 3.2 Schedule `/schedule`

**Hero (ms-by-ms):**
- `0–200ms` — Year selector "**2026**" slides in from `y: -16`, `ease.apex`.
- `200ms` — Display headline "**24 RACES. 21 COUNTRIES. 1 SEASON.**" word-stagger reveal, 60ms per word, total **900ms**.
- `400ms` — Globe / atlas SVG begins draw-on (stroke-dasharray animation), 1400ms, `ease.cinematic`. 24 race-circle dots fade in with 30ms stagger after globe completes.

**Scroll-pinned sections:**
```ts
// Globe → list handoff
ScrollTrigger.create({
  trigger: '#globe-section',
  start: 'top top',
  end: '+=80%',
  pin: true,
  scrub: 0.6,
  onUpdate: (self) => {
    globe.rotation.y = self.progress * Math.PI * 1.5;
    listContainer.style.opacity = self.progress;
  },
});
```

**Framer micro-interactions (4):**
1. **Race row hover** — country flag scales 1→1.06, race name underline grows L→R, race date shifts left 4px to make room for "**ROUND XX**" badge that slides in from right.
2. **Round badge** — JetBrains Mono `R01–R24`, monospaced so they vertically align, micro-shimmer on hover.
3. **"PAST / UPCOMING" filter chips** — selected state has 2px brand-red bottom border that morphs between chips via Framer `layoutId="filter-bar"`. This is the chef's kiss interaction.
4. **Track preview thumbnail** — appears 240ms after row hover, animated SVG outline of the circuit draws in 800ms via `stroke-dashoffset`.

**Custom cursor:** ring becomes magnifier (`+` icon inside) on track preview thumbs.

**Typography sequencing:**
List items stagger in 40ms top→down. After viewport-12 items, snap rest in unison.

**Hover states:**
Row hover: background `white/2`, left border 2px `brand-red`. No card lift here — it's a list, not a grid.

**Loading skeleton:**
24 rows of hairline rulers, each 1px tall, animate width 0→100% with 20ms stagger. Looks like a paddock pit board.

**Empty state:** "**SEASON UNAVAILABLE.**" + year selector to fall back.

**Error state:** Same JetBrains mono line + retry link.

**Mobile deltas:** Globe drops to a flat 2D atlas SVG. ScrollTrigger pin removed. Rows become thumb-tappable (min-height 64px).

---

### 3.3 Race detail `/schedule/[season]/[race]`

**Hero (ms-by-ms):**
- `0ms` — Black surface, then circuit SVG draws in from `stroke-dashoffset: 100%` → `0` over **1600ms**, `ease.cinematic`. Circuit drawn in `brand-red`.
- `400ms` — Race name "**MONACO GRAND PRIX**" appears below, word-stagger 60ms.
- `800ms` — Round badge "R07 / 24" + date + flag fade in **400ms**.
- `1200ms` — Sector labels (S1, S2, S3) drop onto circuit corners with 60ms stagger, `y: -8 → 0`.

**Scroll-pinned sections:**
```ts
// Pinned circuit hero: sector reveal on scroll
ScrollTrigger.create({
  trigger: '#circuit-hero',
  start: 'top top',
  end: '+=200%',
  pin: true,
  scrub: 0.8,
  onUpdate: (self) => {
    // 0-0.33: highlight S1; 0.33-0.66: S2; 0.66-1: S3
    highlightSector(Math.floor(self.progress * 3));
  },
});
```

**Framer micro-interactions (5):**
1. **Sector hover on circuit** — sector path stroke goes from `white/30` → `brand-red`, with adjacent corner badge expanding to show "**S1 — 18.4s avg, 287 km/h top**". 200ms `ease.apex`.
2. **Lap record card** — driver name + time, on hover the time digits cycle once (slot-machine, 600ms, ends on real value) — a wink to telemetry chic.
3. **Weather strip** (custom component, see §6) — animates between FP1/FP2/FP3/Quali/Race phases with horizontal scrub.
4. **Tyre compound chips** — C1–C5 chips with brand colors, hover scales 1.05, shows expected stint length tooltip.
5. **"Watch onboard"** CTA — magnetic cursor, expands to show "embed via official channel — opens in new tab" microcopy on 400ms delay.

**Custom cursor:**
When over circuit: cursor becomes a small marshal-flag icon. When over sector: shows sector number. Over driver dot: shows driver number badge.

**Typography sequencing:**
Headline word-stagger. Data table (lap-by-lap) streams in row-by-row with 24ms stagger when scrolled into view.

**Hover states:**
Driver-row hover in results table: background `white/3`, driver portrait thumbnail (32×32) animates in from right edge in **180ms**.

**Loading skeleton:**
Circuit silhouette drawn as a single hairline path, animating dashoffset slowly. Race name as a ruler that fills L→R. Feels engineered, not generic.

**Empty state:** "**RACE UPCOMING — LIGHTS OUT IN 04:12:33:08**" with the countdown.

**Error state:** JetBrains mono line.

**Mobile deltas:** Circuit hero unpinned, becomes a swipeable carousel of (Map / Sectors / Weather / Stats). Each is a full-bleed card. Pinned scrub doesn't work well on mobile so we lean into native swipe.

---

### 3.4 Driver standings `/results/[season]/drivers`

**Hero (ms-by-ms):**
- `0–200ms` — "**2026 / DRIVERS**" headline fade-in.
- `200ms` — Top 3 (P1/P2/P3) cards rise from `y: 60`, `opacity: 0`, with 100ms stagger, `ease.apex`, **600ms**.
- `800ms` — Position 4–20 standings table streams in row-by-row, 32ms stagger.

**Scroll-pinned sections:**
None. This is a data page. Pinning here would be design malpractice — users want to scan, not scroll.

**Framer micro-interactions (4):**
1. **Position number animation on load** — numbers tick from 99 → real position over 600ms, `ease.telemetry`.
2. **Points column** — on row hover, points value flashes brand-red background for 120ms.
3. **Driver portrait thumb** — 40×40 inside the row, on row hover scales 1→1.15 and a hairline accent strip in team color appears left of portrait.
4. **Compare drawer** — checkbox left of each row, when 2+ checked a sticky bottom drawer slides up in **320ms** with "Compare 2 drivers" CTA. Drawer uses `layoutId="compare-bar"` so it morphs as you add drivers.

**Custom cursor:** no custom behavior here — default plus link cursor. This page is read, not played with.

**Typography sequencing:**
Top-3 cards: driver name char-by-char reveal (18ms per char). Reserved for "the podium" — it earns the dramatic treatment. Rest of table: standard 40ms row stagger.

**Hover states:**
Row hover: `white/2` bg, left border in team color. Team color comes from team_id join — never a fixed brand red.

**Loading skeleton:**
3 podium card skeletons (rectangles with shimmer-disabled hairline borders) + 17 row hairlines streaming in.

**Empty state:** "**Season not yet started. Lights out in [countdown].**"

**Error state:** mono line.

**Mobile deltas:** Top 3 cards stack vertically instead of horizontal triptych. Compare drawer becomes a full-screen modal not a sticky bar.

---

### 3.5 Constructor standings `/results/[season]/teams`

**Hero:**
Mirrors §3.4 but with team liveries as the visual hook. P1 team gets a **subtle full-bleed brand-color wash at 4% opacity** behind the standings table, switching with the leader. (Currently Red Bull → near-black, McLaren → papaya wash, etc.)

**Scroll-pinned sections:** None.

**Framer micro-interactions (4):**
1. **Team logo lockup** in each row — animates from monochrome white to full-color on row hover over 220ms.
2. **Points-bar** — horizontal bar showing points relative to leader, draws from 0→% over 800ms on initial load, `ease.telemetry`.
3. **Driver lineup pills** — two driver portrait chips inside each team row, hover shows mini-stats.
4. **Team comparison hover** — hovering a team row shows a ghost-bar overlay on rows above/below showing point gap.

**Typography sequencing:** Same as drivers.

**Loading skeleton:** Identical to §3.4.

**Mobile deltas:** Background brand-color wash removed (battery), points bar shrinks to 80% width.

---

### 3.6 Drivers index `/drivers`

**Hero (ms-by-ms):**
- `0–200ms` — "**THE GRID**" eyebrow + "**2026 DRIVERS**" headline word-stagger.
- `300ms` — Filter chips (team filter, championship-year filter) fade in.
- `600ms` — Driver grid begins reveal — 4 columns × N rows, 60ms stagger row-major, each card `y: 24 → 0, opacity: 0 → 1`, `ease.apex`, **600ms** per card.

**Scroll-pinned sections:**
None on this index — let users scan.

**Framer micro-interactions (5):**
1. **Driver card hover** — portrait scales 1.04, helmet glints across with a `mask-image` linear gradient sweep over 800ms.
2. **Team color accent strip** at top of each card — grows from 40% width to 100% on hover, 220ms.
3. **Driver number** in giant JetBrains Mono behind portrait — scales 1.05 on hover.
4. **Filter chip selection** — `layoutId="driver-filter-active"` morphs between chips.
5. **Sort dropdown** — opens with each option staggering in at 30ms.

**Custom cursor:** standard ring. On card hover, ring scales to 40px, mix-blend-mode: difference (creates a beautiful inverted halo over the driver portrait).

**Typography sequencing:**
Headline word-stagger. Cards: name fades in with portrait, no per-char on index (reserved for `/drivers/[slug]`).

**Hover states:** see 2.4 card spec + above.

**Loading skeleton:**
20 driver-card silhouettes — rectangle + circle (portrait placeholder) + 2 hairlines (name + team). Hairlines pulse opacity 0.4→0.6→0.4 over 1200ms `ease.cinematic`.

**Empty state:** Filter produced no result → "**No driver matches.**" + clear-filter chip.

**Error state:** mono line.

**Mobile deltas:** Grid drops to 2 columns. Helmet glint disabled (perf). Filter chips become a single dropdown.

---

### 3.7 Driver profile `/drivers/[slug]`

**Hero (ms-by-ms) — the SHOWSTOPPER:**

- `0ms` — Page paint. Surface is team-color-tinted at 6% over black.
- `0–800ms` — Hero portrait fades in from `opacity: 0, scale: 1.04 → 1`, `ease.cinematic`. Slow, premium.
- `200ms` — Driver number JetBrains Mono in massive scale (`12rem`) renders behind portrait, `clip-path` reveal bottom-to-top over **900ms**.
- `400ms` — Driver name **char-by-char reveal** (Anybody 800, ~6rem), 18ms per char. For "MAX VERSTAPPEN" = 14 chars × 18ms = **252ms total reveal**.
- `700ms` — Eyebrow "**TEAM · NATIONALITY · #N**" fades in (Hanken Grotesk).
- `1000ms` — Career stat strip (Wins / Podiums / Poles / Championships) streams in left→right, 80ms stagger, each number ticking from 0 to real value over 600ms `ease.telemetry`.

**Scroll-pinned sections:**
```ts
// Career timeline pin
ScrollTrigger.create({
  trigger: '#career-timeline',
  start: 'top top',
  end: '+=300%',                // pin for 3 viewports — long story
  pin: true,
  scrub: 1.2,                   // generous smoothing for narrative
});
```
The career timeline becomes the spine of the page — pinned, scrubbed, reveals each season as user scrolls.

**Framer micro-interactions (5):**
1. **Stat ticker** — wins/podiums numbers tick on load and tick again with 80ms flash when filter is changed.
2. **Season selector** — pills along career timeline, on hover the corresponding season's data fades in below.
3. **Helmet 360 viewer** — drag-to-rotate helmet image sequence (or 3D glb later). Cursor changes to grab.
4. **"Compare with…" CTA** — opens a search-and-pick drawer with driver list, 320ms slide.
5. **Quote pull** — EB Garamond italic, fades in with a left-edge brand-red rule that grows from 0→100% height on scroll into view.

**Custom cursor:**
Over portrait: cursor becomes a "**360°**" badge — a tease that you can rotate the helmet.

**Typography sequencing:**
THE char-by-char reveal is reserved for this page's hero. Don't use it elsewhere. The driver name is the brand here.

**Hover states:** Stat hover shows tooltip with breakdown (e.g. wins by track). Quote highlights with brand-red left rule.

**Loading skeleton:**
Portrait silhouette as a rectangle, driver number as a giant hairline frame, stat strip as 4 ruler lines. Feels like a dossier loading.

**Empty state:** Doesn't exist — driver always has at least name + team.

**Error state:** "**Driver record sealed.**" — playful F1-flavored 404.

**Mobile deltas:** Driver number behind portrait scales down to 6rem. Career timeline pin removed, becomes a vertical accordion. Helmet 360 disabled (perf).

---

### 3.8 Teams index `/teams`

**Hero:** "**10 TEAMS. 1 CHAMPIONSHIP.**" word-stagger reveal.

**Grid:** 2 cols × 5 rows of large team cards. Each card uses full-bleed team color at 8% opacity behind a hairline frame. Logo top-left, principal/HQ bottom-right, "**MEET THE TEAM →**" bottom-left.

**Scroll-pinned sections:** None.

**Framer micro-interactions (4):**
1. **Card hover** — background color washes from 8% → 14% opacity over 220ms.
2. **Team logo** — desaturated by default, full-color on hover.
3. **Driver pair portraits** — slide in from right edge on card hover, 200ms with 60ms stagger between drivers.
4. **"Established YYYY"** label — animates in last on initial load.

**Custom cursor:** standard.

**Loading skeleton:** 10 large hairline-framed rectangles streaming in row-major.

**Mobile deltas:** Grid → 1 col. Card height reduces 30%.

---

### 3.9 Team profile `/teams/[slug]`

**Hero (ms-by-ms):**
- `0ms` — Team color wash at 8% opacity behind black.
- `0–600ms` — Team logo lockup at top-center fades in + scale 0.96 → 1.
- `300ms` — Headline "**SCUDERIA FERRARI**" word-stagger, this time with Anybody 700 (one weight lighter than driver page — team is institution, driver is individual).
- `600ms` — Two driver portraits slide in from outside-in (left driver from left, right from right), `ease.cinematic`, **800ms**.
- `1000ms` — Stat strip (Championships / Wins / Founded / Base) streams.

**Scroll-pinned sections:**
History timeline pinned for **+=250%**, scrub 1.0.

**Framer micro-interactions (4):**
1. **Driver portrait swap** — hovering team logo cycles through past team principals (last 5), 400ms cross-fade each.
2. **Livery year selector** — horizontal scrub through team's car liveries across years, each car as a flat illustration.
3. **Championship count odometer** — on scroll into view, counts up.
4. **Factory map** — small map of team HQ location, on hover zooms in.

**Custom cursor:** over the principal photo: shows "**TEAM PRINCIPAL**" label.

**Loading skeleton:** Like driver but symmetrical (two portrait silhouettes).

**Mobile deltas:** Driver portraits stack vertically. History timeline unpinned.

---

### 3.10 Latest `/latest`

**Hero:**
- `0–200ms` — "**LATEST**" eyebrow + "**THE PADDOCK, IN INK.**" word-stagger.
- `400ms` — Featured article hero card fades in + image scales 1.04 → 1 over 1000ms, `ease.cinematic`.
- `800ms` — Article rail begins row-stagger.

**Scroll-pinned sections:** None. Editorial pages stay scannable.

**Framer micro-interactions (5):**
1. **Article card hover** — image zooms 1→1.04 over 600ms, title underline grows L→R, "**READ →**" CTA fades in from `opacity: 0, x: -8`.
2. **Category filter chips** — `layoutId="category-active"` morph.
3. **Reading time** — pill with JetBrains Mono "**5 MIN READ**", flashes brand-red on hover.
4. **Editorial quote pull cards** — interleaved between article cards every 6 items, EB Garamond italic, brand-red left rule.
5. **Infinite scroll loader** — when user nears bottom, a hairline ruler at viewport bottom progressively fills as fetch resolves.

**Custom cursor:** over article card: cursor becomes "**READ**" text inside ring.

**Loading skeleton:**
Featured: large rectangle + 3 hairlines (kicker / title / dek). Rail: 6 smaller skeletons. Hairlines pulse.

**Empty state:** "**No stories yet — back soon.**" with a subscribe nudge.

**Mobile deltas:** Featured card height reduces. Rail becomes 1 column. Cursor disabled.

---

### 3.11 Article detail `/latest/article/[slug]`

**Hero (ms-by-ms):**
- `0ms` — Kicker (category, date, reading time) fades in, `y: 8 → 0`, **300ms**.
- `200ms` — Headline word-stagger (could be 1-3 lines), 60ms per word, ease.cinematic.
- `Each line +400ms` — Subhead fades in.
- `800ms` — Featured image fades in from `opacity: 0, scale: 1.02`, **1200ms** `ease.cinematic`.
- `1400ms` — Author byline appears below image.

**Scroll-pinned sections:**
- Reading progress bar pinned at top, scrub-linked to article body scroll.
- *Optional:* if article has a chapter structure (long-form), each chapter title pins for `+=80%` of viewport.

**Framer micro-interactions (5):**
1. **Drop cap** in first paragraph (EB Garamond, 4× line-height) — scales from 0 → 1 over 600ms when scrolled into view.
2. **Pull-quote callouts** — slide in from left edge with brand-red rule growth, 600ms ease.cinematic.
3. **Inline image reveal** — `clip-path: inset(0 0 100% 0)` → `inset(0 0 0 0)` over 800ms, mask reveal not fade.
4. **Footnote tooltips** — hover footnote number, tooltip pops in 180ms.
5. **Share rail** (left edge, sticky) — icons fade in 800ms after article hero, subtle hover lift.

**Custom cursor:**
Standard. Over pull-quote: cursor becomes a quote-mark icon. Over inline image: zoom-glass icon.

**Typography sequencing:**
Drop cap. Paragraphs do not animate per-paragraph — that ruins reading flow. Only chapter titles and inline media animate on scroll.

**Hover states:**
Inline link: underline grows L→R 180ms.

**Loading skeleton:**
Hairline rulers stacked, each animating width 0→100% with 30ms stagger. Looks like a printed-newspaper proof loading.

**Empty state:** Doesn't exist — article exists or 404s.

**Error state (404):** "**The story you're looking for left the pit lane.**" One link: "Back to Latest →".

**Mobile deltas:** Drop cap reduces to 3× line-height. Share rail moves to bottom sticky bar. Reading progress bar stays at top.

---

### 3.12 Video index `/video`

**Hero (ms-by-ms):**
- `0–200ms` — "**VIDEO**" eyebrow + "**WATCH THE WEEKEND.**" word-stagger.
- `400ms` — Featured video card — thumbnail fades in, **PLAY ▶** badge scales 0.9 → 1 with `ease.apex` 320ms.
- `800ms` — Video grid streams in (4 cols desktop, 60ms stagger).

**Scroll-pinned sections:** None.

**Framer micro-interactions (5):**
1. **Thumbnail hover preview** — 4-second silent muted preview loop fades in over 240ms (only if data-saver off + reduced-motion not set).
2. **Duration pill** — JetBrains Mono "**12:34**", flashes on hover.
3. **PLAY badge** — magnetic cursor, on hover scales 1.08 and ring around it pulses once.
4. **Category tabs** — `layoutId="video-tab-active"` morph.
5. **Embed disclaimer** — "Hosted via official channel — opens in new tab" microcopy fades in 400ms after card hover.

**Custom cursor:** over video thumb: "**PLAY**" text inside ring.

**Loading skeleton:** Card silhouettes with hairline play-badge ghosts.

**Empty state:** "**No clips yet.**"

**Mobile deltas:** Grid → 2 cols. Thumbnail previews disabled (data discipline). Tap to navigate to embed page.

---

### 3.13 Live timing `/live/timing`

**THIS PAGE IS A DIFFERENT ROOM. Everything shifts.**

**Hero (ms-by-ms):**
- `0ms` — Page paint. Surface shifts from `#0A0A0A` → `#070707` (one shade darker = "we're in mission control").
- `0–200ms` — Top utility bar gets a 1px brand-red bottom border that pulses opacity 1 → 0.4 → 1 over 1600ms (signature live indicator).
- `0–300ms` — "**LIVE — SAO PAULO GP — RACE — LAP 18 / 71**" header types in (JetBrains Mono) char-by-char, **18ms per char**.
- `300ms` — Timing tower (driver rows) streams in top→down, 24ms stagger, `ease.telemetry`. 20 drivers × 24ms = **480ms** to fully populate.
- `800ms` — Right rail: track map + race control feed fades in.

**Scroll-pinned sections:** None. Live mode = no scroll choreography. Everything is above-the-fold or in a scrollable rail.

**Framer micro-interactions (5):**
1. **Position change** — when driver moves up: row slides up smoothly via Framer `layout` prop, with a brief left-edge green flash (120ms). Moves down: red flash. Both fade over 400ms.
2. **Sector colors** — sector cells flash purple (fastest), green (personal best), yellow (slower). Each flash 80ms in, hold 200ms, decay 600ms.
3. **Gap to leader** — digit only animates when value changes, flips with vertical odometer, 200ms ease.telemetry.
4. **Tire compound icon** — pulses on pit stop (within last 3 laps).
5. **DRS indicator** — small chip lights up when DRS enabled (green dot pulses).

**Custom cursor:** disabled. This page demands precision — native cursor only.

**Typography sequencing:** char-by-char for the header, no fancy stagger after. This is an instrument.

**Hover states:** Driver row hover — full row gets `white/3` background, mini-telemetry sparkline expands to the right.

**Loading skeleton:**
Driver tower as 20 hairline rows. Header as ruler. **No shimmer** — live mode skeletons are static, breathing slowly (opacity 0.4 → 0.6 → 0.4 over 1600ms, no diagonal sweep).

**Empty state:** "**No session active. Next race: [countdown].**" with a link to schedule.

**Error state:** "**Telemetry feed interrupted. Reconnecting…**" + spinning hairline arc (rotates 360° over 1200ms, infinite).

**Mobile deltas:**
- Tower collapses to top 6 drivers visible, rest scrollable.
- Track map moves to top, swipeable between map / driver tower / race control.
- Sector flashes desaturated (battery saving).
- Position-change animations capped at 200ms.

---

## 4. TRACK MAP INTERACTION SPEC

**Used on:** `/live/track` and as the hero of `/schedule/[season]/[race]`.

### 4.1 Pan / zoom UX
- Pan via drag, momentum-decelerated with `ease.apex` over 800ms after release.
- Zoom via pinch (touch), scroll-wheel (desktop), and `+/-` buttons in bottom-right.
- Zoom levels: `0.5×` (full circuit + region) → `1×` (default circuit view) → `2×` (sector close-up) → `4×` (corner detail). Snap to nearest with 320ms `ease.cinematic` on release.
- Double-tap to zoom-to-cursor-location at 2×.
- Cursor over map: becomes a crosshair `+`.

### 4.2 Sector highlight on hover
- Map divided into 3 sector paths (S1, S2, S3).
- Hover: sector stroke goes `white/30` → `brand-red`, **180ms** `ease.apex`.
- Adjacent badge expands from 32px → 280px wide showing live sector data (best lap, fastest driver in sector, avg speed).
- Other sectors dim to `white/10` over 200ms — focus discipline.

### 4.3 Driver dot interaction
- Each driver = a 12px circle, team color fill, white border, driver number inside in JetBrains Mono.
- Dots move via `layout` animations with `ease.telemetry`, lerp position updates from WS feed.
- Hover: dot scales 12px → 24px over 180ms, mini-callout appears 8px above showing `name + speed + gear + DRS`.
- Click: opens telemetry overlay (§4.4).

### 4.4 Telemetry overlay on click
- Bottom-edge sheet slides up over 320ms `ease.apex`, occupying 33vh.
- Shows: speed trace, throttle/brake trace, gear, RPM, DRS state, last 3 lap times, current tire compound + age.
- Pinning the sheet (click pin icon): sheet remains visible while user pans map.
- Close: sheet slides down 280ms `ease.exit`.

### 4.5 Animation while session live
- Driver dots update on each WS tick (~250ms). Use Framer `layout` with custom `transition={{ type: 'tween', duration: 0.25, ease: 'linear' }}` to match the tick cadence — *not a spring*, because springs visually de-sync from real telemetry.
- Yellow flag: corresponding sector pulses yellow (background `#FFB800/20%` flash, 200ms in, 400ms hold, 400ms out, repeats).
- Safety car deployed: full circuit gets a 2px yellow rule moving along its path (chase-light effect) at 800ms per lap. Distinctive.
- Red flag: all driver dots desaturate to white, full circuit overlaid with red `#E10600/30%` translucent wash, **400ms** fade-in.

---

## 5. RACE-DAY LIVE MODE INTERACTION LANGUAGE

When session is LIVE, the entire site shifts mood. This is the most distinctive design move Apex makes.

### 5.1 Color shift
- Surface darkens one notch: `#0A0A0A` → `#070707`.
- Brand red gets a +6% saturation boost on accents (CTAs, flashes).
- A 1px brand-red bottom rule appears on the top utility bar, pulsing opacity 1 → 0.4 → 1 over 1600ms with `ease.cinematic`. Single live indicator across the whole site.
- Any "LIVE" badge globally uses a pulsing dot left of the word.

### 5.2 Type-density shift
- Body text size reduces from 16px → 15px globally during live (more info per viewport).
- Line-height reduces from 1.6 → 1.45.
- Numeric data switches universally to JetBrains Mono — even places that were Hanken in non-live mode.
- Display headlines get slightly tighter tracking (-1% → -2%).

### 5.3 Layout shift
- Race ticker bar (already in AppShell) expands from 48px → 72px height, gains a mini scoreboard: position 1-2-3 + leader's last lap.
- Mega-nav sticky behavior: instead of collapsing on scroll-down, stays pinned (you need to switch surface fast during a race).
- A new sticky bottom-right pill appears: "**WATCHING SAO PAULO — LAP 18/71 — [Go to Live]**". Tap → routes to `/live/timing`. Pill survives across routes (persisted in shell).

### 5.4 Spoiler mode (Apex's signature opt-in)
- Setting toggled in user profile + cookie-stored. Two states: **Spoiler-safe ON / OFF**.
- When ON:
  - Driver standings page shows results for current race blurred with a 12px gaussian blur + a translucent overlay: "**Race in progress. Tap to reveal.**"
  - Article cards mentioning result get a blur + "**This article contains race results. Tap to reveal.**" microcopy.
  - Video thumbnails of race highlights blurred.
  - Reveal animation: blur transitions from 12px → 0 over 400ms `ease.cinematic`, opacity overlay fades 200ms.
- When OFF: all results visible normally.
- Toggle UI: top utility bar gets a small eye icon, eye-open = spoilers visible, eye-closed = spoilers hidden. Hovering shows label. This is huge for global F1 fans in different timezones — and it's the kind of detail that earns word-of-mouth.

---

## 6. CUSTOM COMPONENTS DESIGNED

Components no other F1 site has. Apex's competitive moat.

### 6.1 `<StintRibbon />`
**Visual:** Horizontal ribbon, full lap-range width, segmented into colored stints by tire compound (C1-C5 brand colors). Hovering shows lap range + tire age + pit times. Driver name on left, total stops on right.
**Interaction:** Hover a stint segment → expands by 8% in height, tooltip shows compound + lap range. Click → routes to that lap in race-detail timeline.
**Appears on:** Race detail page (per driver), driver profile page (stint history aggregation).

### 6.2 `<UndercutCalculator />`
**Visual:** Two driver pickers stacked vertically with team-color accent. Below: an animated bar showing "**Pit now → exit P5 (loss: 4 positions, recovery: 12 laps)**". Brand-red bar if undercut fails, green if succeeds.
**Interaction:** User picks 2 drivers, sets a lap. System runs delta math via Jolpica + current tire age. Result animates in over **800ms** with `ease.telemetry`.
**Appears on:** Race detail (during live), live timing sidebar.

### 6.3 `<SectorDeltaSparkline />`
**Visual:** Tiny 80×24px JetBrains Mono inline sparkline showing delta to leader over last 10 laps. Color shifts: green where driver gained, red where lost.
**Interaction:** Hover → expands to 320×64px panel with sector-by-sector breakdown.
**Appears on:** Live timing tower (next to each driver row), driver profile (recent-form widget).

### 6.4 `<PitWindowGauge />`
**Visual:** A circular gauge, 64×64px, showing "**OPEN / CLOSED**" state with a hand sweeping clockwise. When pit window opens, gauge needle flashes green and rotates 90° over 600ms `ease.telemetry`.
**Interaction:** Click → opens a panel showing optimal pit lap, tire choice, expected delta.
**Appears on:** Race detail during live mode, live timing sidebar.

### 6.5 `<WeatherStrip />`
**Visual:** Horizontal strip showing session-by-session weather (FP1 → FP2 → FP3 → Q1 → Q2 → Q3 → Race). Each session block colored by condition (dry: warm gray, wet: cyan, mixed: gradient). Temperature + rain % below.
**Interaction:** Scrub horizontally to preview weather across the weekend.
**Appears on:** Race detail page.

### 6.6 `<SafetyCarLog />`
**Visual:** A chronological log of safety-car / VSC / red-flag periods within a race. Each entry has lap range, cause, duration. Yellow left rule for SC, white for VSC, red for red-flag.
**Interaction:** Click an entry → jumps to that lap in the race-detail timeline.
**Appears on:** Race detail page, post-race only.

### 6.7 `<HeadToHeadGraph />`
**Visual:** A clean horizontal bar showing qualifying H2H + race H2H between two teammates across season. Bar split with team-color and a mirrored ghost-color for the second driver.
**Interaction:** Hover bars to see race-by-race numbers.
**Appears on:** Team profile, driver profile.

### 6.8 `<CornerCommentaryCard />`
**Visual:** A small card showing one corner's historical lore — "**Eau Rouge** — first taken flat in 1985." With a small SVG inset of the corner shape.
**Interaction:** Click → opens an article or video specifically about that corner.
**Appears on:** Race detail (corner deep-dive), hover over circuit corner badges.

---

## 7. DARK-ONLY DEFENSE OR CHALLENGE

**PID §21 says dark-only. I defend it — with one nuanced exception.**

### Defense
F1 is a night-paddock sport. Practice sessions, qualifying, races regularly run into dusk and night. The viewing context is bedroom + couch + late-night Europe streaming. A light theme would actively hurt the brand. Plus, dark mode locks our identity: every site with dual-theme has a slightly diluted brand. Apple Music, Notion, Linear — strongest as dark-first.

Furthermore, dark surfaces give us:
- Brand red `#E10600` reading as a precision color, not a marketing color.
- Cinematic photography reads with mood (drivers backlit, tarmac shimmer).
- Easier eye-load over long sessions.
- Free OLED battery savings on mobile.

### Challenge — long reads only
Long-form article reading on dark for 8+ minutes induces eye fatigue. So I propose **one editorial-only treatment**:

**Editorial Paper Mode** — opt-in on article detail pages only, via a small `Aa` icon top-right of the article:
- Surface shifts from `#0A0A0A` → `#1A1814` (a paper-warmth dark).
- Body text shifts from `#E5E5E5` → `#E8E2D4` (warm parchment).
- Drop cap turns from white to a muted `#C9A875` (champagne).
- Code blocks / pull quotes unaffected.
- No theme switcher in nav — discoverable per article, persisted per-user.

This is the parchment-on-dark editorial mode. It does not break the system; it deepens it. It earns Apex the reputation of "the site that thinks about reading."

---

## 8. A11Y WITHOUT SACRIFICING CINEMATIC

### 8.1 Keyboard nav of mega menu
- Tab into MegaNav → top-level item focused with 2px brand-red outline + 2px offset (visible against any background).
- `Enter` / `Space` / `↓` opens mega panel.
- `Tab` cycles through panel items in document order.
- `Esc` closes panel, returns focus to top-level item.
- `↑ / ↓ / ← / →` arrow key navigation within mega panel grid.
- Focus trap inside panel while open.

### 8.2 Screen-reader announcements for live timing
```html
<div aria-live="polite" aria-atomic="false" class="sr-only" id="live-announcer">
  <!-- Updated when material events happen, not every tick -->
</div>
```
**Announce:** position changes, pit stops, fastest laps, safety car deploy/withdraw, red flag, session start/end.
**Don't announce:** every gap update (every 250ms would be a SR nightmare). Throttle to one announcement per 2s minimum, deduped.

### 8.3 Focus management on route change
On every route transition (Next.js `App` router), `<main>` receives `tabindex="-1"` and `.focus()` after the transition completes. Page heading announced via SR. This is standard but consistently missed.

### 8.4 Reduced-motion graceful degradation
Already specified in 2.6. Every page tested with DevTools "Emulate prefers-reduced-motion: reduce" before merge. Lighthouse a11y target ≥95 stays.

### 8.5 Color contrast discipline
- All text on `#0A0A0A`: must be ≥ `#9CA3AF` (4.5:1) for body, ≥ `#737373` (3:1) for non-essential.
- Brand red `#E10600` text on `#0A0A0A`: contrast = 4.62:1 ✓
- Brand red on white surfaces (rare, modal context): forbidden — flip to `#A30400`.

### 8.6 Custom cursor a11y
- Custom cursor disabled if `prefers-reduced-motion: reduce`, if touch device, if user is using keyboard nav (detected via `:focus-visible` activation).
- Native cursor restored everywhere it's needed for accuracy (form inputs, live timing).

---

## 9. PERF DISCIPLINE FOR MOTION

### 9.1 Allowed animatable properties
**Only these:**
- `transform` (translate3d, scale, rotate)
- `opacity`
- `filter` — sparingly (blur is expensive; cap at 16px and only on small areas)
- `clip-path` — for editorial reveals, but watch composite layer count
- `mask-image` (for the helmet glint sweep) — fine on modern browsers

**Banned in animations:**
- `top`, `left`, `right`, `bottom` — triggers layout
- `width`, `height` — triggers layout (except when using `transform: scaleX/Y`)
- `margin`, `padding` — layout
- `background-color` on >300px elements — paint cost (use a colored overlay div with opacity instead)
- `box-shadow` animations on cards — use a pre-rendered inset border swap instead

### 9.2 will-change discipline
- `will-change` applied only **just before** animation (via Framer's `whileHover` or GSAP `onStart`) and **removed** immediately after (`onComplete`).
- Never set `will-change: transform` globally on a class. Memory hog.
- Audit via Chrome DevTools "Layers" panel — no more than 12 composite layers per viewport.

### 9.3 requestAnimationFrame discipline
- All scroll-linked animation goes through Lenis (which rAF-loops internally). Don't add second rAF loops.
- GSAP ScrollTrigger already syncs to rAF; don't manually rAF tween updates.
- For canvas / WebGL (track map): single rAF loop, throttled to 60fps with `requestAnimationFrame` checks; drop to 30fps if last 60 frames averaged >18ms.

### 9.4 Lighthouse perf protection
- LCP ≤1.8s desktop / 2.5s mobile 4G — already in PID §17.
- INP ≤200ms — ban anything that runs >50ms on the main thread post-hydration.
- CLS = 0 — every image has `width`/`height`, every dynamic block has reserved space.
- Hero video: `preload="metadata"`, `<source>` ordered by efficiency (AV1 → WebM → MP4).
- GSAP loaded as dynamic import, ScrollTrigger registered only on routes that use it.
- Framer Motion: import individual primitives (`m.div` not `motion.div`) + wrap in `<LazyMotion features={domAnimation}>`. Cuts bundle ~25KB.
- Lenis: instantiated only on routes that benefit; killed on `/live/timing` (live mode = native scroll for precision).

### 9.5 Memory cap
- 60fps on mid-tier Android (Pixel 6a, Snapdragon 695) is the bar.
- Profile in Chrome DevTools throttled "Mid-tier mobile" (4× CPU slowdown) — every hero must hold 50fps minimum.
- Anything that drops below 30fps gets cut.

---

## 10. PROTOTYPE / VALIDATION PLAN

Three high-stakes interactions to validate BEFORE committing to Next.js build:

### 10.1 Driver profile char-by-char hero with team-color tint
**Where:** CodePen + Framer prototype.
**Validate:**
- Does the 18ms char stagger feel premium or twitchy at 14+ characters?
- Does the team-color tint at 6% read against the portrait or wash it out?
- Does the giant driver number behind portrait `clip-path` reveal lag on mid-tier Android?
**Pass criteria:** 60fps held on Pixel 6a, "wow" reaction from 3 test users.
**Time:** 1.5 days.

### 10.2 Track map driver-dot live updates at 4Hz
**Where:** Standalone HTML + Lenis + Framer Motion + mock WS feeder.
**Validate:**
- Does the `layout` animation at 250ms tick cadence visually sync with feed?
- Does pan/zoom feel responsive while dots are tweening?
- Does telemetry overlay sheet stay 60fps when sliding up over animated map?
**Pass criteria:** 50fps minimum on Pixel 6a with 20 dots updating + map pan simultaneously.
**Time:** 2.5 days.

### 10.3 Scroll-pinned race detail circuit hero (sector reveal)
**Where:** CodePen with GSAP ScrollTrigger.
**Validate:**
- Does the +=200% pin feel right or do users scroll past confused?
- Does the sector progress trigger feel natural or mechanical?
- Does Lenis + ScrollTrigger interplay drop any frames?
**Pass criteria:** Test 5 users — at least 4 understand the sector reveal without explanation. 60fps held.
**Time:** 1 day.

### 10.4 Mid-tier Android scroll perf validation
**Process:**
1. Deploy each prototype to a Vercel preview URL.
2. Test on real Pixel 6a (mid-tier reference) and one Samsung A-series (lower-mid).
3. Use Chrome DevTools Remote Debugging → Performance tab.
4. Record 30s of scroll through hero + first 2 sections.
5. Targets:
   - FPS ≥50 average, ≥40 minimum
   - Long tasks: zero >100ms on main thread post-load
   - Memory: <80MB JS heap after 60s scroll
6. If any prototype fails: cut motion intensity 30% (e.g. char-by-char becomes word-by-word, scrub 0.8 becomes 1.2 for smoother feel), re-test.

### 10.5 Stakeholder sign-off before Next.js commit
For each of the three prototypes:
- Founder review (you, ShAuRyA)
- Optional: 3 F1-fan friends as user-test panel
- Document feedback in `/docs/motion-validation.md`
- Only after sign-off do these get implemented in the Next.js codebase.

This protects the Phase A baseline from being wrecked by an unproven motion idea, and keeps Lighthouse perf ≥90/80 sacred.

---

## CLOSING POSTURE

Apex doesn't compete with formula1.com on data. It competes on **feel**. Every interaction in this brief is engineered toward one feeling: "**This was made by someone who watches every race.**"

Motion is not garnish. Motion is the brand.

Ship the three prototypes. Validate Android. Then build.

— *End of brief.*
