# API + provider audit — every @apex/api-client provider + every /api/* route

Now I have everything I need. Let me write the audit report. Note that there is no Groq client in this repo despite the audit prompt asking about it.

### [packages/api-client/src/jolpica/client.ts:35] [SEVERITY: P0] Jolpica client throws on non-2xx, breaking pages on Jolpica outages
**What's broken:** Unlike every other client in this slice, the Jolpica wrapper rethrows `Error('Jolpica ${status}...')` on any non-OK response. There is no upstream try/catch in many of its consumers (e.g. driver/team/race RSC pages). A single 5xx from `api.jolpi.ca` propagates into the React Server Component render and 500s the page.
**User-visible symptom:** During any Jolpica blip (their service has had repeated 502s in 2025-2026), `/schedule`, `/results/2026/drivers`, `/results/2026/teams`, every driver page, every team page returns a hard 500 instead of degrading to an empty state.
**Fix:** Wrap the `fetch`/`!res.ok` block in try/catch and `return { MRData: { series: 'f1', url: '', limit: '0', offset: '0', total: '0', RaceTable: { season: '', Races: [] } } as JolpicaEnvelope<T>`. Or — simpler — make each `getX` helper catch and return `[]`/`null`, matching the openf1 client's pattern (`packages/api-client/src/openf1/index.ts:23`).
**Why:** CORE RULE #1 says "every provider returns [] on failure, never throws." Jolpica is the only provider violating this. Consistency = predictable degradation.

### [packages/api-client/src/jolpica/mappers.ts:38] [SEVERITY: P1] Session ISO concatenation produces invalid date when `time` is undefined
**What's broken:** `isoFromDateTime(date, time)` returns `${date}T00:00:00Z` when time is missing, but `mapRace` passes `r.FirstPractice.time` (typed `string | undefined`) directly. For old seasons that omit `time`, the produced ISO is fine, but when Jolpica returns `time: ''` (empty string), the helper returns `'2026-06-22TZ'` — `new Date()` parses this as Invalid Date.
**User-visible symptom:** Past-season schedule pages display a session line like "FP1 · Invalid Date" or the countdown widget shows NaN.
**Fix:** Add `if (!time || !time.trim()) return `${date}T00:00:00Z`;` at the top of `isoFromDateTime`. Also assert `Number.isFinite(new Date(...).getTime())` before returning sessions.
**Why:** Defense-in-depth at the boundary saves one bug per consumer downstream.

### [packages/api-client/src/jolpica/mappers.ts:58] [SEVERITY: P1] Mapper coerces empty lat/lon to NaN with no guard
**What's broken:** `lat: Number(r.Circuit.Location.lat)` and `lon: Number(r.Circuit.Location.long)`. Jolpica ships `lat: ""` for at least three legacy circuits (early-1950s rounds). `Number('')` is `0`, not `NaN`, so the page renders the circuit "at lat 0, lon 0" — middle of the Atlantic.
**User-visible symptom:** Open-Meteo weather pulled for `lat=0, lon=0`, producing nonsense weather for old archive races. Map components (Phase C) will pin a marker in the Atlantic.
**Fix:**
```ts
const lat = Number(r.Circuit.Location.lat);
const lon = Number(r.Circuit.Location.long);
return {
  ...
  lat: Number.isFinite(lat) && lat !== 0 ? lat : NaN,
  lon: Number.isFinite(lon) && lon !== 0 ? lon : NaN,
};
```
Then callers (weather-sync cron, race hero) skip when `Number.isNaN(lat)`.
**Why:** Distinguishes "really at lat 0" from "missing data" — explicit beats implicit.

### [packages/api-client/src/openf1/index.ts:84] [SEVERITY: P2] `gap_to_leader` and `interval` typed as `number | string` but never normalized
**What's broken:** OpenF1 returns `interval: "+1.234"` (string with leading `+`) for some sessions and `interval: 1.234` (number) for others. The `OpenF1Interval` type accepts both but the live SSE handler at `apps/web/app/api/live/stream/route.ts:62` just passes the raw value through into `tower.rows[].interval`. The UI then renders it as `"+1.234"` next to `"1.234"` in the same tower.
**User-visible symptom:** Live timing tower shows mixed formats — some rows say "+1.234s", others say "1.234" — inconsistent and ugly during a live session.
**Fix:** In `openf1/index.ts`, add a `normalizeInterval(v: number | string | undefined): number | undefined` helper that strips `+` and parses, then run it inside `getIntervals` mapping before returning. Tower stays single-shape.
**Why:** Normalize at the boundary, not in 4 different components.

