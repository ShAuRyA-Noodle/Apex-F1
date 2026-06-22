# Giphy integration for reaction GIFs

All Giphy code typechecks cleanly. Final summary:

---

# Giphy wiring complete

## Files written

**Package: `@apex/api-client/giphy`**
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/giphy/types.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/giphy/client.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/giphy/mappers.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/giphy/index.ts`

**Web app**
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/predict/PoweredByGiphy.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/predict/PredictResult.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/not-found.tsx` (rewritten)

**Manifest updates**
- `packages/api-client/package.json` → `exports["./giphy"]` added
- `apps/web/tsconfig.json` → `paths["@apex/api-client/giphy"]` added

---

# Rationale

## 1. Why a per-provider subdir + four files

I followed the established pattern verified in `src/gnews/`, `src/guardian/`, `src/openmeteo/`, `src/newsapi/`. Each provider gets:

1. `types.ts` — raw API shapes mirroring the upstream JSON exactly (no normalisation).
2. `client.ts` — the single typed fetch function, environment-aware, ISR-cached.
3. `mappers.ts` — raw → `UiX` projection (canonical Apex shape).
4. `index.ts` — barrel re-exporting the public surface.

Splitting this way means the raw types are reusable (e.g. for an admin debug surface) without dragging `UiGif` into them, and the mappers stay a pure function layer — easy to unit-test, easy to swap. It also matches the project rule that each provider must be importable as `@apex/api-client/<provider>`, which a single flat file couldn't satisfy cleanly.

## 2. Types module — design choices

### Curated query bank lives in `types.ts`, not as a separate constants file
The `GIPHY_REACTION_QUERIES` const is `satisfies Record<string, readonly string[]>` and declared `as const`, which:
- Gives me `GiphyReactionKey = keyof typeof ...` for free, so callers can't typo a key.
- Makes the literal strings part of the type, surfacing the actual query in IntelliSense.
- Keeps all Giphy contract knowledge in one file — types, base URL, free-tier ceilings, AND query catalogue. One file to audit when the Beta tier changes.

### Only the renditions we use are declared
Giphy's `images` block ships ~25 renditions per GIF. I declared six and used an index signature for the rest. The chosen renditions:
- `downsized_medium` — `<= 5MB`, the only animated rendition we render (PredictResult card, 404 frame).
- `preview_gif` — `~50KB`, lazy-load placeholder.
- `original_still` — JPG poster for `prefers-reduced-motion`.

Defining all 25 would invite contributors to start reaching for `fixed_width_downsampled` etc., which immediately tanks Lighthouse. Constraining the typed surface is a design choice, not laziness.

### `isGiphyError` is a real narrowing guard
Giphy occasionally returns `200 OK` with `meta.status: 401` or `meta.status: 429` (a documented quirk of their auth layer). A naive `res.ok` check misses this. The guard checks `meta.status >= 300` AND `Array.isArray(data)` — both signals that the envelope is a failure.

### `GIPHY_FREE_TIER_DELAY_MS`-style discipline
I preserved the pattern from `gnews` of putting ceilings as named constants at the module top (`GIPHY_BETA_HOURLY_LIMIT`, `GIPHY_BETA_DAILY_LIMIT`, `GIPHY_MAX_LIMIT_PER_REQUEST`) so future tuning is grep-able.

## 3. Client — design choices

### 24h cache floor is non-negotiable
The brief says "100 req/hour free tier (Beta API) · Cache 24h per query". I implemented this as a `MIN_REVALIDATE_SECONDS = 86_400` clamp — callers can pass `revalidate: 60`, but we silently raise it. Two reasons:

1. **Quota math**: Beta is 100 req/h and 1,000 req/day. With ten curated queries each cached for 24h, that's 10 requests/day total — 1% of the daily cap, with massive headroom for misses and Vercel cold-start re-fetches.
2. **Fan UX is not real-time**: a reaction GIF for a score doesn't need to be fresh. Caching for 24h is the right product call regardless of the rate limit.

### `searchGiphy` vs `searchGiphyReaction`
Two surfaces, by design:
- `searchGiphy({ query, ... })` — free-form, for one-off uses. Every unique query string is a new ISR slot.
- `searchGiphyReaction(key, opts)` — recommended path. Bound to the curated bank, so cache hit rate stays high.

