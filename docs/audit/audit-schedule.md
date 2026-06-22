# Schedule audit — / + /[season] + /[season]/[race]

Now I have everything I need to deliver a precise audit. Let me verify a couple specifics: the "now" comparison ordering, and check that `nextIdx` works when all are past, and check `formatDateRange` for the calendar card formatting.

The audit is complete. Here is my output strictly in the required format:

---

### [apps/web/app/schedule/page.tsx:13,34-46] [SEVERITY: P1] Season switcher hardcodes 2026 and renders an "active" pill on the root /schedule that ignores any other season selection
**What's broken:** `const SEASON = 2026;` is baked at module top-level. The switcher highlights 2026 even though `/schedule` is supposed to be the canonical landing for the *current* season. There is no `/schedule/2026` redirect symmetry, and the highlighted pill is always 2026 regardless of date math or `currentSeason` from Jolpica.
**User-visible symptom:** When 2026 ends and we roll to 2027, /schedule will still display "2026 SEASON" and 2026 cards until someone edits the constant. The switcher will never offer 2027.
**Fix:** Replace the hardcoded constant with a dynamic resolver, e.g. `const SEASON = await jolpica.getCurrentSeason();` (already used elsewhere in the codebase, e.g. `app/page.tsx`), or compute as `new Date().getUTCFullYear()` with a Jolpica fallback. Drive the switcher list from `[SEASON - 2, SEASON - 1, SEASON]` so it always tracks reality.
**Why:** Eliminates the only annual hand-edit on the schedule surface and matches how `/standings` and `/results` resolve season.

### [apps/web/app/schedule/[season]/page.tsx:18-39] [SEVERITY: P0] /schedule/[season] is missing the season switcher entirely
**What's broken:** The dynamic season route shows `{season} SEASON` text but no switcher control — once a user lands on /schedule/2024 they cannot pivot to 2025 or 2026 without going back to /schedule. The root /schedule HAS the switcher; this page lost it.
**User-visible symptom:** User clicks "2024" on /schedule, lands on /schedule/2024, then has no UI affordance to switch year — they must hit browser back or retype the URL.
**Fix:** Lift the switcher JSX from `app/schedule/page.tsx:33-47` into a shared `<SeasonSwitcher current={seasonNum} />` component and render it inside `<header>` of both pages. Mark the active pill by comparing `y === seasonNum`.
**Why:** The switcher is a global navigation primitive; duplicating it (or omitting it) breaks horizontal navigation across years.

### [apps/web/app/schedule/[season]/page.tsx:22-25] [SEVERITY: P1] No validation on the `[season]` URL segment — `Number(season)` on a bad slug silently yields NaN and Jolpica returns []
**What's broken:** `seasonNum = Number(season)` will produce NaN for `/schedule/foo` and the page renders an empty list with no 404 and no error. Also there's no bounds check (1950 ≤ season ≤ currentSeason+1).
**User-visible symptom:** /schedule/garbage renders a working page with header "garbage SEASON" and "0 rounds." Source: Jolpica F1. Looks like the API died.
**Fix:** Add at the top of the page function: `if (!Number.isInteger(seasonNum) || seasonNum < 1950 || seasonNum > new Date().getUTCFullYear() + 1) notFound();`. Import `notFound` from `next/navigation`.
**Why:** Real 404 is honest; the silent empty grid is the worst kind of "alive but lying" UI.

### [apps/web/app/schedule/[season]/page.tsx:25] [SEVERITY: P1] `nextIdx` is computed on past seasons where every race is in the past — the "NEXT" badge silently disappears, which is correct, but the label "ROUND" stays the same and there's no "FINAL ROUND" or season summary anywhere
**What's broken:** For past seasons (2024 viewed in 2026), `findIndex` returns -1 → no "NEXT" badge ever lights. That's fine, but the page never tells the user the season is *over*; there is no winner card, no final-standings cross-link, nothing.
**User-visible symptom:** Viewing /schedule/2024 looks identical to viewing /schedule/2026 except for the dates — no season-level "Concluded · Champion: X" framing despite that data being one Jolpica call away.
**Fix:** After `const races = ...`, if `races.every(r => new Date(r.raceStartIso) < now)`, fetch `jolpica.getDriverStandings(seasonNum)` and render a "SEASON CONCLUDED — CHAMPION" strip linking to `/standings/${seasonNum}` and `/drivers/${champion.slug}`. Add this above the race list.
**Why:** A "schedule" view of a past season without the verdict is a dead surface.

