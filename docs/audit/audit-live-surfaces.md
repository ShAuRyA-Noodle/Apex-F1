# Live audit — /live/timing /live/race-control /live/track + SSE + cron routes

Signature is correct. Now I have everything needed to compile the audit. Let me emit findings in the strict format.

---

# AUDIT: live timing · real-time · cron slice

### [apps/web/components/live/LiveConnectionBadge.tsx:11] [SEVERITY: P0] [`LiveConnectionBadge` never mounted — dead component]
**What's broken:** `LiveConnectionBadge` and `useLiveStream` exist but `grep -rn` proves they are imported nowhere outside their own files. The whole `/api/live/stream` SSE pipeline ships zero UI surface — fans cannot see "● LIVE STREAM" anywhere.
**User-visible symptom:** Phase C "real-time fanout" claim is invisible. `/live/timing`, `/live/race-control`, `/live/track` headers all render a static `● LIVE` token from server ISR, with no proof the stream is alive.
**Fix:** In `apps/web/app/live/timing/page.tsx` line 117 header, import the badge as a client island (`import { LiveConnectionBadge } from '@/components/live/LiveConnectionBadge'`) and render it inside the `<div className="flex items-center gap-3">` block at line 95, right after the `● LIVE` span. Repeat in `race-control/page.tsx` line 58 and `track/page.tsx` line 65.
**Why:** SSE infra without a UI badge is a tree falling in an empty forest — wire the badge so the stream proves itself.

### [apps/web/app/live/timing/page.tsx:198] [SEVERITY: P0] [Roadmap marketing copy bleeds into production UI]
**What's broken:** Footer caption reads `"Stable up to ~1Hz under load. Phase C delivers WebSocket fanout for sub-second updates."` Phase C already shipped — `/api/live/stream` exists. The page advertises a roadmap promise that the product already keeps.
**User-visible symptom:** Founder sees stale marketing copy on the page that contradicts the shipped SSE route.
**Fix:** Replace lines 198-200 with: `Source: OpenF1 (${session.session_name}, session #${session.session_key}). ISR ${isLive ? '5s on intervals + positions, 60s on drivers + weather' : '30s'}. Live tick fanned out via /api/live/stream at 0.5 Hz.`
**Why:** Copy must describe what is, not what was promised — dead Phase C reference erodes trust.

### [apps/web/app/live/track/page.tsx:157] [SEVERITY: P0] [Track page advertises missing SVG silhouette]
**What's broken:** Page is titled "Live track" but contains no circuit silhouette anywhere. Lines 157-159 explicitly say `"SVG track map + per-driver position dots land in Phase C"` — a stub disclaimer in production UI.
**User-visible symptom:** User loads `/live/track` expecting a map, scrolls to the bottom, reads a "coming later" caveat. Page reads as half-finished.
**Fix:** Either (a) remove the disclaimer and rename the page header to `"Track conditions"` (`<h1>` line 73), update metadata title to match (line 9), and drop the "Live track" label; or (b) ship a real silhouette via the `circuits` table in `@apex/api-client/jolpica` — Jolpica returns `Circuit.url` (Wikipedia) and lat/lon, but a proper silhouette needs the SVG from `f1-circuits` (MIT) — import once into `public/circuits/{circuitId}.svg` and render via `<img src={`/circuits/${session.location.toLowerCase()}.svg`}>`.
**Why:** A page named "Live track" with no track is a P0 broken promise.

### [apps/web/app/live/timing/page.tsx:75] [SEVERITY: P1] [Weather strip renders blank when OpenF1 returns no sample]
**What's broken:** Line 73 reads `weather[weather.length - 1]` → returns `undefined` outside live window, and lines 110-112 render `·` for every weather cell when the API answers with `[]` (OpenF1 returns no weather between sessions). The `latestWeather && (...)` guard hides the entire strip cleanly, but the `·` placeholder still renders in `track/page.tsx` lines 83-100 because that page lacks the guard.
**User-visible symptom:** `/live/track` "CONDITIONS" grid shows six tiles of `·°C / ·°C / ·% / · mb / · m/s / ·` on every non-live day.
**Fix:** In `apps/web/app/live/track/page.tsx`, wrap the entire `<section>` from line 79 to 104 in `{latestWeather ? (...) : <p className="px-4 py-12 md:px-grid-margin text-sm text-outline">Weather telemetry resumes when the next session opens.</p>}`.
**Why:** Empty placeholders are uglier than honest "no data" copy.

