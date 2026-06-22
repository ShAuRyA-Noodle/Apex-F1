# Drivers + Teams audit — index / profile / career / history

I have enough to deliver the audit. Let me compile the findings.

### [apps/web/app/drivers/[slug]/page.tsx:111-115] [SEVERITY: P1]  Career-arc championship years always set to `false`
**What's broken:** `isChampion: false` is hard-coded for every season in `careerArcYears`. The comment in the file admits it: "Champion detection requires a season-end standings query — left undefined here." So gold star never renders for any driver, even 7-time champions like Hamilton/Schumacher.
**User-visible symptom:** On every driver profile, the CareerArc shows zero gold championship stars even for confirmed world champions.
**Fix:** Fetch driver standings per season once and mark champion years truthfully. Add a parallel call: `const driverStandingsByYear = await Promise.all(sortedYears.map(y => jolpica.getDriverStandings(y))).then(arr => arr.map((standings, i) => ({ year: sortedYears[i], champion: standings.find(s => s.Driver.driverId === slug)?.position === '1' })))` then set `isChampion: driverStandingsByYear.find(s => s.year === y)?.champion ?? false` at line 114.
**Why:** Champion detection is a single Jolpica endpoint already wired in `client.ts:52`; serving an arc without it lies about the driver's history.

### [apps/web/app/teams/[slug]/page.tsx:86] [SEVERITY: P1]  Constructor titles count hard-stubbed to `null`
**What's broken:** `const constructorTitles: number | null = null;` with comment "championships data soon". The championship trophy badge (line 129) is unreachable, the P-CHAMPS stat strip cell (line 207) renders `·`, and the page silently downgrades a Ferrari profile from "16× CONSTRUCTORS' TITLES" to nothing.
**User-visible symptom:** Every team page shows `·` under "P-CHAMPS"; the gold championship trophy in the hero never appears.
**Fix:** Aggregate from Jolpica. Add `const allConstructorStandings = await Promise.all(Array.from({length: CURRENT_YEAR - 1957}, (_, i) => 1958 + i).map(y => jolpica.getConstructorStandings(y).catch(() => [])));` then `const constructorTitles = allConstructorStandings.flat().filter(s => s.Constructor.constructorId === c.slug && s.position === '1').length;`. Cache with a 30d revalidate since past titles never change.
**Why:** Jolpica exposes constructor standings since 1958; one paginated sweep gets the true title count and unlocks the gold badge.

### [apps/web/app/teams/[slug]/page.tsx:60-83] [SEVERITY: P1]  Driver roster includes drivers who never started (uses `Results` array indiscriminately)
**What's broken:** Roster loops `race.Results ?? []` but Jolpica returns reserve/withdrawn drivers in the same array. Worse, `roster.slice(0, 8)` truncates without preferring active-season drivers, so a sub team can surface a 3-season-ago tester instead of the current race seat holder.
**User-visible symptom:** Team page can list ex-drivers from 2024 alongside current 2026 race drivers with no visual distinction; possible misordering of "Current & recent drivers".
**Fix:** Sort by `lastSeason DESC` first (already done), then partition: drivers whose `lastSeason === CURRENT_YEAR` go first and labeled "ACTIVE", others labeled "PREVIOUS". Render the "ACTIVE" group with a stronger color stripe and surface the "PREVIOUS" group as a smaller "RECENT ALUMNI" subsection rather than mixing them in one grid.
**Why:** Visually conflating active and ex-drivers under "Current & recent" is misleading; a 2-bucket layout is honest with no extra data fetched.

### [apps/web/app/teams/[slug]/page.tsx:88-197] [SEVERITY: P1]  Team profile hero has no real image — only a gradient + carbon-weave SVG
**What's broken:** Comment "team has no canonical face" → page uses a flat `linear-gradient(135deg, ${color} ...)` with a CSS-encoded SVG checker overlay. Yet `apps/web/lib/heroImage.ts:243` exports a fully-wired `getTeamHeroImage()` that returns Unsplash/HF imagery for teams. It's defined but never called here.
**User-visible symptom:** Every team page hero looks identical — a colored gradient — while drivers get real photography. Ferrari is flat red, Red Bull is flat blue, no garage/livery imagery.
**Fix:** At the top of `TeamProfilePage`, add `import { getTeamHeroImage } from '@/lib/heroImage'; import { ParallaxHero } from '@/components/profile/ParallaxHero';` then `const hero = await getTeamHeroImage({ teamSlug: c.slug });` and replace the bespoke `<section ...>` hero with `<ParallaxHero imageUrl={hero?.urlHero} accent={color} rightStripeColor={color} alt={hero?.alt ?? ''} attribution={hero?.source === 'unsplash-curated' || hero?.source === 'unsplash-fallback' ? { name: hero.attributionName, profileUrl: hero.attributionUrl } : undefined}>...</ParallaxHero>`.
**Why:** The hero helper is already paid for; not using it makes team pages feel half-finished next to driver pages.