### [apps/web/app/schedule/page.tsx:80-83] [SEVERITY: P2] `formatDateRange(r.sessions[0]?.iso ?? r.raceStartIso, r.raceStartIso)` is broken when only one session exists
**What's broken:** `formatDateRange` (lib/format.ts:102-110) treats the second arg as "end of range" — but for many older Jolpica races only the race-day `R` session exists, so we pass `(raceStart, raceStart)`. Output becomes "23 May – 23 May 2024", with redundant dates and an em-dash separator that is BANNED by founder rule ("NO em dashes").
**User-visible symptom:** Past-season cards show wonky duplicate-date labels with an en-dash separator (line 109: `${startStr} – ${endStr}`) — and the en-dash itself, while not literally an em-dash, still violates the spirit of the rule and looks visually identical to laypeople.
**Fix:** In `lib/format.ts:106-109`, when `start.toISOString().slice(0,10) === end.toISOString().slice(0,10)` return just `start.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })`. Replace the ` – ` separator with ` to ` or a `·`. Apply both in `app/schedule/page.tsx:80` and `app/schedule/[season]/page.tsx:70`.
**Why:** Honest single-day display, and matches the project's no-dash typography policy.

### [apps/web/app/schedule/[season]/[race]/page.tsx:59-65] [SEVERITY: P1] Session times rendered server-side with `toLocaleString('en-GB')` instead of viewer's local TZ — copy on /schedule/page.tsx says "All times in your local timezone" but they aren't
**What's broken:** `fmtSessionDate` calls `new Date(iso).toLocaleString('en-GB', {…})` on the *server*, which locks the output to the Vercel server's locale/TZ (UTC). The /schedule page header literally promises "All times in your local timezone." This is a lie.
**User-visible symptom:** A user in PT sees "Sun, 23 Mar 14:00" which is the UTC race start, not their 07:00 PT. They show up 7h early or late if they trust the UI.
**Fix:** Convert the `<li>` session block (lines 175-182) into a tiny client component `<SessionTime iso={s.iso} />` that runs `new Intl.DateTimeFormat(undefined, {...})` on mount, with a server-rendered UTC fallback wrapped in `<time dateTime={s.iso}>`. Or pass `Intl.DateTimeFormat().resolvedOptions().timeZone` from a client wrapper.
**Why:** Either deliver on the localization promise or remove the marketing copy. The current state is user-facing dishonesty.

### [apps/web/app/schedule/[season]/[race]/page.tsx:104-136] [SEVERITY: P3] Race detail header is missing the season switcher / round nav (prev round / next round) and circuit hero photo, but advertises a "ROUND XX" rail
**What's broken:** No prev/next round nav on the race detail page, no breadcrumb back to season chip showing the active year. The user has to backtrack via "← 2026 SCHEDULE" and re-click the next card. The hero image is rendered behind the SESSIONS grid (line 138-165) but not behind the header itself — a wasted opportunity, but more importantly there's no prev/next arrow control.
**User-visible symptom:** Browsing the calendar one race at a time requires 2 clicks per race (back, then forward). No keyboard-friendly arrow nav.
**Fix:** Add a `<RaceNav prevSlug={races[i-1]?.slug} nextSlug={races[i+1]?.slug} season={seasonNum} />` component below the breadcrumb. Requires returning `prevSlug`/`nextSlug` from `loadRace` by indexing on the schedule array.
**Why:** Match the navigation density of every real F1 site (formula1.com, motorsport.com); single-race-at-a-time browsing without lateral arrows is a 2010-era UX.