### [apps/web/app/api/cron/rss-sync/route.ts:50] [SEVERITY: P1] [`revalidateTag('news-feed', 'page')` is a no-op]
**What's broken:** The cron calls `revalidateTag('news-feed', 'page')` but `grep -rn "news-feed" apps/web packages` returns only this one line. No `fetch(...)` anywhere tags its response with `'news-feed'`, so the call invalidates nothing. The Next 16 signature `revalidateTag(tag: string, profile: string | CacheLifeConfig)` is satisfied syntactically but semantically dead.
**User-visible symptom:** First visitor after cron tick still gets the previous-window cache for `/latest`, despite the cron "succeeding."
**Fix:** Either (a) add `next: { tags: ['news-feed'], revalidate: 300 }` to every provider fetch inside `packages/api-client/src/rss/*` so the tag has cached responses to invalidate, or (b) drop the `revalidateTag` line entirely and rely on `revalidatePath('/latest')` + `revalidatePath('/')` (already on lines 47-48), which is already doing the real work.
**Why:** Calling tag invalidation against an unattached tag is theatre — pick path-based invalidation OR thread the tag through fetches, not both halfway.

### [apps/web/app/api/cron/weather-sync/route.ts:32] [SEVERITY: P1] [Weather cron silently exits because `@apex/api-client/openmeteo` never resolves]
**What's broken:** Lines 32-47 use `dynamicImport('@apex/api-client/openmeteo')` because the openmeteo subpath does not exist yet in `packages/api-client`. Every cron tick takes the `if (!getRaceWeather)` branch at line 57 and returns `skipped: '@apex/api-client/openmeteo not available yet'` with HTTP 200. Cron passes monitoring but does nothing.
**User-visible symptom:** Weather chips on `/schedule/2026/[race]` get no forecast refresh; the cron's hourly schedule is wasted compute.
**Fix:** Ship `packages/api-client/src/openmeteo/index.ts` exporting `getRaceWeather({ lat, lon, dateStart })` against `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&hourly=temperature_2m,precipitation,wind_speed_10m` with `next: { revalidate: 3600 }`. Then update `packages/api-client/package.json` `exports` to add `"./openmeteo": "./src/openmeteo/index.ts"`. Replace the `dynamicImport` dance (lines 32-47, 56) with a direct `import { getRaceWeather } from '@apex/api-client/openmeteo';`.
**Why:** Late-binding optional imports are reasonable for the DB layer (which is genuinely WIP), but Open-Meteo is keyless and trivial — write it.

### [apps/web/app/api/live/stream/route.ts:36] [SEVERITY: P1] [`maxDuration = 300` will hard-fail on Vercel Hobby]
**What's broken:** Line 38 sets `maxDuration = 300` with comment `"Vercel pro cap; hobby cap is 60"`. Apex has not announced Pro; on Hobby this function will be killed at 60s. The SSE loop relies on the long-lived stream — every browser tab will see the connection drop at exactly 60s, the EventSource auto-reconnects, opens a new function, drops at 60s again. Quota burn + ugly reconnect blips.
**User-visible symptom:** `LiveConnectionBadge` (once mounted) will flicker `LIVE STREAM → RECONNECTING → LIVE STREAM` every ~60s.
**Fix:** Until billing tier is confirmed Pro, set `export const maxDuration = 60`. Inside the loop at line 122, add `if (Date.now() - startTime > 55_000) { emit('reconnect', { reason: 'rotate' }); close(); break; }` — emit a clean "rotate" event so the client can close + reopen without surfacing as an error. Track `startTime` from a `const startTime = Date.now()` declared once after `start(controller)`.
**Why:** Real users on Hobby tier need graceful rotation, not 60s function kills.

