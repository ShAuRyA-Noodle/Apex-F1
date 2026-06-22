# Unsplash integration for hero images and placeholders

Only the pre-existing giphy error — none of our new code introduces type errors. The Unsplash module is fully clean.

---

## Files written / updated

**New (Unsplash provider package):**
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/unsplash/types.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/unsplash/mappers.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/unsplash/client.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/unsplash/curated.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/unsplash/index.ts`

**New (app-level facade):**
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/lib/heroImage.ts`

**Updated:**
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/package.json` (added `./unsplash` export)
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/tsconfig.json` (added `@apex/api-client/unsplash` path)
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/profile/ParallaxHero.tsx` (added `alt`, `attribution` props + bottom-right glass credit block)
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/drivers/[slug]/page.tsx` (uses `getDriverHeroImage`, passes attribution to `ParallaxHero`)
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/schedule/[season]/[race]/page.tsx` (circuit-specific Unsplash backdrop behind sessions grid + inline attribution row)

---

## Rationale

### Architecture: thin SDK, thick app facade

Two boundaries were drawn:

1. `packages/api-client/src/unsplash/*` is a pure SDK: raw types, typed client, mappers, curated queries. It knows nothing about Wikidata, nothing about "what we render in the driver hero." It does one thing — talk to Unsplash, return `UnsplashImage | null`.
2. `apps/web/lib/heroImage.ts` is the **product-level facade**. It owns the Wikidata-first, Unsplash-second, fallback-third priority chain because that priority is an Apex product decision, not an Unsplash SDK decision. If we later add Hugging Face text-to-image as a fourth tier, only `heroImage.ts` changes — the SDK stays stable.

This is exactly the pattern Jolpica and OpenMeteo already follow: SDK in `packages/api-client/*`, composition in `apps/web/lib/*`. We did not reinvent it.

### Why `searchUnsplashImage` returns top-1, not an array

Every hero slot needs one image. Returning an array would tempt callers to ship multi-source rails and burn the 50 req/hr Developer-tier budget in minutes. The function name carries the singular: `searchUnsplashImage`, not `searchUnsplashImages`. If we ever need a gallery (e.g., the `/archive` media wall) we can add a sibling without changing existing call sites.

### Caching: 7d ISR per query is the load-bearing decision

Free tier = 50 req/hour. Production tier = 5000 req/hour. With `revalidate: 604_800`, each unique query string costs **one request per week**. We have:

- ~25 circuits + ~20 driver-nationality combos + ~10 team variants + 1 fallback = ~56 distinct queries.

That means steady-state load is ~8 requests per day. We'd run inside the 50/hr Developer tier with two orders of magnitude headroom — meaning we **don't actually need the Production tier upgrade** for hero imagery alone. That's the entire reason curated queries are pre-baked rather than dynamic per-race-name: dynamic queries would multiply the cache key space and dilute hit rate.

The `/photos/:id/download` ping uses `revalidate: 0` (not cached, runs per render) because Unsplash explicitly says the ping must trigger per consumed-image-event. That ping is a separate rate-limit class on Unsplash's side and is cheap on theirs — they account for it.

### License compliance is non-negotiable

Two things every Unsplash integration must do or you lose API access:

1. **Trigger the download endpoint** when an image is used in production. This is what `getUnsplashAndAck` does — it fires the GET to `links.download_location` with the Client-ID header. We do it **detached** (`void pingDownload(...)`, no `await`) so a slow Unsplash stats endpoint can never block page render. We swallow errors silently for the same reason.
2. **Display attribution**: photographer name + link to their profile + link to Unsplash itself, with UTM tags. The mapper builds `attributionUrl = ${user.links.html}?utm_source=apex&utm_medium=referral` once, so the renderer never has to think about UTM. Both `ParallaxHero` (driver page) and the race-detail SESSIONS section render the credit block with the mandatory format: "Photo by [Name] on Unsplash" with both `[Name]` and `Unsplash` as separate links to their respective UTM-tagged URLs.

The credit block is styled as a glass-subtle pill bottom-right of the hero area: `bg-black/40 backdrop-blur-sm` + tiny uppercase tracking-[0.14em] text. It honors the Apex telemetry aesthetic without screaming "STOCK PHOTO." The hover state goes telemetry-red — consistent with link affordances elsewhere on the site.

### `getUnsplashAndAck` vs `searchUnsplashImage` — two layers on purpose

- `searchUnsplashImage` is the **pure** version. Use it from worker contexts where you may want to ingest into Postgres but not register a render-event with Unsplash.
- `getUnsplashAndAck` wraps it and adds the license-required ping. Use this from anywhere the image will actually be sent to a browser. The `heroImage.ts` facade uses this variant exclusively — every hero is a real render event.

This separation matters because Phase D includes a worker that pre-warms heroes via cron. That worker should call `searchUnsplashImage` (no ping — it's not a real view) and let the page-render fire the ping at view-time. Otherwise we'd double-count downloads and skew the photographer's stats.

### Curated queries: phrasing rules

Default Unsplash search for "Monaco F1" returns tourist phone snaps. The curated queries were tuned to lead with a strong visual noun + one mood modifier:

- monaco → `Monaco Monte Carlo skyline cinematic dusk` (skyline, not "F1")
- spa → `Belgian Ardennes forest mist dramatic` (the venue's defining feature is the forest, not the track)
- vegas → `Las Vegas strip night neon cinematic`
- suzuka → `Japan Mie prefecture cherry blossom dawn cinematic`

We deliberately **omit "F1" / "Formula 1"** from queries because Unsplash's F1 library is shallow and biased toward generic grandstand crowds. We pull venue / metaphor + style word instead. This is the same trick agency creative directors use when sourcing stock.

Race-query keys = Jolpica `circuitId` so they slot directly into the existing slug system (`race.slug`) without any translation table. Team-query keys = Jolpica `constructorId`. Driver-query keys = lowercase nationality.

### Graceful degradation chain

Every layer returns `null` cleanly:

1. No `UNSPLASH_ACCESS_KEY` → `searchUnsplashImage` returns `null` immediately (no wasted fetch).
2. Network error → `null`.
3. Empty results → `null`.
4. `heroImage.ts` falls through Wikidata → curated → abstract fallback → `null`.

Callers (`ParallaxHero`, race page) treat `null` as "render the flat color block, no hero." This matches the project's CORE RULE 1: "If a key is missing, return [] or null and the calling UI gracefully shows empty/loading state." The race detail page tested this — when `hero` is null, the SESSIONS section just becomes a normal bordered grid on the page surface, identical to the current behavior. **Nothing breaks without the key.**

### Why the race page doesn't use `ParallaxHero`

The race page already had its own `<header>` block with the race name and country flag. Wrapping the SESSIONS section in `ParallaxHero` would force the cinematic backdrop to be the page hero — but the sessions grid is a mid-page section, not a hero. Instead we built a self-contained backdrop pattern: absolutely positioned image at `-z-10`, color floor at `-z-20`, and a dark gradient overlay so the white text on the grid cards stays readable (WCAG AA against the darkest gradient stop). The sessions grid gets `bg-background/90 backdrop-blur-sm` per card so the cards still feel solid against the image but inherit a faint photographic context.

If we later promote the race page to use `ParallaxHero` for the header itself, the helper is ready — just pass `getRaceHeroImage(...)` result into it the same way the driver page does.

### Tier upgrade strategy

If/when Apex's traffic justifies it, the Production tier upgrade is automatic for compliant apps (correct attribution + ping). Both are wired from day one, so the upgrade is a paperwork submission, not a code change. The 7-day cache means even if we 10x traffic we stay well inside Developer tier — we'd only upgrade for *new* features (e.g., user-driven photo search on `/archive`), not for hero imagery.

### TypeScript strictness

All code is written for `noUncheckedIndexedAccess`. `json.results[0]` is typed as `UnsplashPhoto | undefined` and guarded before mapping. `process.env.UNSPLASH_ACCESS_KEY` is read into a local `string | undefined`, then narrowed via length check before use. No `as` casts except the standard `await res.json() as UnsplashSearchResponse` envelope assertion that all sibling providers use. Typecheck confirms zero new errors introduced by this change set.