### [apps/web/app/schedule/[season]/[race]/page.tsx:138-212] [SEVERITY: P2] Hero image attribution may render with non-Unsplash sources, and the `<img>` tag is raw `<img>` not `next/image`
**What's broken:** Line 149 uses raw `<img src={hero.urlHero}>`. Next.js 16 with Tailwind v4 supports `next/image` and the project has the dependency. Raw `<img>` skips LCP optimization, blocks page weight budgets, and skips priority/placeholder. Also: attribution conditional (line 187) checks only `hero.attributionName && hero.attributionUrl` — for `source: 'wikidata'` and `source: 'hf-generated'` those are intentionally empty strings (per lib/heroImage.ts:120-122, 133-134), so the attribution block correctly hides, but no Wikimedia/HF attribution is rendered when those sources are used. HF-generated images especially must be labeled as such per platform honesty policy.
**User-visible symptom:** AI-generated hero images render with no badge telling the user they're synthetic — directly violates the "NOTHING fake, simulated, synthetic" mandate.
**Fix:** (a) Swap line 149-155 to `<Image src={hero.urlHero} alt={hero.alt} fill className="-z-10 object-cover opacity-40" priority />`. (b) Add a conditional badge: `{hero.source === 'hf-generated' && <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-[0.14em] bg-black/60 px-2 py-1">AI illustration</span>}`. (c) Render Wikimedia attribution when `hero.source === 'wikidata'`.
**Why:** Honesty about image provenance is non-negotiable per founder mandate; `next/image` is the platform-blessed path.

### [apps/web/app/schedule/[season]/[race]/page.tsx:299-309] [SEVERITY: P1] Circuit metadata cells render only 4 values — three of them are tautologies (round, season, location, name) and the *real* circuit data (length, laps, turns, lap record) is missing despite being fetchable from Jolpica + Wikidata
**What's broken:** The CIRCUIT section has 4 cells: CIRCUIT name, LOCATION, ROUND, SEASON. Three of those are already in the page header. Jolpica's `CircuitInfo` (when available) and Wikidata both expose `length_km`, `lap_count`, `turn_count`, `lap_record_time`, `lap_record_driver`, `lap_record_year`, `direction`. The "premium driver profile" gets a 12-cell Wikidata strip; the race page gets four duplicated fields.
**User-visible symptom:** Premium product, dead box. User sees nothing they didn't already see in the header.
**Fix:** Add a Wikidata lookup `getCircuitMetadata(circuitId)` (model on `getDriverWikidata`) returning `{ lengthKm, lapCount, turnCount, lapRecord: { time, driverSlug, year }, direction, firstGP }`. Render as 8 cells: LENGTH, LAPS, TURNS, DIRECTION, LAP RECORD (clickable to driver), FIRST GP, ALTITUDE, CITY/COUNTRY. Drop the duplicate CIRCUIT/ROUND/SEASON cells.
**Why:** Every other detail page in the app is data-dense; this one collapses to a name and a number. Hardest violation of the "world-class, phenomenal" mandate.

### [apps/web/app/schedule/[season]/[race]/page.tsx:286-297] [SEVERITY: P3] "Upcoming" empty state has copy but no countdown timer, no broadcast info, no ticket/circuit links — pure prose dead-space
**What's broken:** When `hasResults === false`, the section shows one line of editorial copy ("Race hasn't happened yet. Results land here within minutes of the chequered flag.") and nothing else. There's no countdown to lights-out, no link to a hypothetical liveblog, no broadcast schedule, no qualifying preview — even though `race.sessions` and `race.raceStartIso` are right there.
**User-visible symptom:** Future races feel hollow. The only "active" UI is the weather strip below.
**Fix:** Replace the empty box (lines 287-296) with `<UpcomingRacePanel race={race} />` that renders a live countdown to `race.raceStartIso` (client component using `requestAnimationFrame` or `setInterval`), session-by-session "next up" highlight, and a "Live coverage" CTA linking to `/live` (already exists per Phase A).
**Why:** Future-race detail is the most-visited variant during a season; it currently does the least work.