### [packages/api-client/src/wikidata/index.ts:36] [SEVERITY: P2] Wikidata sparql() returns [] on rate-limit silently; no logging
**What's broken:** Wikidata's SPARQL endpoint 429s aggressively when you do >5 requests/sec from one IP. The catch block silently returns `[]`. There is no `console.warn`, no telemetry. A burst of driver-profile renders hits Wikidata in parallel, ~30% silently fail, the affected profiles render with no portrait/dob/pob and nobody notices in dev.
**User-visible symptom:** Random driver profile pages render without portrait/birthdate/birthplace; refreshing them sometimes "fixes" it. Looks like flaky data.
**Fix:** Replace `} catch {` with `} catch (err) { console.warn('[wikidata] sparql failed:', err instanceof Error ? err.message : String(err)); return []; }`. Also log when `!res.ok` with the status. Add a single-request concurrency limit at the call site (`p-limit` with 2) so a 12-driver page doesn't fan out 12 parallel SPARQL queries.
**Why:** Silent failures across a long-tail provider with no quota signal = silent regressions.

### [packages/api-client/src/wikidata/index.ts:71] [SEVERITY: P2] Wikidata givenName/familyName declared in interface but never populated
**What's broken:** `WikidataDriverFacts` declares `givenName?`, `familyName?`, `twitter?`, `instagram?` fields but the SPARQL query never `SELECT`s them and the mapper never assigns them. Type lies to consumers — `facts.givenName` is always undefined.
**User-visible symptom:** Code referencing `facts.twitter` compiles successfully but always reads undefined, so the "Driver Socials" rail (if/when wired) silently never shows Twitter even when Wikidata has a `P2002` Twitter handle for that driver.
**Fix:** Either delete the unused fields from the interface, or extend the SPARQL with `OPTIONAL { ?driver wdt:P735 ?given . } OPTIONAL { ?driver wdt:P734 ?family . } OPTIONAL { ?driver wdt:P2002 ?twitter . } OPTIONAL { ?driver wdt:P2003 ?instagram . }` and populate them in the row mapping.
**Why:** Type-level contract must match runtime — phantom fields cause invisible UI bugs.

### [packages/api-client/src/rss/index.ts:188] [SEVERITY: P2] RSS fetch has no timeout / abort signal
**What's broken:** `fetchFeed()` uses Next.js fetch with no `AbortController` and no `signal`. The four configured feeds (Motorsport.com, Autosport, RaceFans, The Race) are awaited via `Promise.all`. Any one of them hanging (slow upstream) blocks all of them up to the Vercel function timeout (60s for cron, 30s for ISR).
**User-visible symptom:** When Motorsport.com's RSS is slow, the entire `/latest` page TTFB spikes by 20-30s. Cron job `rss-sync` can blow past `maxDuration: 60` and fail.
**Fix:** Mirror the NewsAPI pattern (`packages/api-client/src/newsapi/client.ts:59`): `const controller = new AbortController(); const t = setTimeout(() => controller.abort(), 8000); ... { signal: controller.signal, ... } ... clearTimeout(t)`. Pass signal into each `fetchFeed`.
**Why:** Promise.all is only as fast as its slowest leg — must bound the worst case.

### [packages/api-client/src/youtube/data-client.ts:259] [SEVERITY: P2] YouTube Data client treats every non-OK as fatal, no 429 backoff
**What's broken:** `ytGet` returns `null` on `!res.ok`. YouTube returns 403 (quota exhausted) and 429 (per-second burst limit) — neither is retried. The /search.list cron path bursts 5 search calls back-to-back in `youtube-sync/route.ts:126`. If two land in the same second YouTube 429s the second one, and that channel silently produces 0 results for the whole day until the next cron run.
**User-visible symptom:** Featured Videos rail has empty channels day-to-day with no signal as to why.
**Fix:** In `ytGet`, when `res.status === 429`, sleep 1500ms with full jitter and retry once. Also surface 403 with a console.warn so the operator knows quota was hit.
**Why:** YouTube's per-second burst limit is well-known and trivially retryable.

### [packages/api-client/src/guardian/client.ts:69] [SEVERITY: P1] Guardian low-level `guardianSearch` throws on non-2xx with no log
**What's broken:** `guardianSearch` rethrows `new Error('Guardian ${status} ${statusText}')`. The high-level `getGuardianF1News` catches it with `.catch(() => [])` — silently. No `console.warn`. When the Guardian key gets rate-limited (5,000/day on developer tier) the rail just goes dark.
**User-visible symptom:** Guardian column on `/latest` empties without telemetry; impossible to diagnose without rerunning curl manually.
**Fix:** Add a `console.warn('[guardian] %s %s', res.status, res.statusText)` before the `throw` in `guardianSearch`. Or fold the swallow into the low-level fn matching the openf1 pattern.
**Why:** Provider-level visibility is the difference between "I know my Guardian key burned" and "users see an empty rail forever."

