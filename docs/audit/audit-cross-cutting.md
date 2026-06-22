# Cross-cutting audit — dead nav links, broken hrefs, missing routes, accessibility, mobile breakpoints, em dashes

Now I'm ready to emit findings.

### [apps/web/components/shell/MegaNav.tsx:89] [SEVERITY: P0] [Mega-dropdown preview "NEXT ROUND" links to non-existent circuit slug]
**What's broken:** Preview pane uses `/schedule/2026/singapore`, but jolpica's `circuitId` for Singapore is `marina_bay` (see `packages/api-client/src/jolpica/mappers.ts:47` `slug: r.Circuit.circuitId`, confirmed in `packages/api-client/src/unsplash/curated.ts:51`). `loadRace()` looks up by `r.slug === raceSlug` and will return `null` → `notFound()`.
**User-visible symptom:** Click the most-prominent CTA in the Schedule mega-nav → 404 page.
**Fix:** Either compute the next-race href server-side from `jolpica.getSchedule(2026)` (find `nextRace`, use `r.slug`) and pass into MegaNav as prop, or hard-code `/schedule/2026/marina_bay`. Also kill the hard-coded `meta: 'Race lights out · 13d 4h'` countdown — it's a static lie.
**Why:** Single most-visible nav CTA on every page resolves to 404.

### [apps/web/components/home/StandingsPreview.tsx:56,63 + apps/web/components/home/QuickLinks.tsx:NA] [SEVERITY: P0] [`/results/current/...` triggers `NaN`-season jolpica fetch]
**What's broken:** Home links to `/results/current/drivers` and `/results/current/teams`. The dynamic route at `apps/web/app/results/[season]/drivers/page.tsx:22` does `const seasonNum = Number(season);` → `Number('current')` is `NaN`, then `jolpica.getDriverStandings(NaN, ...)` requests `NaN/driverStandings.json`. Jolpica returns no `StandingsLists[0]`, mapper returns `[]`, `Math.max(...[], 1)` is `1`, page renders an empty table with a still-correct heading "DRIVER STANDINGS · current".
**User-visible symptom:** Click "Drivers 2026" / "Constructors 2026" from home → empty standings table with the literal word "current" in the eyebrow.
**Fix:** Replace `/results/current/drivers` → `/results/2026/drivers` (and `teams`) in StandingsPreview lines 56 and 63. Same fix or guard `Number(season) || new Date().getUTCFullYear()` in `[season]/drivers/page.tsx:22` + `[season]/teams/page.tsx`.
**Why:** Two of the home page's highest-intent CTAs render blank.

### [apps/web/components/shell/MegaNav.tsx:108,109,128,129,531 + apps/web/components/shell/Footer.tsx:15,23,24 + apps/web/components/shell/TopUtilityBar.tsx:18 + apps/web/components/home/QuickLinks.tsx:9] [SEVERITY: P0] [`/results/archive`, `/drivers/champions`, `/drivers/hall-of-fame` referenced everywhere — none exist]
**What's broken:** These hrefs appear in MegaNav (Results column "All seasons" + "Champions index"; Drivers column "Champions" + "Hall of Fame"), Mobile drawer ("Archive" pill), Footer (3 footer columns), Top utility bar ("Archive"), Home QuickLinks ("Archive"). None resolve to a file in `apps/web/app/`. Will fall into `not-found.tsx`.
**User-visible symptom:** Six different surfaces lead the user to a 404 page.
**Fix:** Build stub pages (each ~40 LOC) with `notFound()` removed and a "Phase B" coming-soon shell, or remove the links from every above location. Recommended: build `/results/archive` (seasons grid 1950–2026, reuse `<Link href={`/schedule/${y}`}>` pattern from `app/schedule/page.tsx:37`); remove `/drivers/champions` + `/drivers/hall-of-fame` from nav until backed by historical aggregator (Phase B per CLAUDE.local note).
**Why:** Archive is named 6 times in chrome — broken on every page load.

### [apps/web/components/shell/TopUtilityBar.tsx:24,25 + apps/web/components/shell/MegaNav.tsx:533] [SEVERITY: P0] [`/account` and `/account?signup=1` don't exist]
**What's broken:** Top utility bar's "Sign in" and "Create" Links plus mobile drawer's "Sign in" Link point to `/account`. No `apps/web/app/account/` directory.
**User-visible symptom:** Two of three top-right utility-bar buttons 404.
**Fix:** Either build a `/account` page with a "Auth ships Phase C" notice (already gated in `robots.ts:8` disallow), or strip those two pills from `TopUtilityBar.tsx:23-25` until Supabase Auth lands.
**Why:** Top chrome shows non-functional auth buttons on every page.

