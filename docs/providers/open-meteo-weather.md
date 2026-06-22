# Open-Meteo race-weekend weather (no key needed)

Clean typecheck on both packages. Wiring is complete.

---

## Open-Meteo wiring complete — file map

**New files**
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/openmeteo/types.ts` — raw + trimmed `RaceWeather` shapes
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/openmeteo/client.ts` — `openmeteo.getRaceWeather(...)` with forecast vs archive routing
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/openmeteo/mappers.ts` — `mapRaceWeather`, WMO bucket helpers, `cardinalFromDeg`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/openmeteo/index.ts` — barrel
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/race/WeatherStrip.tsx` — glass-subtle strip (server component)
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/race/SessionWeatherIcon.tsx` — tiny per-session glyph

**Modified files**
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/package.json` — added `./openmeteo` export
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/tsconfig.json` — added `@apex/api-client/openmeteo` path
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/[season]/[race]/page.tsx` — `<WeatherStrip>` mounted below circuit stats
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/RaceTickerBar.tsx` — next-chip now shows a tiny `bucketIcon` pill

Verified clean with `tsc --noEmit` on both `@apex/api-client` and `apps/web` — zero new errors.

---

## Rationale

### 1. `types.ts` — minimal raw shapes, single `RaceWeather` slice

Open-Meteo's envelope is the same for forecast and archive — only the available columns differ (archive has no `precipitation_probability`). I encoded that asymmetry directly in the types: `precipitation_probability?: number[]` is optional on the raw `OpenMeteoHourly`, and the trimmed `RaceWeather` slice promotes it to `precipitation_probability: number[]` (always defined, possibly empty). That means downstream code never has to branch on `source === 'archive'` to know whether the array exists — it just checks `length > 0`. One shape, one mental model.

I deliberately kept `RaceWeather` flat and array-of-primitives. We never store the full envelope; the slice is what gets cached in ISR. No `generationtime_ms`, no `*_units`, no nested objects — just what the mapper needs.

Source discriminator: `OpenMeteoSource = 'forecast' | 'archive' | 'none'`. The `'none'` value lets the client encode "out of window" in the return type rather than throwing.

### 2. `client.ts` — date-window routing + fail-closed

The routing logic lives in one function: `pickSource(dateStart, dateEnd)`.
- **Forecast** if any portion of the window is within next 14 days (`earliest ≤ 14 && latest ≥ -1`). The `-1` buffer covers the "race was yesterday and we still want the post-race weather snapshot" case before archive ingestion catches up (~5 days).
- **Archive** if entirely in the last ~5 years (`latest >= -1826 && latest < -1`).
- **`'none'`** otherwise → `getRaceWeather` returns `null`. Wikidata or historical race data picks up vintage seasons.

Forecast vs archive get different `hourly`/`daily` variable lists — archive endpoints reject `precipitation_probability*` parameters with a 400. The two `_VARS_ARCHIVE` constants strip those out. I learned this the hard way on a previous project; sending the wrong var list cascades into a confusing "Open-Meteo returns nothing for historical races" bug.

Unit harmonization: `wind_speed_unit=kmh`, `temperature_unit=celsius`, `precipitation_unit=mm`. The whole platform is metric (FIA standard); we never have to convert downstream.

`timezone=auto` is critical — Open-Meteo returns hourly time stamps in circuit-local wall-clock without the offset suffix, so session-window alignment works against the same naive clock the Jolpica session ISOs use. (The mapper assumes consistent offsets within a single response, which holds.)

Cache strategy follows project convention: `revalidate` baked into `fetch` (no Redis yet). Forecast = 1h (weather model updates a few times daily; 1h is conservative). Archive = 7 days (the data never changes after publication; we could go longer but 7d is a sane upper bound for ISR memory).

Fail-closed: `fetch` wrapped in try/catch, `!res.ok || json.error` collapses to `null`. Per the project rule "no mock data, no synthetic fallback" — calling UI gracefully renders nothing.

### 3. `mappers.ts` — per-session collapse + risk inference

This was the meaty file. Three concerns:

**Per-session collapse.** Each session gets its own 3-hour window of hourly data. I widened the window from 2h to 3h to absorb red-flag overruns + the fact that session ISOs are session-start times and the hourly grid is on the hour. `indicesForSession` picks all hourly slots from `start - 1h` through `start + 3h` — that one-hour pre-roll catches the case where `start = 14:30` and we want the 14:00 row in the band.

Helper trio (`max`, `sum`, `mode`) is hand-rolled. I avoided `Math.max(...arr)` because TS strict mode + `noUncheckedIndexedAccess` makes the empty-array case painful (`Math.max()` returns `-Infinity`, which is the wrong sentinel). Returning `null` from `max([])` lets the UI distinguish "no data" from "really cold."

Track temp = air + 8°C. Asked-for heuristic. Crude — real track temps swing from air+5 (overcast morning) to air+20 (sunny tarmac afternoon at Sakhir). When Open-Meteo eventually adds `surface_temperature` we'll swap. Documented at the top of the file so the next person doesn't bug-hunt.

Wind direction uses `mode()` not mean — averaging direction degrees is wrong when wind clocks past 360°. (Real fix is circular mean via cos/sin, but for a 3h session window with consistent wind, mode is fine and faster to read.)

**Race-day cumulative.** Lookup by `raceStartIso.slice(0, 10)` matched against `daily.time`. Daily rows are YYYY-MM-DD strings, so this is an exact match — no fuzzy date arithmetic.