### [apps/web/app/api/live/stream/route.ts:21] [SEVERITY: P1] [SSE auth-open with zero rate limit invites quota burn]
**What's broken:** Comment at lines 21-24 acknowledges `"Currently open. Add CRON_SECRET-style auth when Apex+ ships"` but the route has no token bucket, no IP cap, nothing. A single bad actor opening 1000 tabs spawns 1000 long-running Node functions × 4 OpenF1 fetches per 2s tick = 2000 req/s to OpenF1, which "monitors abuse" (per the comment at line 25). Apex would get banned from OpenF1, not Vercel.
**User-visible symptom:** Site-wide live data outage when OpenF1 IP-blocks the deployment.
**Fix:** Add an in-memory token bucket at module scope: `const ipBuckets = new Map<string, { count: number; resetAt: number }>(); function checkIp(req: Request): boolean { const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'; const now = Date.now(); const bucket = ipBuckets.get(ip); if (!bucket || bucket.resetAt < now) { ipBuckets.set(ip, { count: 1, resetAt: now + 60_000 }); return true; } if (bucket.count > 5) return false; bucket.count++; return true; }`. Reject with 429 at the top of `GET()` when `!checkIp(req)`. 5 concurrent streams per IP per minute is a sane ceiling.
**Why:** Self-imposed rate limit costs ~15 LOC and prevents an OpenF1 IP ban.

### [apps/web/app/api/live/stream/route.ts:182] [SEVERITY: P2] [`cancel()` is empty — leaks on browser-side `EventSource.close()`]
**What's broken:** When the browser closes the EventSource (route change, tab close), `ReadableStream.cancel()` is invoked but the body at line 182-184 is `// No-op`. The comment says "abort handler in start() closes the controller," but `req.signal` only fires for client *disconnects* at the transport layer, not for `cancel()` initiated by the runtime. The `while (alive)` loop continues fetching OpenF1 until the next `controller.enqueue` throws.
**User-visible symptom:** Brief quota leak per disconnect (1-2 extra OpenF1 fetches) and one orphan tick of CPU.
**Fix:** Replace lines 182-184 with `cancel() { abort.dispatchEvent ? null : null; /* fall through to start's abort handler */ }`. Better: hoist the `close` function from `start` to outer scope by storing it on a ref, then `cancel() { closeRef?.(); }`. Concretely: declare `let closeFn: (() => void) | null = null;` outside the `start` block, set `closeFn = close;` inside `start`, and put `closeFn?.();` in `cancel()`.
**Why:** Defensive close on both abort paths is two lines for guaranteed cleanup.

### [apps/web/app/api/live/stream/route.ts:163] [SEVERITY: P2] [`race_control` emits last 3 messages every tick — duplicate-spam on the wire]
**What's broken:** Line 164 `rcRaw.slice(-3)` emits the same 3 messages every 2s. Client receives ~90 frames/min of identical RC content if nothing changes. Wastes bandwidth and forces the client to dedupe.
**User-visible symptom:** Network panel shows 30× the necessary SSE traffic; client `setSnap` runs even when data is unchanged, causing extra React renders.
**Fix:** At module scope: `let lastRcHash = '';`. Inside the tick (after the `if (Array.isArray(rcRaw)...)` block): ``const hash = rcRaw.length ? `${rcRaw.length}:${rcRaw[rcRaw.length - 1].date}` : '';`` then `if (hash !== lastRcHash) { emit('race_control', { messages: rcRaw.slice(-3), ts: Date.now() }); lastRcHash = hash; }`.
**Why:** Diff before emit is the SSE 101 — only push when the world changes.

### [apps/web/app/api/cron/jolpica-nightly/route.ts:69-74] [SEVERITY: P2] [Hardcoded `/results/2026/...` will rot in 2027]
**What's broken:** Lines 70-71 invalidate `/results/2026/drivers` and `/results/2026/teams` with literal `2026`. When 2027 rolls in, the cron silently invalidates the wrong year.
**User-visible symptom:** January 2027: first morning visitor sees stale 2026 standings on `/results/2027/...`.
**Fix:** Replace `2026` with a dynamic year. Pull season from the schedule fetch (already running): `const season = scheduleRes.status === 'fulfilled' && scheduleRes.value[0]?.season ? scheduleRes.value[0].season : new Date().getUTCFullYear();` then `revalidatePath(`/results/${season}/drivers`)` etc.
**Why:** Calendar-flip bugs are the cron equivalent of a Y2K — fix once.