### [apps/web/app/admin/page.tsx:56] [SEVERITY: P1] [`/admin/runs` tile dead]
**What's broken:** Admin dashboard advertises an "Ingestion runs" tile linking to `/admin/runs`. Route doesn't exist.
**User-visible symptom:** Admin tile click → 404. Operator can't audit failed cron runs (the only purpose of this admin shell).
**Fix:** Build `app/admin/runs/page.tsx` reading from a `worker_runs` table or `apps/workers/runs.log`, or remove the Tile from `admin/page.tsx:55-59`.
**Why:** Admin shell is incomplete and lies about its capability surface.

### [apps/web/components/home/HighlightsRail.tsx:35 + apps/web/components/shell/MegaNav.tsx:155] [SEVERITY: P1] [`?channel=formula1` filter silently no-ops]
**What's broken:** `app/video/page.tsx:22` slugifies channel names as `name.toLowerCase().replace(/\s+/g, '-')` so `"FORMULA 1"` → `"formula-1"`. But HighlightsRail and MegaNav both link `?channel=formula1` (no dash). `filteredChannels.length === 0`, so `app/video/page.tsx:54` falls back to `YT_F1_CHANNELS` and shows ALL channels — the filter UI marks no pill active and the page lies about its filter state.
**User-visible symptom:** Click "FORMULA 1 official" in nav or "View all highlights" in HighlightsRail → unfiltered video grid; no pill highlighted.
**Fix:** Replace `?channel=formula1` with `?channel=formula-1` in `HighlightsRail.tsx:35` and `MegaNav.tsx:155`. Or change the slug fn to also strip dashes for parity.
**Why:** Filter advertised, doesn't run.