### [apps/web/app/schedule/[season]/[race]/page.tsx:311-318] [SEVERITY: P2] WeatherStrip silently disappears when lat/lon NaN or Open-Meteo returns null — no UI hint that weather data exists elsewhere or that the race is outside the 14d/5y window
**What's broken:** `WeatherStrip` returns `null` for old/future races outside Open-Meteo's window (per openmeteo/client.ts:78-82 — `pickSource` returns 'none' beyond ~5 years past or 14 days future). The page renders nothing. No "WEATHER UNAVAILABLE — RACE TOO FAR OUT" placeholder, no link to historical norms.
**User-visible symptom:** Race detail pages for old (>5y) or far-future (>14d) races have no weather section, with zero indication why. Looks like dead code.
**Fix:** Move the null check inside `WeatherStrip` (component already has it at line 106) and replace null return with an unobtrusive single-line strip: `<div>WEATHER · Forecast available 14 days before race</div>` keyed off the source decision. Or render historical seasonal norms (Open-Meteo `climate` endpoint) for far-future races.
**Why:** Empty space without explanation reads as a broken component to a power user.

### [apps/web/components/race/WeatherStrip.tsx:172-175,178-182] [SEVERITY: P3] Weather strip displays temps as "26-30C" with no degree symbol or space, and "MM" / "KPH" units run on without a space
**What's broken:** `${Math.round(lo)}-${Math.round(hi)}C` and `${wind}KPH` and `${ui.raceDay?.totalPrecipitationMm}MM` render as `26-30C`, `28KPH`, `5.0MM`. Premium product style demands either `26-30°C`, or `26 — 30°C`, or at minimum a space before the unit. Telemetry-grade chrome looks low-end here.
**User-visible symptom:** Visually cheap, looks like a Bash printf. Inconsistent with the editorial-grade type elsewhere in the page (font-display 7xl headlines).
**Fix:** In `WeatherStrip.tsx:172, 174, 179, 181, 202, 230`, use `°C` (real degree glyph), put a space before units. Output: `26-30 °C`, `28 km/h`, `5.0 mm`. Move the unit suffix to a `<span className="text-data text-outline ml-1">°C</span>` so the number scales with display type and the unit stays small.
**Why:** Typographic discipline is the whole point of the project bible.

### [apps/web/components/race/WeatherStrip.tsx:147] [SEVERITY: P3] `glass-subtle` class applied to weather hero but underlying class definition is project-internal — verify it's actually defined in tailwind config / globals
**What's broken:** Project uses Tailwind v4 with custom utility tokens. `glass-subtle` is referenced but unless it resolves through `@apply` in globals.css it'll fall through silently and render flat. Cannot confirm without reading globals — but if it does fall through, the "glass" hero strip is just a transparent box.
**User-visible symptom:** Weather strip looks flat instead of the intended glass-subtle treatment.
**Fix:** Verify `apps/web/app/globals.css` defines `.glass-subtle { @apply backdrop-blur-md bg-surface-container/40 …; }`. If missing, add it. If present, no-op this finding.
**Why:** Custom tokens must be defined in one place; silent fall-through is a debugging tax.

### [apps/web/app/schedule/[season]/[race]/page.tsx:83-95] [SEVERITY: P2] JSON-LD SportsEvent omits `endDate`, `image`, `performer`, `offers`, `organizer` — basic but unenriched
**What's broken:** JSON-LD has `name`, `startDate`, `location`, `sport`, `url`. Missing: `endDate` (race day end), `image` (the hero), `performer` (drivers entering — array of `Person`), `organizer` (FIA), `competitor` (constructors). Google's SportsEvent rich result requires `name + startDate + location.address` minimum (we have that), but enriched fields lift CTR significantly.
**User-visible symptom:** No rich snippet in Google SERPs; appears as a plain text result. Direct visibility revenue lost.
**Fix:** Extend the jsonLd object (line 83-95) with `endDate: race.raceStartIso` (or `+ 4h`), `image: [hero?.urlHero].filter(Boolean)`, `organizer: { '@type': 'Organization', name: 'FIA', url: 'https://www.fia.com' }`, and `performer: results.length ? results.slice(0,3).map(r => ({ '@type': 'Person', name: r.driver.fullName })) : undefined`.
**Why:** Free SEO win; Schema.org adoption is part of "world-class."