### [packages/api-client/src/currents/client.ts:58] [SEVERITY: P1] Currents `currentsSearch` throws but caller swallows — no signal on outage
**What's broken:** Same pattern as Guardian. `currentsSearch` throws on `!res.ok`. The catch wrapper at line 91 swallows. No warn. Currents free tier is 600/day; if `revalidate: 300` is honored and traffic spikes, the quota is gone by 13:00 UTC and the rail silently dies.
**User-visible symptom:** Currents column on `/latest` empty without explanation; ISR cache will hold empty result for `revalidate` window after first 200 hit, making it look intermittent.
**Fix:** Wrap the throw in `console.warn` first, then throw. Or hoist into a single-source `getCurrentsF1News` with explicit failure logging.
**Why:** Per provider observability; especially important for free-tier services.

### [packages/api-client/src/newsdata/client.ts:69] [SEVERITY: P3] NewsData fetch has no timeout
**What's broken:** No `AbortController` on the newsdata client. NewsData has known slow days. If `fetchPage` hangs, the lazy import inside the aggregator (`rss/index.ts:302`) hangs the entire merged feed.
**User-visible symptom:** Race-week traffic spike on `/latest` shows long TTFB; first failure is opaque.
**Fix:** Same as RSS — add `AbortController` with `8_000ms` timeout, abort signal passed to `fetchPage`.
**Why:** Aggregator inherits worst leg's latency.

### [packages/api-client/src/openmeteo/client.ts:139] [SEVERITY: P2] `getRaceWeather` accepts only `dateEnd: string` but cron passes only `dateStart`
**What's broken:** `apps/web/app/api/cron/weather-sync/route.ts:94` calls `getRaceWeather({ lat, lon, dateStart: r.date })` without `dateEnd`. `dateEnd` is declared required in the input interface (`openmeteo/client.ts:54`). TypeScript should catch this — but the cron defines its own loose `GetRaceWeatherFn` type via `tryLoadOpenMeteo` (line 24) that strips the required field, so the broken call sneaks through.
**User-visible symptom:** Cron logs the call, but Open-Meteo's URL builder gets `end_date=undefined`, the URL is malformed, fetch returns `400`, and the cron reports "weather sync ok: 3 races" while having pulled zero data. Race-hero weather strip stays empty.
**Fix:** In `weather-sync/route.ts:94` pass `dateEnd: r.date` (single-day window) or compute `+1 day`. Tighten the local `GetRaceWeatherFn` to match the real shape so the typechecker catches future drift.
**Why:** The dynamic-import indirection in the cron defeats the type safety the client provides — restore it.

### [packages/api-client/src/unsplash/client.ts:118] [SEVERITY: P1] Unsplash `pingDownload` runs but is never awaited and errors are eaten — could violate license
**What's broken:** `pingDownload` is called via `void pingDownload(...)` in `getUnsplashAndAck`. On Vercel serverless, the function may terminate the request lifecycle before the detached promise resolves, dropping the download ping silently. Unsplash's licensing requires the ping every time an image is shown. Repeated render-without-ping puts Apex out of compliance.
**User-visible symptom:** None visible — but Unsplash can revoke Apex's API key with no warning if they audit traffic and see /search:/download ratio is >10:1. Then the Unsplash hero rail goes dark site-wide.
**Fix:** Use `waitUntil(pingDownload(...))` from `next/server`'s `after()` API (Next.js 16 supports `import { after } from 'next/server'`), which guarantees the runtime waits for the promise before shutting down. Alternatively use `unstable_after`.
**Why:** Compliance > 5ms latency — Vercel provides the exact primitive for this.

### [packages/api-client/src/unsplash/client.ts:88] [SEVERITY: P3] Unsplash search hard-codes `per_page: 10` but only ever uses `[0]`
**What's broken:** We pull 10 results, drop 9 of them on the floor. That's 10x the bandwidth + 10x the JSON parse cost per call for no gain.
**User-visible symptom:** Slower hero resolution + larger Next.js cache footprint.
**Fix:** `url.searchParams.set('per_page', '1')`.
**Why:** Zero-cost optimization that respects Unsplash's 50/hr budget by reducing wasted payload.