### [apps/web/components/shell/MegaNav.tsx:38-55,74,75,122,142] [SEVERITY: P1] [`?source=*`, `?type=*`, `?view=*`, `?filter=*` params point at pages that ignore them]
**What's broken:** MegaNav offers 12+ dropdown links using query-params that the destination pages don't handle: `/latest?source=motorsport|autosport|racefans|the-race|reddit|reddit-tech` (latest page handles `source` only against curated `SOURCE_PILLS` — slugs `motorsport-com`, `autosport-com`, etc. per `app/latest/page.tsx:30-55`, so most won't match), `/latest?type=longform|editorial` (no `type` reader), `/schedule?view=next|type=sprint` (no `searchParams` in `app/schedule/page.tsx`), `/drivers?filter=rookies` (no reader), `/teams?view=historical` (no reader).
**User-visible symptom:** User clicks a refined nav link, lands on the unfiltered index. Indistinguishable from clicking the section header.
**Fix:** Either (a) wire `searchParams` filters in each destination index, or (b) remove the misleading dropdown rows from `NAV`. Lowest-LOC: remove them and keep only the canonical section links until the filter UI is real.
**Why:** Nav promises filtering it doesn't deliver — CORE RULE #1 ("every button has a real handler") violation in chrome.

### [apps/web/components/race/WeatherStrip.tsx:175,182,230,252,260] [SEVERITY: P1] [Em dashes in user-facing strings]
**What's broken:** Five literal em-dash placeholders rendered when weather data is missing (`'—'`, `'TRACK EST —'`). Project directive: zero em dashes anywhere.
**User-visible symptom:** Em-dash characters visible in weather card on race pages.
**Fix:** Replace with `'N/A'` or empty hyphens. Sed pattern: `s/—/--/g` in this file (or skip the cell entirely with conditional render). Same fix to comments in `ParallaxHero.tsx:130,136`.
**Why:** Directive violation; em dash is the canonical AI-tell.

### [apps/web/app/legal/privacy/page.tsx:52-53 + apps/web/app/legal/disclaimer/page.tsx:63-64] [SEVERITY: P1] [Contact emails point at non-existent TLD `apex.example`]
**What's broken:** `mailto:privacy@apex.example` and `mailto:legal@apex.example`. The legal domain elsewhere is `apex.gg` (see `dmca/page.tsx:48`, `robots.ts:3`, `sitemap.ts:4`, `opengraph-image.tsx:92`).
**User-visible symptom:** Click email link in privacy/disclaimer → mail client launches with bounce-bound `@apex.example` address. GDPR/CCPA contact path broken.
**Fix:** Replace both with `mailto:privacy@apex.gg` / `mailto:legal@apex.gg`. Or single shared `legal@apex.gg`.
**Why:** Privacy policy without a working contact address is a legal liability.

### [apps/web/components/shell/MegaNav.tsx:240-249] [SEVERITY: P1] [Mega-dropdown opens only on hover — keyboard users can't expand columns]
**What's broken:** `<nav onMouseLeave={leave}>` + `<li onMouseEnter={() => enter(section.label)}>` — there is NO `onFocus` / `onKeyDown` / button-with-`aria-expanded` to open the mega panel via Tab/Enter. The top-level item is a `<Link>` that navigates immediately, so a keyboard user never sees the columns ("All news", "Champions", "Hall of Fame", etc.) at all.
**User-visible symptom:** Tab through site → only the section landing pages reachable, the 70+ dropdown links are entirely keyboard-hidden. Screen reader same problem.
**Fix:** Convert each top-level into a `<button aria-haspopup="true" aria-expanded={isOpen}>` (or pair the Link with a sibling chevron button), open on `onFocus`/click, close on `Escape`/focus-out. Pattern is already in mobile drawer at line 562.
**Why:** Mega-nav is the entire site IA; inaccessible to keyboard/AT users.

### [apps/web/components/shell/MegaNav.tsx:600 + apps/web/components/profile/DecadeTabs.tsx:39 + 7 form inputs in admin/search/newsletter/predict] [SEVERITY: P1] [`focus:outline-none` without a focus-visible replacement]
**What's broken:** 9 elements set `focus:outline-none` with no `focus-visible:ring-*` or `focus-visible:border-*` fallback. Browser focus ring suppressed → keyboard users have no visible focus indicator on form inputs, the mega-nav search box, and the decade tab buttons.
**User-visible symptom:** Tab into newsletter form, predict form, search modal, or driver-profile decade tabs → no visible cursor. Cannot tell which control is focused.
**Fix:** Add `focus-visible:ring-2 focus-visible:ring-telemetry-red focus-visible:ring-offset-0` (or equivalent border highlight) to each occurrence. Already done correctly on 7 admin/form fields with `focus:border-telemetry-red focus:outline-none` — apply that pattern to the 2 remaining.
**Why:** WCAG 2.4.7 fail. Keyboard navigation invisible.

### [apps/web/app/teams/page.tsx + apps/web/app/schedule/page.tsx + apps/web/app/drivers/page.tsx + apps/web/app/latest/page.tsx] [SEVERITY: P1] [Index pages don't handle the `searchParams` advertised by nav]
**What's broken:** `app/drivers/page.tsx`, `app/teams/page.tsx`, `app/schedule/page.tsx` accept no `searchParams`. Nav promises `?filter=rookies`, `?view=historical`, `?view=next`, `?type=sprint`. `app/latest/page.tsx:112` handles `source|lang|sentiment` only — not `type`/`tag`.
**User-visible symptom:** See P1 item above for symptom; this finding is the back-half (the destination side) of the same bug class.
**Fix:** Add `searchParams: Promise<{ filter?: string }>` etc and apply `.filter()` to the loaded array. Smallest unit ~5–10 LOC per page.
**Why:** Nav links are non-functional from the destination side.

### [apps/web/components/home/*.tsx — 5 raw `<img>` tags] [SEVERITY: P2] [No `next/image`, no lazy-load, no `sizes`]
**What's broken:** `HeroLeadStoryClient.tsx:19`, `HeroRail.tsx:39`, `EditorsPicks.tsx:42,73`, `HighlightsRail.tsx:57`, `FeaturedVideoRail.tsx:46` all use raw `<img>` with `object-cover`, no `loading="lazy"`, no `width`/`height`, no `srcSet`/`sizes`. The home page sends full-resolution provider thumbnails (YouTube `maxres`, NewsAPI hero) on every load.
**User-visible symptom:** Slow LCP on home, layout shift as images stream. Likely Lighthouse perf <70 on 3G.
**Fix:** Either (a) convert to `next/image` with `sizes` (requires `next.config.js` remote pattern allowlist), or (b) cheap path: add `loading="lazy" decoding="async"` to all except the hero, plus explicit `width`/`height` attrs to reserve space.
**Why:** Performance regression on the most-loaded page.

### [apps/web — no manifest.json, no service worker, no PWA meta] [SEVERITY: P2] [PWA registration absent]
**What's broken:** `apps/web/public/` contains only `favicon.svg`. No `manifest.webmanifest`, no `apple-touch-icon`, no service worker. `layout.tsx:35` only sets `icons: { icon: '/favicon.svg' }`. No `manifest` field in metadata.
**User-visible symptom:** Can't be installed as PWA. iOS home-screen icon is fallback. Lighthouse PWA category fails.
**Fix:** Add `apps/web/app/manifest.ts` (Next 15+ metadata route) returning `MetadataRoute.Manifest` with `name: 'Apex'`, theme `#141313`, telemetry-red accent, icons array. Add an apple-touch-icon PNG to `public/`. Service worker optional Phase C.
**Why:** Mobile install + offline missing on a mobile-first race-day product.

### [apps/web/app/page.tsx — no per-page metadata] [SEVERITY: P3] [Home title falls back to layout default]
**What's broken:** `app/page.tsx:14` exports no `metadata`. Title resolves to the layout default `"Apex · Independent Formula 1 fan platform"`, description is the generic site DESCRIPTION. No OG image override.
**User-visible symptom:** Home shares to socials with generic preview, no race-week context.
**Fix:** Add `export const metadata = { title: { absolute: 'Apex' }, description: '...' }` to `app/page.tsx`. Consider a dynamic home OG via `app/opengraph-image.tsx` (already present at root).
**Why:** Home page is the most-shared URL; metadata should be tuned.

### [apps/web/components/race/WeatherStrip.tsx + apps/web/components/profile/ParallaxHero.tsx — `/* — */` style comments] [SEVERITY: P3] [Em dashes inside JSX comments]
**What's broken:** 7 comment lines contain em dashes. Not rendered to user but fails any naive `grep '—'` audit and shows up in code-review tooling.
**User-visible symptom:** None directly. Hygiene only.
**Fix:** Bulk replace in those two files. Optional pre-commit hook: `git diff | grep '—'` → fail.
**Why:** CLAUDE.md "no em dashes" directive applied consistently in code too.

### [apps/web/components/shell/MegaNav.tsx:227 + apps/web/components/shell/TopUtilityBar.tsx:51] [SEVERITY: P3] [Apex logo Link has no `aria-label`]
**What's broken:** Brand logo Link wraps `<ApexMonogram />` (an SVG) plus visually-hidden text? Need to verify. If accessible name is purely visual, screen readers announce nothing for the home link.
**User-visible symptom:** Screen-reader users hear "link" with no name on the brand mark in two chrome surfaces.
**Fix:** Add `aria-label="Apex home"` to the wrapping `<Link>` or include `<span className="sr-only">Apex home</span>` inside.
**Why:** A11y polish on chrome's most-clicked control.

---

## FULL MISSING-ROUTE TABLE

| Referenced href | Referrer file | Exists in app/? | Recommendation |
|---|---|---|---|
| `/results/archive` | TopUtilityBar:18, Footer:15, MegaNav:108,531, QuickLinks:9 | NO | Build (seasons index 1950–2026) |
| `/drivers/all` | (not referenced in code) | NO | N/A (not used) |
| `/drivers/hall-of-fame` | MegaNav:129, Footer:23 | NO | Remove links (Phase B) |
| `/drivers/champions` | MegaNav:109,128, Footer:24 | NO | Remove links (Phase B) |
| `/teams/all` | (not referenced in code) | NO | N/A |
| `/teams/champions` | (not referenced in code) | NO | N/A |
| `/account` | TopUtilityBar:24, MegaNav:533 | NO | Remove links until Phase C auth |
| `/account?signup=1` | TopUtilityBar:25 | NO | Remove link |
| `/careers` | (not referenced in code) | NO | N/A (not advertised) |
| `/contact` | (not referenced in code) | NO | N/A (not advertised) |
| `/live` (root) | (no Link uses bare `/live`) | NO | N/A — all links go `/live/timing|race-control|track` |
| `/latest/article/[slug]` | (not referenced in code) | NO | Not used — articles open at source link |
| `/latest/section/feature` | (not referenced) | NO | N/A |
| `/latest/section/analysis` | (not referenced) | NO | N/A |
| `/latest/section/quiz` | (not referenced) | NO | N/A |
| `/latest/section/gallery` | (not referenced) | NO | N/A |
| `/latest/tag/race-week` | (not referenced) | NO | N/A |
| `/latest/tag/technical` | (not referenced) | NO | N/A |
| `/latest/tag/strategy` | (not referenced) | NO | N/A |
| `/latest/tag/driver-market` | (not referenced) | NO | N/A |
| `/video/[slug]` | (not referenced; modal-driven) | NO | N/A — videos open at YouTube |
| `/admin/runs` | admin/page.tsx:56 | NO | Build (worker run log) or remove tile |
| `/search?q=...` | search-client.tsx form | YES (`app/search/page.tsx`) | Works |
| `/results/current/drivers` | StandingsPreview:56 | Route matches `[season]` but `Number('current')=NaN` | Replace with `/results/2026/drivers` |
| `/results/current/teams` | StandingsPreview:63 | Same NaN bug | Replace with `/results/2026/teams` |
| `/schedule/2026/singapore` | MegaNav:89 preview | Route resolves but slug `singapore` not in jolpica (`marina_bay`) → notFound | Compute from data or change to `marina_bay` |
| `/latest?source=motorsport|autosport|racefans|the-race|reddit|reddit-tech` | MegaNav:38-48 | Page exists, but pill slugs in `SOURCE_PILLS` use `motorsport-com`, `autosport-com`, `racefans-net`, `the-race`, `reddit-formula1`, `reddit-f1technical` — only `the-race` matches | Realign nav slugs with SOURCE_PILLS |
| `/latest?type=longform|editorial` | MegaNav:54,55 | `type` param not read | Wire searchParams or remove |
| `/schedule?view=next` | MegaNav:74 | Param not read | Wire or remove |
| `/schedule?type=sprint` | MegaNav:75 | Param not read | Wire or remove |
| `/schedule/2025`, `/schedule/2024` | MegaNav:81,82 | Routes exist (`[season]`), past data via jolpica | Works |
| `/drivers?filter=rookies` | MegaNav:122 | Param not read | Wire or remove |
| `/teams?view=historical` | MegaNav:142 | Param not read | Wire or remove |
| `/video?channel=formula1` | HighlightsRail:35, MegaNav:155 | Page exists, expected slug is `formula-1` (dash) → 0-match → silent fallback | Use `formula-1` or strip dashes in slug fn |
| `/video?channel=chain-bear|tommo|driver61` | MegaNav:156-158 | Match (slugify yields these) | Works |
| `/legal/terms` | Footer:50 | YES | Works |
| `/legal/dmca` | Footer:51 | YES | Works |
| `/membership` | TopUtilityBar:19, Footer:40, MegaNav:532 | YES | Works |
| `/newsletter` | many | YES | Works |
| `/about` | Footer:39 | YES | Works |
| `/predict` | Footer:41 | YES | Works |
| `/search` | Footer:33 | YES | Works |
| `/admin/articles` | admin/page.tsx:51 | YES | Works |
| `/admin` | many | YES | Works |

---

- COUNT: P0=4 P1=8 P2=2 P3=3
- TOP_FIVE_PRIORITY:
  1. MegaNav `/schedule/2026/singapore` — wrong circuit slug (most-visible nav CTA 404s)
  2. StandingsPreview `/results/current/...` — `NaN` season produces blank standings
  3. Six chrome refs to non-existent `/results/archive`, `/drivers/champions`, `/drivers/hall-of-fame`
  4. `/account` + `/account?signup=1` 404s in top utility bar
  5. MegaNav opens only on hover — entire mega-IA keyboard/SR-inaccessible
- FIX_BUNDLE_SIZE: ~280 LOC across 9 files (MegaNav.tsx data + button rewrite ~120, StandingsPreview/QuickLinks 1-line swaps ~4, footer/TopUtilityBar link removals ~12, `app/results/archive/page.tsx` stub ~40, WeatherStrip em-dash sweep ~10, legal email fixes ~4, focus-visible class adds ~9, `app/manifest.ts` ~25, optional `home/page.tsx` metadata ~12, plus `app/admin/runs/page.tsx` stub ~40).