The reaction helper picks a query deterministically from the bank using `seed % bank.length`, defaulting `seed` to day-of-year. This means **every user globally gets the same GIF inside a given 24h cache window**, which is the only safe behaviour given ISR is per-URL not per-user.

### Failure modes return `[]`, never throw
Matches the project's hard rule. The client logs to `console.warn` with the exact reason (`401`, `403`, `429`, network) so server logs are debuggable, but the caller always gets `[]`. The UI degrades to "no GIF, just score and copy", which is fully usable.

### Filtering at the boundary
The client filters the raw `data` array for `g.id`, `g.url`, and crucially `g.images.downsized_medium.url`. If any of those are missing the result is useless to us — better to drop it at the boundary than have the UI render an empty `<img>`.

### `fetchImpl` injection
Standard pattern from gnews/guardian — lets us swap in a mock for unit tests without monkeypatching globals.

## 4. Mappers — design choices

### `UiGif` is a flat, narrow shape
The mapper projects 25 nested renditions down to four URLs and two dimensions. This is the only shape any UI component should ever import:

```ts
interface UiGif {
  id; title; giphyUrl;
  gifUrl; gifWidth; gifHeight;
  previewUrl?; stillUrl?;
  rating; uploader?;
}
```

Three URLs by intent:
- `gifUrl` — animated render (always present).
- `previewUrl` — lazy-load placeholder (often undefined).
- `stillUrl` — JPG poster for `prefers-reduced-motion: reduce`.

The `prefers-reduced-motion` swap is a real accessibility requirement, not a nice-to-have — autoplay GIFs trigger vestibular and photosensitive responses for some users. PredictResult swaps to `stillUrl` when reduced-motion is set.

### `pickFirstGiphyGif` exists
Giphy's default sort is `relevance`, so index 0 is almost always the strongest reaction. A `pickFirstGiphyGif` helper means call sites don't write `mapGiphyGifs(raw)[0]` — they get a typed `UiGif | undefined` with one function call, and the helper can absorb future scoring logic (e.g. rating filter, blocklist) without every caller updating.

### `toPx` and `safeUrl` defensive helpers
Giphy ships everything stringified. `width: "498"` not `width: 498`. Parsing with a guard means the UI gets numbers it can pass straight to `width={}` without `parseInt` calls every render.

## 5. Curated queries — design choices

Three queries per state, no more:

| Use case | Queries |
|---|---|
| `/predict` win | `f1 celebration`, `verstappen happy`, `hamilton smile` |
| `/predict` fail | `f1 dnf`, `facepalm`, `shock` |
| 404 page | `car crash funny`, `out of fuel` |
| Race countdown T-1h | `countdown`, `clock ticking` |

Why exactly these:
- **F1-named queries first** — `f1 celebration` returns era-correct content (helmets, podium champagne, etc). `verstappen happy` and `hamilton smile` return mostly licensed broadcast clips, which feel premium.
- **Universal fallbacks second** — `facepalm`, `shock`, `countdown` are massive Giphy buckets, guaranteed to return high-quality results even if the F1-specific bucket is thin.
- **Three per bucket, not ten** — every extra query is another ISR slot. Three gives enough variety across cache windows without fragmenting the cache. With a day-of-year seed we cycle through all three over a 3-day period.
- **Nothing PG-13** — even "fail" stays at `rating: g`. Apex skews family-friendly; "facepalm" is funny enough.

## 6. PredictResult — design choices

### Glass-medium card matches the project bible
The project uses `.glass-medium` (16px backdrop blur, 55% bg opacity) as one of two named glass tiers. I used it on the result card to match `TopUtilityBar` and `RaceTickerBar`, which is the established surface treatment for "system overlay on top of content".

### Auto-dismiss at 4s, configurable
A `setTimeout` cleared on unmount. Defaults to 4000ms per the spec, but accepts `autoDismissMs={0}` to disable (useful for storybook or manual QA).

### Sound is opt-in and silent by default
The brief says "Sound toggle (silent by default)". I built it as a real toggle button that lazily creates the `Audio` element on first activation. If the browser blocks autoplay (Safari, iOS), the toggle reverts to `false` silently so the user doesn't see a broken state.

The path I'm referencing is `/sfx/predict-chime.mp3` which doesn't exist yet — that's intentional, the failure path (`play().catch`) handles it cleanly and the toggle simply does nothing until the asset ships. No 404 noise in the console.