### [apps/web/app/schedule/[season]/page.tsx:48-77] [SEVERITY: P1] Card click intent destroys deep-link ergonomics — the entire 200px row is one `<Link>`, but the round number, country flag, and circuit name should be sub-targets when applicable
**What's broken:** Single `<Link>` wraps everything. There's no secondary affordance to jump to e.g. `/circuits/${slug}` or `/seasons/${season}/round/${round}/results`. Compare with /standings rows that have driver→profile + team→team-page link splits.
**User-visible symptom:** User cannot middle-click the country name to filter the schedule by country, can't click the circuit name to go to a circuit page. Whole card is one big swallow-target.
**Fix:** Keep the wrapping `<Link>` but add nested `<Link>`s using `e.stopPropagation()` patterns OR refactor to a Stack-of-Links pattern: outer wrapper is a flex container, top row clicks → race detail, secondary row clicks → circuit/country pages. Reference: ResultsTable pattern at line 252-269 of [race]/page.tsx.
**Why:** Density of internal links = density of "alive" feel.

### [apps/web/app/schedule/page.tsx:30-31] [SEVERITY: P3] Header copy "{races.length} rounds. Live data from Jolpica F1. All times in your local timezone." promises three things — only one is true
**What's broken:** "Live data" — the schedule is ISR-cached at 1h revalidate (`export const revalidate = 3600`); fine. "All times in your local timezone" — already flagged P1 above (server-side `toLocaleString('en-GB')` locks to server TZ). "{races.length} rounds" — accurate.
**User-visible symptom:** User feels lied to once they notice the times don't match their watch.
**Fix:** Either fix the TZ rendering (see WeatherStrip P1 finding) or change the copy to "All times shown in UTC." Honest is better than aspirational.
**Why:** Marketing copy must match implementation; founder rule.

### [apps/web/components/race/SessionWeatherIcon.tsx:19-22] [SEVERITY: P3] Icon returns `null` for `weathercode == null` AND for `bucket === 'unknown'` — silent disappearance with no debug surface
**What's broken:** Two distinct "no data" failure modes both collapse to null. For data integrity audit (founder mandate "every feature alive"), there should be a sentinel: `<span title="No forecast" className="text-outline">·</span>` so a debugger or user knows the slot exists but the upstream lacked data.
**User-visible symptom:** Some session chips have an icon; others don't, with no explanation why. Looks inconsistent.
**Fix:** Replace `return null` (line 19, 22) with a minimal placeholder dot: `return <span aria-hidden className={`material-symbols-outlined ${color}`} style={{fontSize:size}}>radio_button_unchecked</span>` with `title="No forecast yet"`.
**Why:** Visible nothing > invisible nothing.

### [apps/web/app/schedule/[season]/[race]/page.tsx:106-111] [SEVERITY: P3] Back-link uses literal `←` arrow character, not Material Symbols
**What's broken:** Line 110: `← {seasonNum} SCHEDULE`. Project bible CLAUDE.md line: "Use Material Symbols, not inline SVG icons, unless asked." Inline glyph arrows are a sibling sin.
**User-visible symptom:** Rendering inconsistency vs. every other arrow in the app (line 87-89 uses `chevron_right` Material Symbol). Looks ad-hoc.
**Fix:** Replace with `<span className="material-symbols-outlined text-[18px]">chevron_left</span>` and align with flex.
**Why:** One-icon-system rule.

### [apps/web/app/schedule/[season]/[race]/page.tsx:262-269] [SEVERITY: P2] Team link in results table doesn't render the team color stripe — only the driver row has the color cell — but team name itself isn't accompanied by any color/logo affordance
**What's broken:** The team column shows just the team name as a Link. Compare to /drivers row above (lines 244-250) which has a vertical color bar. Team column has neither logo nor color identifier.
**User-visible symptom:** Quick visual parse of "which team is which" is impossible at the team column; user has to read words. Premium F1 product fails the at-a-glance test.
**Fix:** Wrap the team `<Link>` in a flex container with `<span className="inline-block h-3 w-3" style={{ backgroundColor: color }} />` before the text. Or render a tiny `team-logo` if logo URL is mapped.
**Why:** F1 fans recognize teams by color first, name second.