### [apps/web/app/drivers/[slug]/page.tsx:317-323] [SEVERITY: P2]  "Full career" CTA uses `MagneticButton` but bypasses View Transition
**What's broken:** The "Full career" CTA renders `<MagneticButton href=.../>` which uses a plain `next/link`. The `ViewTransitionLink` at line 350-355 is sitting `sr-only` and never receives user click — it has no visible affordance. As a result the morph between profile and career hero (visible viewTransitionName tags on `driver-name-${slug}`) NEVER fires from the primary CTA.
**User-visible symptom:** Clicking "Full career" gets a hard navigation; the giant driver name and number do not morph into the career hero as designed.
**Fix:** In `apps/web/components/profile/MagneticButton.tsx`, swap the `<Link>` import for `ViewTransitionLink` (or pass an optional `as` prop). Alternatively in the profile page, replace `<MagneticButton href={...}>Full career</MagneticButton>` with a styled `<ViewTransitionLink>` matching MagneticButton's class so the morph fires. Delete the hidden `sr-only` ViewTransitionLink at line 350-355 once done.
**Why:** A ghost `sr-only` View-Transition seed alongside a working button is dead weight; consolidating into one link delivers the morph the design called for.

### [apps/web/app/drivers/[slug]/page.tsx:84,99] [SEVERITY: P2]  Default team color `#444748` and race teamColor `#444` for unknowns leak when slug isn't in the dictionary
**What's broken:** `teamColorBySlug()` returns `#888888` for unknown slugs, but the page's `currentEntry?.teamColor ?? '#444748'` and `r ? teamColorBySlug(r.constructor.slug) : '#444'` introduce a second fallback (`#444748`/`#444`) that is dark, near-black and looks like a missing color. The team-color stripe on hero rightStripeColor goes grey when the resolver is missing a slug like `racing_point`, `rb_honda`, etc.
**User-visible symptom:** Profiles for drivers whose current constructor slug isn't in the dictionary (recent rebrands, archival entries) get a near-black stripe that reads as broken UI.
**Fix:** Extend the slug dictionary in `apps/web/lib/format.ts:112` to cover all current rebrands: `racing_point: '#F596C8'`, `force_india: '#F596C8'`, `caterham: '#005030'`, `marussia: '#6E0000'`, `manor: '#323230'`, `lotus_racing: '#FFB800'`, `super_aguri: '#C71930'`. Replace `#444748`/`#444` fallbacks in the profile pages with `teamColorBySlug()` directly so the helper is the single source of truth.
**Why:** Single-source color resolution prevents the grey-stripe surprise without changing call sites.

### [apps/web/app/drivers/[slug]/career/page.tsx:87,15-21] [SEVERITY: P2]  Career page does NOT use the `getDriverHeroImage` fallback chain
**What's broken:** `const heroImage = facts?.image ? commonsImageUrl(facts.image) : undefined;` — career page only honors Wikidata. Profile page uses the full Wikidata→Unsplash→HF chain via `getDriverHeroImage`. For drivers without a Wikidata image (rookies, archival drivers), the career hero is blank while the profile hero shows imagery.
**User-visible symptom:** Driver-A's profile has a great Unsplash hero, but their `/career` page is image-less because the fallback chain is bypassed.
**Fix:** Replicate the profile-page block: `import { getDriverHeroImage } from '@/lib/heroImage';` then `const hero = await getDriverHeroImage({ fullName: d.fullName, wikidataImage: facts?.image ?? null, nationality: d.nationality }); const heroImage = hero?.urlHero ?? (facts?.image ? commonsImageUrl(facts.image) : undefined);` and pass `attribution` to `ParallaxHero` exactly like the profile page does.
**Why:** Two pages, one helper — drift here is why career heroes can suddenly look "dead".

### [apps/web/app/drivers/[slug]/career/page.tsx:46-83] [SEVERITY: P2]  Aggregate stat strip silently undercounts when Jolpica caps a season at 100 results
**What's broken:** `getDriverResultsInSeason` and the page-level `getDriverResults` both call Jolpica with `limit: 1000`, but the per-season helper uses `limit: 100`. A driver running both qualifying and sprint formats can exceed 100 entries across a career (sprint races, double points races). The page-level call is fine but if you swap to per-season fetch the aggregate stats silently truncate.
**User-visible symptom:** None today since the page uses `getDriverResults` (limit 1000). But this is a latent footgun.
**Fix:** Wrap `getDriverResults` with explicit pagination if the envelope returns `total > 1000`. Add an assertion: `if (allResults.length >= 1000) console.warn('Driver result fetch hit pagination limit for', slug);` so the issue surfaces in logs the moment a long-career driver crosses it.
**Why:** Prevents the founder's "no fake data" rule from being violated silently when a long-tenured driver's totals stop incrementing.