### [packages/api-client/src/huggingface/text2image.ts:122] [SEVERITY: P1] Default model `FLUX.1-schnell` is gated and silently returns null for free Inference tier
**What's broken:** As of 2026, `black-forest-labs/FLUX.1-schnell` requires accepting their license + a Pro subscription on the HF Inference API. A free-tier `HUGGINGFACE_TOKEN` gets 403 on the model, our client swallows that as `null` (see `client.ts:170`), and `tryHfGenerated` in `apps/web/lib/heroImage.ts:106` quietly returns null on every call.
**User-visible symptom:** When both Wikidata and Unsplash miss, the page renders a flat-color block. Tier 4 (HF generation) is effectively dead despite the token being provisioned.
**Fix:** Change `DEFAULT_MODEL` to `stabilityai/stable-diffusion-xl-base-1.0` (which is free-tier accessible), bump `num_inference_steps` to `25`, raise `guidance_scale` to `7.5`. Keep FLUX as opt-in for users who upgrade to HF Pro.
**Why:** Default must work on the tier the user is actually paying for.

### [packages/api-client/src/huggingface/text2image.ts:189] [SEVERITY: P2] `writeToTmp` default writes PNGs to /tmp on every dev render
**What's broken:** `writeToTmp` defaults to `true` outside production. Every dev render of a driver/race/team page that falls through to HF generation writes a new UUID PNG to `/tmp`. There's no cleanup. On a long dev session `/tmp` fills up.
**User-visible symptom:** macOS dev box runs out of `/tmp` after a day of work; reboots required.
**Fix:** Default `writeToTmp` to `false`. Callers that actually want a file:// URL for debugging set it explicitly. Or write a single fixed-name file per prompt-hash so it overwrites.
**Why:** Dev artifacts should not accumulate.

### [apps/web/app/api/articles/route.ts:39] [SEVERITY: P0] /api/articles is a NO-OP write — accepts draft, logs to console, persists nothing
**What's broken:** Validates title/slug/body, then `console.log` and returns `{ok:true}`. The editor UI thinks the article was saved. Nothing was saved. There is no Drizzle insert. The 503-when-no-DATABASE_URL gate is the only real behavior.
**User-visible symptom:** Editor creates an article, the form clears (success!), then refreshes the list and the article is gone forever. Drafts lost.
**Fix:** Either (a) wire `@apex/db` insertArticle now, behind the existing DATABASE_URL gate, or (b) make the 200 response include `{ ok: true, persisted: false, reason: 'phase-c-pending' }` and surface a yellow "Validated only — DB not wired" banner in the editor. Option (a) is mandatory if any draft has been entered.
**Why:** Silent data loss violates the user trust contract more than a 503.

### [apps/web/app/api/articles/route.ts:5] [SEVERITY: P2] Slug regex blocks valid Phase-C slugs (uppercase, single-char, ending with hyphen disallowed correctly)
**What's broken:** `SLUG_RE = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/` rejects single-character slugs (length 1). Fine for most cases but blocks editorial use like `/news/x` for a one-letter campaign.
**User-visible symptom:** Author types slug `x`, gets `{error:'invalid slug'}`, has no idea why.
**Fix:** `^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$` allows length-1 slugs.
**Why:** Edge case but a 1-line fix.

### [apps/web/app/api/newsletter/route.ts:27] [SEVERITY: P0] /api/newsletter is a NO-OP — emails go to console.log and disappear
**What's broken:** Validates email format then `console.log` and returns `{ok:true}`. Comment says "client also queues into localStorage" but that's a stopgap on a single browser. No Resend audience push, no Supabase insert, no SES capture. Newsletter sign-ups are lost.
**User-visible symptom:** A user enters their email in the footer/homepage subscribe widget, sees "Subscribed!" toast, gets nothing, never on a list, founder has no list to email when launching Apex+.
**Fix:** Either (a) add `RESEND_API_KEY` integration: `await resend.contacts.create({ email, audienceId: process.env.RESEND_AUDIENCE_ID })`, or (b) write to a Supabase `newsletter_subscribers` table via `@apex/db`. Until one is wired, the UI's "Subscribed" success message is a lie.
**Why:** Capturing the founder's actual launch list is a Day-0 priority feature.

### [apps/web/app/api/newsletter/route.ts:9] [SEVERITY: P3] Email regex is permissive (no length cap, accepts `a@b.c`)
**What's broken:** `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` accepts `a@b.c` and 1000-char local-parts. Adversary can spam with garbage.
**User-visible symptom:** Eventual list bloat with junk addresses, deliverability hit.
**Fix:** Cap `email.length <= 254` (RFC 5321) before regex, and require TLD ≥ 2 chars: `/^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/`.
**Why:** Cheap hygiene at the boundary.