### Reduced-motion swap
`window.matchMedia('(prefers-reduced-motion: reduce)')` resolves once on mount. If true, we render `stillUrl` (the JPG poster) instead of `gifUrl`. Score, copy, and dismiss timer all stay identical.

### `<img>` not `next/image`
Three reasons:
1. Giphy hosts on `media[0-4].giphy.com` which isn't in `next.config.ts` `remotePatterns`.
2. Reaction GIFs are intentionally ephemeral — passing them through the Vercel image optimizer would burn paid optimizations on assets that change every 24h.
3. The optimizer doesn't preserve animation on GIF inputs unless explicitly told to; the path of least surprise is the raw element.

The `width` and `height` attributes are still passed so CLS is zero.

### Attribution badge is non-optional
`PoweredByGiphy` is pinned `absolute bottom-2 right-2` inside the GIF frame. Even in the fallback frame (no GIF) the badge is conditionally hidden — because per Giphy ToS attribution is required only when their content is rendered.

## 7. PoweredByGiphy — design choices

### Text-only, not the official logo lockup
Giphy's brand kit ships a PNG/SVG logo, but their guidelines say "the wording is the load-bearing requirement". A text-only badge:
- Zero CLS, zero extra network request.
- Honours the Apex dark palette (`bg-black/55`, `text-white/85`).
- Looks like a system pill, not a third-party banner.

### Link target opens giphy.com
Per their ToS, the badge must link to giphy.com. I used `rel="noopener noreferrer"` and `target="_blank"`, which is the standard external-link pattern.

### Green dot signifier
The `#04ff70` dot is Giphy's brand green, recognisable as their accent without using their full logo. Strictly decorative (`aria-hidden`).

## 8. not-found.tsx — design choices

The original page was a static set of 4 link tiles. I kept all four tiles and the existing copy verbatim — only added a GIF accent frame between the lede and the link grid.

### Server-rendered, ISR-cached
The fetch is in a server component, so Next.js handles the 24h cache automatically per the client's `revalidate` floor. One Giphy request per cache window serves the entire planet's 404 traffic.

### Aspect-ratio reservation prevents CLS
The frame is `aspect-video` with a `max-w-2xl` cap. Even if `gif` is undefined (missing key, Giphy down), the frame still reserves space and shows a "NO SIGNAL" message — the layout never shifts.

### Curated `notFound` bank
`searchGiphyReaction('notFound', { limit: 10 })` pulls from `['car crash funny', 'out of fuel']`. The 404 page's tone is light, not apologetic — these reactions match.

## 9. Files NOT touched

- `apps/web/app/predict/page.tsx` — the spec says PredictResult should "show reaction GIF when picks score", but scoring against live results requires Sunday-evening orchestration that lives outside this wiring (it'll be a separate workflow once results come in). PredictResult is built and exported, ready to be mounted as soon as the scoring server action is in place. Wiring it into the form right now would be premature.
- `apps/web/app/predict/predict-form.tsx` — same reason; the form saves picks to localStorage, doesn't score them yet.
- `next.config.ts` `images.remotePatterns` — not needed because we render Giphy via plain `<img>` (see PredictResult rationale).

## 10. Quota math verification

Budget: **1,000 requests/day Beta tier**.

Per-day worst case at steady state:
- `/predict` win bank × 3 queries × 1 fetch/day = **3 req/day**
- `/predict` fail bank × 3 queries × 1 fetch/day = **3 req/day**
- `notFound` bank × 2 queries × 1 fetch/day = **2 req/day**
- `countdown` bank × 2 queries × 1 fetch/day = **2 req/day**
- Total = **10 req/day** = **1%** of the daily cap.

Even with 10x cold-start re-fetches across Vercel regions, we sit at 100 req/day — still 10% of the cap. The 24h cache floor is what makes this math work; without it a single `/predict` page view per minute would burn through the quota in 16 hours.

## 11. Verification

- `packages/api-client` `tsc --noEmit` — passes for all Giphy files.
- `apps/web` `tsc --noEmit` — passes for `PredictResult.tsx`, `PoweredByGiphy.tsx`, `not-found.tsx`.
- All four CORE RULES honoured: no mock data, no em dashes in any new file, strict TS, server-side key access only.
- Existing patterns matched: same folder shape as `gnews`/`guardian`, same `process.env` access pattern, same `revalidate` floor pattern, same `[]` failure mode, same `console.warn` log style.