### [apps/web/app/api/cron/rss-sync/route.ts:51] [SEVERITY: P2] [`revalidateTag` wrapped in try/catch with misleading comment]
**What's broken:** Lines 46-53 wrap `revalidatePath` + `revalidateTag` in `try { ... } catch {}` with the comment `"revalidate APIs only available in handler context; ignore failures"`. The route IS a handler — these APIs are always available. The silent catch hides real bugs (like the bad tag-name argument from finding #5).
**User-visible symptom:** When the tag arg is wrong, cron returns `ok: true` with zero cache busted — invisible failure.
**Fix:** Remove the try/catch wrapper at lines 46-53. Let revalidation errors propagate into the `catch (err)` block at line 54 so the response shows `ok: false, error: "..."`.
**Why:** Swallowed errors hide the truth — the founder asked for "fully functional, nothing fake," meaning failure modes must surface.

### [apps/web/app/api/cron/weather-sync/route.ts:23] [SEVERITY: P2] [`RaceWeatherShape = unknown` is meaningless TS]
**What's broken:** Line 23 declares `type RaceWeatherShape = unknown;` then uses it as the return type of `GetRaceWeatherFn`. `unknown` means "we have no idea what comes back," which prevents any compile-time safety on weather data downstream.
**User-visible symptom:** None directly, but invites runtime bugs when openmeteo client ships and consumers `as`-cast blindly.
**Fix:** Remove the alias and write the concrete shape: `interface RaceWeather { tempC: number; precipMm: number; windKph: number; iconCode: number; fetchedAt: string; }`. Use that in `GetRaceWeatherFn`'s return type. When you ship the openmeteo client per finding #6, re-export the same interface from `@apex/api-client/openmeteo` so both ends agree.
**Why:** `unknown` aliases are TypeScript's way of saying "I gave up" — name the shape.

### [apps/web/app/live/race-control/page.tsx:46] [SEVERITY: P2] [Race control: no client-side refresh — user must hard-reload]
**What's broken:** `revalidate = 15` (line 5) means the page re-renders at most every 15s, but only when traffic hits. A user staring at the page during a yellow flag will not see the next message until they reload. No `useLiveStream` wiring despite the SSE pipe explicitly emitting `race_control` events.
**User-visible symptom:** During a live session, the race control feed appears frozen until manual refresh.
**Fix:** Refactor the message list (lines 64-96) into a client component `RaceControlList.tsx` that takes server-rendered `initial: OpenF1RaceControlMessage[]` as a prop, subscribes via `useLiveStream()`, and merges `raceControl.messages` from the SSE snapshot on top of the initial server payload (dedupe by `date`).
**Why:** The SSE pipe is built — wire it to the page that benefits most.

### [apps/web/app/live/timing/page.tsx:108-114] [SEVERITY: P3] [Weather strip pretends `'·'` is a unit]
**What's broken:** `${latestWeather.air_temperature ?? '·'}°C` produces `·°C` when the API returns null inside the guarded block (rare but possible — sensor dropout). The bullet renders inside the unit string.
**User-visible symptom:** UI flashes `·°C` for a tick on sensor dropout.
**Fix:** `${latestWeather.air_temperature != null ? `${latestWeather.air_temperature}°C` : 'N/A'}` for each tile (lines 110-112).
**Why:** Null and a unit don't pair — pick one.