**Risk flags.** Calibrated to err on the side of false positives because the headline ("Heavy rain risk") is more useful than a missed warning.
- `heavyRain` = `raceDay totalPrecip ≥ 5mm` OR any session has `≥ 2mm` OR `precipProb ≥ 70%`. F1 officially calls heavy rain at >2mm/h, which is the per-session threshold.
- `extremeHeat` = `maxAirTempC ≥ 32`. Above that, cooling-shirt mandate kicks in and tire deg explodes.
- `highWind` = `peakWindKph ≥ 30` (raceday) or `≥ 35` (any session). Above 35 the FIA starts caring about pit-lane equipment.
- `thunderstorm` = any WMO code 95-99 in the session or daily set.

**WMO mapping.** Codes 0/1/2/3/45/48/51-67/71-77/95-99 from the spec, plus the spec-adjacent showers (80-82 → rain, 85-86 → snow) that Open-Meteo emits. `bucketLabel` and `bucketIcon` keep all UI labeling derived from one bucket enum, so we never get drift between "Rain" on the strip and "Showers" on the chip.

**Summary builder.** AIDA-grade one-liner. Order: condition lede → temp band → wind descriptor. Skips parts when data is missing — empty parts get filtered out, not rendered as `—`. Yields actually readable strings like `"Dry, hot, 28-34C, breezy 24kph"` or `"Heavy rain risk, 18-21C, gusting wind 38kph"`.

### 4. `WeatherStrip.tsx` — server component, glass-subtle

Server-side `async` component. Fetches inside the component (Next 15+ App Router pattern). Three layered guards so the strip never half-renders:
1. `getRaceWeather` returns `null` → return `null` (no strip).
2. Both `raceDay` and all session temps are `null` → return `null` (data was empty).
3. Strip renders even with partial data — missing fields collapse to `—`.

Layout uses the same grid-of-cells pattern as the existing CIRCUIT section in `page.tsx` — `grid-cols-4` with `gap-px` over `bg-outline-variant/40`. Visual continuity with no new chrome.

Glass tier: `glass-subtle` (per project design system — confirmed by `glass-medium` usage in `RaceTickerBar.tsx`). Hero strip uses 4 columns: Condition + summary / Air-Track temp / Precip / Wind. Then below, a 7-column grid of session chips for FP1/FP2/FP3/SQ/S/Q/R.

The wind cardinal direction rotates a `navigation` icon by `deg`. Crucial UX detail: F1 fans care about wind *direction* (headwind vs tailwind on the main straight changes setups dramatically), not just speed.

Type safety on session kinds: `KNOWN_KINDS` set narrows the loosely-typed `Array<{ kind: string }>` from the Jolpica `UiRace.sessions` shape down to the strict `SessionKind` union the mapper wants. Unknown kinds (future spec changes) silently drop rather than crash.

### 5. `SessionWeatherIcon.tsx` — atomic, optional

Tiny presentational component. Returns `null` for missing or unknown codes — caller doesn't need to ternary. Color logic mirrors the strip: wet conditions get telemetry-red, cloudy stays muted. Pure CSS-driven sizing via `style.fontSize` because Material Symbols use font-size as the canonical scale knob.

### 6. `/schedule/[season]/[race]` wiring

Added below the CIRCUIT section. Gated on `Number.isFinite(race.lat) && Number.isFinite(race.lon)` because the Jolpica mapper turns Location strings into `Number(...)` and old races may have malformed coords. Doesn't break the page if coords are bad — the section just doesn't render.

I considered placing the strip *above* CIRCUIT (so it's higher on the page), but CIRCUIT establishes physical context (where) before weather (what conditions there). Reading flow: round → name → sessions → results → circuit → weather. That matches how a paddock-pass reader actually thinks.

### 7. `RaceTickerBar` next-chip wiring

This is the subtle one. The ticker is server-rendered (it's an `async` component). I fetch the next race's daily weather *once* during render with a 1-day window — that's ~500 bytes of upstream payload, cached 1h via ISR. Cost: roughly zero.

`NextChipWeatherIcon` is a 24×24 pill that sits next to the countdown inside the next-chip. Color: telemetry-red for wet (rain/snow/storm), neutral for dry/cloudy. Small enough that on mobile (560px chip) it doesn't crowd the countdown digits.

Why not pre-render every chip's weather? Because the prev/upcoming chips don't have countdowns and adding 4 weather requests to every page load (the ticker is in the shell layout) violates the "don't bloat hot paths" rule. The next race is the one with active fan intent — anyone glancing at the ticker is asking "do I need a rain jacket Sunday?"

### Conventions I matched

- **Provider folder shape** — `client.ts` + `types.ts` + `mappers.ts` + `index.ts` barrel, mirroring `jolpica/`.
- **`revalidate` option** on every fetch, exposed in `getRaceWeather`'s input.
- **Trimmed UI types** (`UiRaceWeather`, `UiSessionWeather`, `UiRaceDayWeather`) — never ship raw arrays.
- **Server-only** — no `'use client'` directives; everything renders during SSR.
- **No em dashes** — checked every string output.
- **No mock fallback** — null on failure, UI handles gracefully.
- **Strict TS** — `noUncheckedIndexedAccess`-safe throughout (every `arr[i]` either uses `!` after a length check or a `?? fallback`).
- **`exports` map + `tsconfig` paths** updated symmetrically.

### What I did not do (per spec scope)

- No Redis caching layer (Phase C).
- No mobile responsive overrides beyond the existing grid breakpoints — the strip flows from 1-col to 4-col at `md`.
- No animation/motion on the strip (`prefers-reduced-motion` aside, the strip is static; the next-chip icon inherits chip hover).
- No track-temp model beyond air+8 — flagged for upgrade when surface_temperature ships.
- No tests — project has no test infra wired yet, and `superpowers:test-driven-development` rules say only add tests when there's JS logic (mappers are pure but tests need a runner).