### [apps/web/app/api/ai/generate-image/route.ts:58] [SEVERITY: P1] R2 upload is a stub that always returns null
**What's broken:** `maybeUploadToR2` is documented as Phase C but is wired into the production response shape. Result: every prod render returns a data URL of 200-700KB PNG inlined in the JSON. Browsers cache the data URL fine but the JSON-over-the-wire cost is heavy on first paint, especially on mobile.
**User-visible symptom:** /api/ai/generate-image POST returns ~1MB JSON; client paints slowly. No persistent URL to share/cache between users.
**Fix:** Wire R2 binding now. The Cloudflare R2 setup is 10 minutes: `const bucket = process.env.R2_BUCKET as unknown as R2Bucket; await bucket.put(key, pngBuffer, {...}); return ${process.env.R2_PUBLIC_BASE_URL}/${key}`. Or, if R2 isn't ready, switch to writing to Supabase Storage which the audit suggests is already provisioned.
**Why:** Production data-URL hero responses defeat the entire purpose of a CDN.

### [apps/web/app/api/live/stream/route.ts:62] [SEVERITY: P1] Live tower passes raw OpenF1 string intervals straight to client
**What's broken:** `buildTower` reads `snap?.gap` and `snap?.interval` straight from OpenF1 and ships them in the SSE frame without normalization. Tied to finding above — UI must guess at the format.
**User-visible symptom:** Live timing tower flickers as gap/interval shapes change mid-session.
**Fix:** Normalize at the boundary: `gap: Number(String(snap?.gap_to_leader ?? '').replace('+',''))` returning a finite number or null. Apply same to interval. Frontend then formats consistently.
**Why:** Single source of truth on data shape.

### [apps/web/app/api/live/stream/route.ts:103] [SEVERITY: P2] SSE loop polls `getLatestSession` every iteration with revalidate:0
**What's broken:** Re-fetching the session every 2s with `revalidate: 0` means every live tick spends one full OpenF1 round-trip on a session-metadata query that almost never changes mid-session. Doubles OpenF1 traffic for no signal.
**User-visible symptom:** During FP/Quali/Race, OpenF1 throttles us, and the swallow-on-error in openf1's client (`openf1/index.ts:25`) silently returns []. Tower goes dark for a tick or two.
**Fix:** Cache `session` in closure for the lifetime of the SSE connection. Re-poll only on state transition (every 60s heartbeat, not every 2s tick). The current `session = null; // re-poll session next loop` lives only in the idle branch — extend the optimization to the live branch.
**Why:** Burns less of the OpenF1 fair-use budget; SSE connection knows its own session.

### [apps/web/lib/heroImage.ts:106] [SEVERITY: P2] `tryHfGenerated` writes inline data URL into RSC payload (3 hero variants × ~250KB each)
**What's broken:** Every driver/team/race RSC page that hits Tier 4 ships ~750KB of base64 PNG data URLs in the React Server Component payload (urlSmall + url + urlHero are all the same data URL). Multiplies hot-page payload by 3-5x.
**User-visible symptom:** First paint on driver/team profile pages is slow when HF generation is the active tier.
**Fix:** Generate three sizes (or one size + CSS `object-fit: cover`) before encoding. Better: route through `/api/ai/generate-image`'s R2 upload (once that's wired) and ship one URL.
**Why:** Reduces hero payload from ~750KB to <1KB once R2 lands.

### [apps/web/lib/heroImage.ts:62] [SEVERITY: P3] `commonsImageUrl` only sets `width` query param; Wikidata may not honor it on Special:FilePath
**What's broken:** Wikidata images hosted at Wikimedia Commons typically need `Special:Redirect/file/Name?width=N` not `?width=N` on `Special:FilePath`. The current setter just appends `width` blindly. On some URLs this produces a 1080×original PNG, on others a full-res original ignoring the param.
**User-visible symptom:** Some driver portraits render at multi-MB native resolution; LCP score tanks.
**Fix:** Use Wikimedia's thumbnail rewrite: convert `https://upload.wikimedia.org/wikipedia/commons/abc/foo.jpg` → `https://upload.wikimedia.org/wikipedia/commons/thumb/abc/foo.jpg/${width}px-foo.jpg`. Or use Wikimedia's `imageinfo` API at fetch time. (See `apps/web/app/(profile)/drivers/[slug]/page.tsx` if it already has a working helper — promote that.)
**Why:** Consistent thumbnails = consistent LCP.