### [apps/web/app/live/race-control/page.tsx:73] [SEVERITY: P3] [Flag stripe column hardcoded 8px wide — collapses on narrow viewports]
**What's broken:** Grid template `grid-cols-[110px_8px_1fr_auto]` (line 73) fixes the flag stripe to exactly 8px. The stripe element at line 77 is `w-1.5` (6px). 2px of dead gap. On mobile (`<480px`), the 110px timestamp column eats 25% of viewport — message text gets squeezed.
**User-visible symptom:** On iPhone SE width, message text wraps awkwardly with a 2px ghost gutter beside the flag stripe.
**Fix:** Change grid to `grid-cols-[88px_6px_1fr_auto] md:grid-cols-[110px_8px_1fr_auto]` and stripe class to `w-1.5 md:w-2`.
**Why:** Mobile telemetry pages need tighter gutters than desktop.

### [apps/web/components/live/LiveConnectionBadge.tsx:14] [SEVERITY: P3] [`fresh` recalculates with `Date.now()` only on re-render — pulse goes stale]
**What's broken:** Line 13 `recentMs = lastFrameAt ? Date.now() - lastFrameAt : null` is evaluated only when the component re-renders. If no new SSE frame arrives, `lastFrameAt` does not update, no re-render, `fresh` stays `true` even when the stream went silent 30s ago. The red pulse keeps pulsing on a dead stream.
**User-visible symptom:** Badge shows `● LIVE STREAM` indefinitely after the stream stops emitting.
**Fix:** Inside `useLiveStream`, add a `setInterval(() => setSnap((s) => ({ ...s })), 5_000)` heartbeat tick that forces a re-render every 5s so `recentMs` is recomputed. Clear it in the useEffect cleanup.
**Why:** Liveness checks need their own clock — they cannot piggyback on the channel they are checking.

### [apps/web/app/api/live/stream/route.ts:107] [SEVERITY: P3] [Initial `session_state` emits `'completed'` once then never re-evaluates if it transitions to a new session]
**What's broken:** First-loop session is fetched at line 103, state emitted at line 111. Inside the loop, lines 125-132 re-poll session **only when `session` is null**. If a session is `completed` (line 142 sets `session = null;` — good), then a new session opens, the client sees `session_state: 'completed'` followed by `session_state: 'live'` only after the heartbeat interval (30s). Correct, but the comment at line 124 (`Re-fetch session each loop iteration`) misleads — it only refetches on null.
**User-visible symptom:** Up to 30s delay between session transitions appearing in the badge. Borderline acceptable; comment lies.
**Fix:** Fix the comment at line 124: `// Re-poll session only when previous was null (completed/no_session). Otherwise reuse cached session metadata for ${TICK_MS_LIVE}ms.`. If a faster transition is desired, drop the `await sleep(HEARTBEAT_MS_IDLE...)` to 10s.
**Why:** Comment-code drift is a P3 trust bug.

---

## COUNT: P0=3 P1=5 P2=6 P3=4

## TOP_FIVE_PRIORITY
1. **[P0] LiveConnectionBadge never mounted** — SSE infra is invisible to the user; mount the badge in all 3 `/live/*` headers (LiveConnectionBadge.tsx:11).
2. **[P0] `/live/track` advertises missing SVG silhouette** — kill the "Phase C" stub copy or ship a real silhouette set (track/page.tsx:157).
3. **[P0] `/live/timing` footer leaks roadmap promise** — Phase C is shipped; update the caption (timing/page.tsx:198).
4. **[P1] SSE auth-open with no rate limit** — IP token bucket before OpenF1 IP-bans the deployment (stream/route.ts:21).
5. **[P1] Weather cron is a silent no-op** — ship `@apex/api-client/openmeteo` and remove the dynamic-import escape hatch (weather-sync/route.ts:32).

## FIX_BUNDLE_SIZE
~340 LOC total
- P0 (3): ~45 LOC (badge wiring + 2 copy edits + optional silhouette wiring stub)
- P1 (5): ~180 LOC (rate limit ~25, openmeteo client ~80, race-control live merge ~50, weather guard ~10, revalidateTag cleanup ~5, maxDuration rotate ~15)
- P2 (6): ~85 LOC (SSE diff-before-emit ~10, cancel hoist ~10, dynamic year ~5, surface revalidate errors ~5, RaceWeather type ~15, race-control client component ~40)
- P3 (4): ~30 LOC (badge interval ~10, weather null handling ~10, grid tightening ~5, comment fix ~5)