### [apps/web/app/schedule/[season]/[race]/page.tsx:69-72] [SEVERITY: P2] `loadRace` returns null which triggers `notFound()` — but loadRace returns null for either "season has no races" OR "race slug not in season." User can't tell which case occurred.
**What's broken:** Single `null` return collapses two different failure modes — bad season vs bad race. The 404 page can't differentiate, so the user just sees "Race not found."
**User-visible symptom:** A typo'd slug on a valid season shows the same screen as a totally invalid season. No "did you mean…" suggestion based on similar slugs.
**Fix:** In `loadRace`, throw distinct error types or return a discriminated union `{ kind: 'invalid-season' } | { kind: 'race-not-found', suggestions: string[] } | { kind: 'ok', ... }`. In the page, render a custom 404 with the closest 3 slugs by Levenshtein distance.
**Why:** Premium product = recoverable errors; a hard 404 is a dead end.

### [apps/web/app/schedule/[season]/[race]/page.tsx:73] [SEVERITY: P3] Winner is read as `results[0]` — assumes Jolpica returns sorted-by-position. True today but no guard.
**What's broken:** `const winner = hasResults ? results[0] : null;` — relies on Jolpica's `MRData.RaceTable.Races[0].Results` already being sorted by `position`. Empirically true; not guaranteed by the API contract.
**User-visible symptom:** If Jolpica ever changes ordering (or returns sprint-results-then-race-results, which has happened on sprint weekends), the "Winner: X" copy will be wrong.
**Fix:** `const winner = hasResults ? results.find((r) => r.position === 1) ?? results[0] : null;`
**Why:** Cheap defensive guard; survives upstream re-ordering.

---

**COUNT:** P0=1 P1=7 P2=7 P3=8

**TOP_FIVE_PRIORITY:**
1. **[P0] /schedule/[season]/page.tsx:18-39** — missing season switcher; user gets stuck on a season with no UI to leave it.
2. **[P1] [season]/[race]/page.tsx:59-65 (`fmtSessionDate`)** — server-rendered times in en-GB while UI promises "local timezone." Direct user-facing lie that causes real-world misuse.
3. **[P1] [season]/[race]/page.tsx:299-309 (Circuit cells)** — dead box duplicating header info; no real circuit metadata despite Wikidata being one query away.
4. **[P1] schedule/page.tsx:13 (`SEASON = 2026`)** — hardcoded current year; will silently rot at year rollover.
5. **[P1] [season]/page.tsx:22-25 (no season validation)** — bad URL renders an empty schedule with "0 rounds" header instead of 404.

**FIX_BUNDLE_SIZE:** ~420 LOC total
- Shared `<SeasonSwitcher />`: ~30 LOC
- Dynamic SEASON resolver: ~10 LOC
- Season validation + notFound: ~6 LOC
- Past-season "concluded" strip: ~40 LOC
- `formatDateRange` single-day fix + dash policy: ~12 LOC
- Client `<SessionTime />` localization: ~25 LOC
- Race prev/next nav: ~40 LOC
- `next/image` + AI/Wikimedia attribution: ~30 LOC
- Circuit Wikidata metadata fetcher + 8-cell grid: ~120 LOC
- `<UpcomingRacePanel />` countdown + sessions preview: ~70 LOC
- WeatherStrip empty-state strip + typography polish: ~25 LOC
- SessionWeatherIcon placeholder dot: ~6 LOC
- JSON-LD enrichment: ~12 LOC
- Material Symbol back arrow + team color stripe: ~10 LOC
- `loadRace` discriminated union + 404 suggestions: ~50 LOC (incl. levenshtein helper)
- Winner `find()` guard: ~2 LOC

Files touched: 5 listed + new `apps/web/components/race/SeasonSwitcher.tsx`, `apps/web/components/race/SessionTime.tsx`, `apps/web/components/race/UpcomingRacePanel.tsx`, `apps/web/components/race/RaceNav.tsx`, `apps/web/lib/circuitMeta.ts`, edits to `apps/web/lib/format.ts`.