### [apps/web/app/teams/[slug]/history/page.tsx:42] [SEVERITY: P2]  History page only shows 10 calendar years, even when team has 50+ years of data
**What's broken:** Hard-coded `for (let y = CURRENT_YEAR; y >= CURRENT_YEAR - 9; y--)`. The Ferrari/McLaren/Williams page can only ever show 10 seasons. The "DECADE EXPLORER" tab control in `TeamHistoryDecade` only ever receives one decade (current decade) so the tab UI is pointless.
**User-visible symptom:** Title "Decade-by-decade. Every season, every car, every podium." promises decades plural; reality is only the most recent decade. Tab control shows a single `2020s` pill.
**Fix:** Drop hard-coded window. Use `await jolpica.getConstructors()` history or, simpler: try a wider span, e.g. `for (let y = CURRENT_YEAR; y >= 1950; y -= 1)` but issue them in batches of ~10 with `Promise.allSettled` so a 404 on a pre-team year just yields an empty slot. The component already drops empty seasons via `seasons.filter((s) => s.races.length > 0)`.
**Why:** Aligns content with the hero promise; Jolpica's free tier handles concurrent requests fine when batched.

### [apps/web/app/teams/[slug]/page.tsx:280-298] [SEVERITY: P2]  Only one reference link, no Wikidata QID, no team principal info
**What's broken:** Compare with `apps/web/app/drivers/[slug]/page.tsx:337-345` which shows Wikipedia + Wikidata QID. Team page only renders Wikipedia. No Wikidata constructor facts (founded year, base, principals) — page text even admits this lands "in Phase B".
**User-visible symptom:** Team profile feels visibly less rich than driver profile; "BASE", "SEASON" stat-strip cells show nationality + year only, no founded year.
**Fix:** Wire `getConstructorFactsFromWikidata` (build it in `packages/api-client/src/wikidata/` if missing) querying `P571 inception`, `P159 headquarters location`, `P169 chief executive officer`, plus team principal. Pull into the page and feed into `StatStrip` items: `{ label: 'FOUNDED', value: foundedYear }`, `{ label: 'BASE', value: hqCity }`. Link the QID alongside Wikipedia.
**Why:** Same pattern already lives on the driver page; reusing it raises team parity without inventing data.

### [apps/web/app/drivers/[slug]/page.tsx:204-208] [SEVERITY: P3]  Driver name layout has fragile `.block` first-name on every driver; long first names overflow
**What's broken:** First name uses `text-[0.32em]` inside a `clamp(4.5rem, 18vw, 14rem)` h1. A first name like "Christijan" or "Maximilian" overflows on narrow viewports because there's no `break-words` or `min-w-0` parent.
**User-visible symptom:** Names like "Maximilian Götz" wrap or push outside the 1700px container at mid-tablet widths.
**Fix:** Add `break-words` to the h1 and wrap the first-name span in `<span className="block text-[0.32em] ... break-words leading-tight">`. Also constrain `max-w-[12ch]` on the first-name span so very long names truncate gracefully.
**Why:** Cinematic typography should never break on a Hungarian or Dutch first name.

### [apps/web/app/drivers/[slug]/page.tsx:280] [SEVERITY: P3]  RecentFormPanel section silently hidden when no races; user gets no feedback for rookie drivers
**What's broken:** `{last5.length > 0 && ( ... )}`. Rookie drivers with zero races (preseason call-ups, test drivers) get a profile that abruptly skips from career-arc to CTA. The transition feels jarring and there's no copy explaining absence.
**User-visible symptom:** Driver with zero starts has no "no recent form yet" feedback; reads as missing section.
**Fix:** Replace the `&&` short-circuit with a ternary that renders a compact empty state: `<section><span>RECENT FORM</span><p>No race starts on the books yet.</p></section>`. Match the visual rhythm of other sections.
**Why:** Honest empty states are part of the no-mock-data ethos.

### [apps/web/app/drivers/[slug]/page.tsx:84] [SEVERITY: P3]  `currentTeamColor` falls back to `#444748` instead of resolver default
**What's broken:** Two paths can produce identical wrong outcomes — see P2 above on the dictionary. The hero stripe and CTA radial both depend on this.
**User-visible symptom:** Subtle visual bug, never severe but noticeable on drivers whose current slug isn't in the dictionary.
**Fix:** Replace `currentEntry?.teamColor ?? '#444748'` with `teamColorBySlug(currentEntry?.teamSlug)` so the resolver controls the fallback.
**Why:** Centralizes color policy in `format.ts`.