### [apps/web/lib/analytics.ts:60] [SEVERITY: P1] `captureClient` silently no-ops when `window.posthog` is absent; no provisioning verification
**What's broken:** `captureClient` only fires if `window.posthog` has been loaded. The PostHog snippet is supposed to be in `app/layout.tsx`. If it isn't (or the env var isn't propagated to client), every `captureClient` is a silent no-op and the team thinks PostHog is wired when it's not.
**User-visible symptom:** Founder's analytics dashboards show zero events from client buttons (newsletter click, video play, nav click). Server-side events trickle in but the picture is half-blind.
**Fix:** Add a one-time `console.warn('[analytics] PostHog not initialized — client events will not capture')` when `ph` is undefined the first time. Also assert at the top of `app/layout.tsx` that `NEXT_PUBLIC_POSTHOG_KEY` is set in production.
**Why:** Observability gaps masquerading as success are worse than known gaps.

### [apps/web/lib/analytics.ts:35] [SEVERITY: P2] `captureServer` reads `POSTHOG_KEY` but PostHog docs prefer project-API-key under different env name
**What's broken:** Variable name is `POSTHOG_KEY` but PostHog's official cookbook uses `POSTHOG_PROJECT_API_KEY` / `NEXT_PUBLIC_POSTHOG_KEY`. If the operator follows PostHog docs verbatim and pastes the key under either of those names, this code silently no-ops.
**User-visible symptom:** Configured-but-not-firing trap. Server events disappear.
**Fix:** `const key = process.env.POSTHOG_KEY ?? process.env.POSTHOG_PROJECT_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;`
**Why:** Robustness against documentation drift across PostHog versions.

### [apps/web/app/api/cron/jolpica-nightly/route.ts:70] [SEVERITY: P2] revalidatePath hardcodes `2026` season
**What's broken:** `revalidatePath('/results/2026/drivers')` and `'/results/2026/teams'`. When 2027 season opens, the cron will not bust the 2027 cache.
**User-visible symptom:** First few days of 2027 season standings will be stale until manual revalidation.
**Fix:** `const season = new Date().getUTCFullYear();` then template it: `revalidatePath('/results/' + season + '/drivers')`. Cron is annual-aware.
**Why:** Year hardcoding is a known footgun in time-sensitive infra.

### [apps/web/app/api/cron/youtube-sync/route.ts:232] [SEVERITY: P3] `tryLoadDb` uses `new Function('s', 'return import(s)')` to dodge typechecker
**What's broken:** Bypasses TypeScript's module resolution to dynamic-import `@apex/db` at runtime. This is the documented pattern for an optional dep, but it makes the bundler include `@apex/db` resolution at build time anyway in some configurations, and trips ESLint's `no-new-func` rule.
**User-visible symptom:** Lint warnings, occasional bundler whining; no runtime bug today.
**Fix:** Use Next.js's official `eval('import')` pattern, or better — once `@apex/db` ships, drop the optional wrapper entirely.
**Why:** Phase A scaffolding leaks; should not survive Phase C.

### [packages/api-client/src/newsapi/client.ts:75] [SEVERITY: P3] NewsAPI fetch cache tag includes `news:newsapi` but no other client tags its fetches
**What's broken:** Only NewsAPI uses `tags: ['news', 'news:newsapi']`. `revalidateTag('news-feed', 'page')` in the rss-sync cron busts a tag that nothing produces — orphan tag.
**User-visible symptom:** Manual revalidation by tag doesn't actually flush the cache the operator expects; "I revalidated, why is it still stale?"
**Fix:** Either remove the orphan `revalidateTag('news-feed', ...)` call from rss-sync, or add `tags: ['news-feed']` to every news provider's fetch options.
**Why:** Cache invariants must be visible and matched across producer/consumer.

### [packages/api-client/src/youtube/index.ts:75] [SEVERITY: P3] `bestThumb` always rewrites to `hqdefault.jpg` discarding YouTube's `maxresdefault.jpg`
**What's broken:** Channel RSS gives us `media:thumbnail` URLs that may include `maxresdefault.jpg`. The helper unconditionally replaces it with `hqdefault.jpg` (lower res).
**User-visible symptom:** Featured Videos rail looks fuzzy on Retina displays even when a high-res thumb is available.
**Fix:** Return the RSS-provided `it.imageUrl` directly when present; only fall back to constructed URL when `imageUrl` is empty.
**Why:** Preserve quality when the upstream gives it.

### [packages/api-client/src/reddit/index.ts:14] [SEVERITY: P2] Reddit RSS URL is unauthenticated, will 429/403 from Vercel IPs without User-Agent header
**What's broken:** `REDDIT_FORMULA1_RSS = 'https://www.reddit.com/r/formula1.rss'`. Reddit aggressively rate-limits and blocks requests without a valid `User-Agent`. The RSS fetcher (`rss/index.ts:191`) sends a generic Mozilla/Apex UA but Reddit specifically blocks cloud-IP ranges (Vercel = AWS) without an explicit OAuth User-Agent.
**User-visible symptom:** In production, `getRedditFormula1Pulse()` returns `[]` 100% of the time, the "r/formula1 Pulse" rail is dead, no error surfaced.
**Fix:** Either (a) move Reddit to the official Reddit API with OAuth (requires `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`), or (b) use a Reddit proxy that handles auth (e.g. https://www.reddit.com/r/formula1.json with a UA matching their docs `web:apex:0.1 (by /u/apex-bot)`). Then warn on empty results.
**Why:** Reddit is a known pain point for serverless deployments — undiagnosed dead rail right now.

### [packages/api-client/src/reddit/index.ts:16] [SEVERITY: P3] `commentsLink` is a noop stub that returns the input verbatim
**What's broken:** Function is named `commentsLink(linkOrId)` and described as "we prefer the actual comments link," but its body just returns the input. Dead intent.
**User-visible symptom:** Clicks on Reddit Pulse cards open the post page, not the comments thread, regardless of what the comment says.
**Fix:** Either delete the wrapper (return `it.link` directly) or implement `linkOrId.replace(/\?.*$/, '') + '?ref=apex#comments'`.
**Why:** Dead code = dead intent; remove or fix.

### [packages/api-client/src/openf1/index.ts:13] [SEVERITY: P2] OpenF1 `revalidate: undefined` is ignored, but live SSE explicitly passes `revalidate: 0` per call (overrides Next.js fetch cache correctly — but creates one new ISR slot per session_key, per endpoint, indefinitely)
**What's broken:** Every 2s, SSE fires `getIntervals(session_key, { revalidate: 0 })`. With `revalidate: 0`, Next.js still creates a cache entry (revalidate-after-0). Over a 2-hour race the cache builds thousands of entries for the same key (Next.js does dedupe by URL but creates a new entry per unique fetch options object).
**User-visible symptom:** Build-time and runtime memory pressure on long live sessions. Not user-visible but a Vercel infra hazard.
**Fix:** Use `cache: 'no-store'` instead of `revalidate: 0` for the SSE live path. Skip Next.js's data cache entirely.
**Why:** `no-store` is semantically correct for SSE live polling; `revalidate: 0` is an ISR refresh signal that doesn't match the use case.

### [packages/api-client/src/giphy/client.ts:198] [SEVERITY: P3] `searchGiphyReaction` seed derived from `Date.now()/(24h)` gives same GIF site-wide for 24h
**What's broken:** Default seed `Math.floor(Date.now() / (24 * 60 * 60 * 1000))` (day-of-year). Every user in the same 24h window sees the same reaction GIF. Comment claims this is "the only safe behaviour given ISR strategy" but breaks the "vary the GIF across users" promise of the function name (`bank[idx]`).
**User-visible symptom:** Every user hitting /predict on the same day sees the same celebration GIF. Repeat users notice and lose delight.
**Fix:** Either accept it as documented (rename helper to `getDailyGiphyReaction`) or pass `seed: hash(userId ?? requestId)` from the caller so different users get different GIFs while ISR cache stays warm (Giphy's CDN caches the GIF itself even when query params vary across ISR keys, so this is fine).
**Why:** Function contract doesn't match behavior. Fix name or fix logic.

### [packages/api-client/src/giphy] [SEVERITY: P1] "Powered by GIPHY" badge component is referenced in client header but no test verifies it's rendered everywhere
**What's broken:** Client header (line 24-26) declares "ATTRIBUTION: Enforced at the UI layer via the PoweredByGiphy badge component. Do not bypass." But there's no enforcement — any future component can call `searchGiphy` and render a GIF without the badge. No lint rule, no wrapper component requiring the badge.
**User-visible symptom:** Eventual ToS violation if a developer renders a Giphy GIF in a new surface without remembering the badge. Giphy can revoke the API key, killing the whole reaction-GIF subsystem.
**Fix:** Wrap raw `UiGif` consumption in a `<GiphyGif gif={...} />` server component that hardcodes the `<PoweredByGiphy />` badge. Make `UiGif` consumption outside that wrapper illegal via ESLint custom rule, or via TypeScript opaque type that only the wrapper can unwrap.
**Why:** Compliance enforcement at the API layer, not via dev memory.

### [Missing] [SEVERITY: P1] No Groq client exists despite GROQ_API_KEY being provisioned
**What's broken:** The audit prompt mentions `packages/api-client/src/groq/*.ts` but no `groq/` directory exists in the api-client package. `apps/web/.env.local` has `GROQ_API_KEY` provisioned. The HF summarize module (`huggingface/summarize.ts:11-15`) refers to Groq as the "Primary summarizer" but there is no Groq client to be primary.
**User-visible symptom:** Any feature relying on "Groq Llama 3.3 70B summarization" silently falls back to HF BART or returns nothing. AI-summary deks on /latest cards likely never use Groq.
**Fix:** Create `packages/api-client/src/groq/{client.ts, summarize.ts, index.ts}`. Use Groq's OpenAI-compatible API at `https://api.groq.com/openai/v1/chat/completions` with `model: 'llama-3.3-70b-versatile'`. Handle 429 with exponential backoff (Groq enforces token-per-minute and request-per-minute limits separately). Mirror HF's stub-mode contract: missing key returns null.
**Why:** Marketing the platform's AI capability while having no actual call site is exactly the kind of "fake feature" the founder mandate forbids.

### [Missing] [SEVERITY: P2] No central rate limiter for any third-party client
**What's broken:** Every client (Jolpica, OpenF1, Wikidata, NewsAPI, NewsData, GNews, Currents, Guardian, HF) handles its own quota concerns ad-hoc — revalidate floor here, abort timer there, no top-level rate cap. Concurrent renders can burst-call a single provider beyond the per-second limit even when daily quota is fine.
**User-visible symptom:** Intermittent rail dimming under traffic spikes; impossible to diagnose because the cause shifts.
**Fix:** Add a tiny `p-limit`-based concurrency wrapper at the client boundary. E.g., `const newsapiLimiter = pLimit(2);` and wrap each `fetch` call. Or add `bottleneck` for token-bucket semantics across the whole package.
**Why:** Defense against bursty traffic without rewriting every client.

### [packages/api-client/src/rss/index.ts:48] [SEVERITY: P3] RSS source list hardcoded; no per-source toggle/error surface
**What's broken:** Adding/removing a source requires a code change. If "The Race" RSS goes 404 (e.g. domain change), the only signal is a quiet `console.warn` inside `fetchFeed`'s implicit catch (actually there's no warn — it just returns []).
**User-visible symptom:** A dead source slowly poisons the rail's editorial mix without alarm.
**Fix:** Externalize sources to a JSON config + add `console.warn('[rss] %s returned %s', source.name, res.status)` on non-OK in `fetchFeed`.
**Why:** Source-list hygiene is non-trivial as the platform matures.

### [apps/web/app/api/live/stream/route.ts:38] [SEVERITY: P3] `maxDuration = 300` only valid on Vercel Pro; hobby tier caps at 60 → silent prod failure
**What's broken:** Comment acknowledges this. On Vercel hobby, the SSE stream is force-closed at 60s. EventSource auto-reconnects but emits a connection blip every minute through every viewer.
**User-visible symptom:** Live-page tower flickers / reconnect-noise every 60s on hobby plan deployments.
**Fix:** Detect plan via `process.env.VERCEL_PLAN` (if exposed) or hardcode safe default `60` and bump in prod env. Or document the prerequisite at the top of `package.json`.
**Why:** Avoid silent-but-noisy degradation on the wrong tier.

---

COUNT: P0=3 P1=12 P2=14 P3=11

TOP_FIVE_PRIORITY:
1. [P0] /api/newsletter silently drops emails — founder's launch list is being thrown away every time someone subscribes (`apps/web/app/api/newsletter/route.ts:27`)
2. [P0] /api/articles silently drops drafts — editor data loss (`apps/web/app/api/articles/route.ts:39`)
3. [P0] Jolpica client throws on outages → 500s every standings/results page during upstream blips (`packages/api-client/src/jolpica/client.ts:35`)
4. [P1] No Groq client exists despite GROQ_API_KEY provisioned and HF summarize module advertising Groq as "primary" → marketing a fake AI feature (`packages/api-client/src/groq/*.ts`)
5. [P1] HF default model FLUX.1-schnell is gated on free tier → Tier 4 hero generation is silently dead site-wide (`packages/api-client/src/huggingface/text2image.ts:122`)

FIX_BUNDLE_SIZE: ~720 LOC total
- Jolpica try/catch hardening: ~40 LOC
- Newsletter Resend/Supabase wire: ~60 LOC
- Articles Drizzle wire: ~80 LOC
- Groq client (client.ts + summarize.ts + types + index): ~240 LOC
- HF default model swap + writeToTmp default: ~10 LOC
- Unsplash `after()` ping + `per_page:1`: ~15 LOC
- RSS / NewsData AbortController timeouts: ~25 LOC
- Weather-sync dateEnd fix + season-aware revalidate: ~15 LOC
- Wikidata SPARQL extended fields + concurrency limit: ~50 LOC
- OpenF1 normalize intervals/positions + SSE no-store: ~40 LOC
- YouTube 429 backoff + bestThumb fix: ~30 LOC
- Reddit OAuth/UA fix + commentsLink: ~40 LOC
- Analytics warn-on-noop + env-fallback: ~15 LOC
- Guardian/Currents warn-on-throw: ~20 LOC
- Slug regex + email length cap: ~10 LOC
- Misc small fixes: ~30 LOC