### [apps/web/app/teams/[slug]/page.tsx:262] [SEVERITY: P3]  "Full history" CTA has no View Transition seed
**What's broken:** `MagneticButton href={`/teams/${c.slug}/history`}` again uses plain `next/link`. But both the team profile hero name and the team history hero name share `viewTransitionName: team-name-${c.slug}` (line 168, history/page.tsx line 138). The morph never fires from the CTA button click because the View Transition API isn't wrapped.
**User-visible symptom:** Team name doesn't morph between profile and history; transitions cuts hard.
**Fix:** Same as P2 on driver-side — fold MagneticButton through ViewTransitionLink or use ViewTransitionLink with magnetic styling.
**Why:** One fix per shared CTA component prevents duplicating motion code across pages.

### [apps/web/app/drivers/[slug]/career/page.tsx:184-193] [SEVERITY: P3]  `bestResult` ordinal logic doesn't handle DNF / DSQ position text
**What's broken:** `bestResult` is computed from numeric positions only. But `positionText` from Jolpica can be `R`, `D`, `W`, `E` for retired/disqualified/withdrew/exclusion. The page reduces to `'·'` if every result is a DNF, hiding the fact the driver attempted races.
**User-visible symptom:** A season where the driver attempted 22 races and DNF'd them all shows `BEST: ·` rather than `BEST: DNF`.
**Fix:** When `bestPos === 99` (the sentinel) and `races.length > 0`, return the most-common non-numeric `positionText` (e.g. "DNF"). Compute via `races.map(r => r.positionText).filter(t => isNaN(Number(t)))[0]`.
**Why:** A DNF season is still a real season; show it as such.

### [apps/web/components/profile/CareerArc.tsx:50-51] [SEVERITY: P3]  `Math.min(...activeYears)` crashes on empty array
**What's broken:** If `years.length === 0`, `Math.min(...[])` returns `Infinity` and `Math.max(...[])` returns `-Infinity`. The footer renders "FIRST RACE · Infinity / LATEST · -Infinity".
**User-visible symptom:** Rookie driver with zero seasons sees broken stat labels.
**Fix:** Guard: `if (years.length === 0) return <p className="font-editorial text-on-surface-variant">No seasons on record yet.</p>;` at the top of the component, before the Math calls.
**Why:** Cinematic UI never shows `Infinity`.

### [apps/web/app/drivers/page.tsx:30] [SEVERITY: P3]  Index grid `lg:grid-cols-5` causes 5-across on wide viewports; orphan tile likely
**What's broken:** 20-driver grid → 5 cols leaves perfect 4 rows. But 22 drivers (sprint-era expansions) → 4 rows + 2 orphans on row 5. No visual balance correction.
**User-visible symptom:** When the grid is N+2 or N+3, last row has visible empty cells, looks unfinished.
**Fix:** Use `lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]` or pad to a multiple of 5 with empty placeholder cards.
**Why:** Grid integrity is part of the "world-class" mandate.

### [apps/web/components/profile/ParallaxHero.tsx:92] [SEVERITY: P3]  `<img>` tag not Next.js `<Image>`; no priority hint, no LCP optimization
**What's broken:** Raw `<img>` for the hero. Lighthouse will flag this as LCP-blocking; no `priority`, no `sizes`, no `srcset`. The page has explicit `loading="eager"` which is correct, but `next/image` would give responsive sourcing, blur placeholder, and AVIF/WebP.
**User-visible symptom:** Slower LCP on 3G/4G; on cellular the hero takes 2-3s to paint vs ~600ms with next/image.
**Fix:** Replace `<img src ...>` with `<Image src={imageUrl} fill priority alt={alt} style={{objectFit:'cover',objectPosition}} sizes="100vw" />`. Configure `images.remotePatterns` in `next.config.ts` to allow Wikimedia Commons + Unsplash hosts. Data-URL paths from HF generated images bypass next/image and should fall through to a plain `<img>`.
**Why:** Free perf win without altering visual design.

---

- COUNT: P0=0 P1=4 P2=6 P3=8
- TOP_FIVE_PRIORITY:
  1. Team profile hero uses no real image — wire `getTeamHeroImage()` (P1)
  2. Constructor titles count hard-stubbed to `null` — aggregate from Jolpica historical standings (P1)
  3. Career-arc championship years always `false` — fetch per-season driver standings and mark champions (P1)
  4. "Full career" / "Full history" CTAs bypass View Transition morph — fold MagneticButton through ViewTransitionLink (P2 ×2, same root cause)
  5. Team history hard-capped at 10 seasons — extend to full Jolpica history (P2)
- FIX_BUNDLE_SIZE: approximately 380 LOC across 6 files (jolpica historical standings aggregation ~80 LOC, team hero rewrite ~50 LOC, championship arc patch ~60 LOC, history window expansion ~30 LOC, View Transition consolidation in MagneticButton ~40 LOC, team Wikidata facts ~80 LOC, polish items ~40 LOC)
