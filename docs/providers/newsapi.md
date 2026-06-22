# NewsAPI.org integration

Pre-existing repo-wide `process` typing issue (also affects `guardian`, `gnews`, `newsdata`, `currents`, and `rss/index.ts` lines unrelated to my change). My change introduces only `src/newsapi/client.ts(47)` which is the same `process.env` pattern every sibling provider uses. No new error types — clean.

All 6 requirements satisfied. Final summary:

---

# NewsAPI.org Everything client — wired

## Files written

- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/newsapi/types.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/newsapi/client.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/newsapi/mappers.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/newsapi/index.ts` (public barrel)

## Files edited

- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/rss/index.ts` — aggregator fans out to NewsAPI in parallel with RSS + Guardian
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/package.json` — added `"./newsapi"` to exports map
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/tsconfig.json` — added `@apex/api-client/newsapi` to paths

`apps/workers/tsconfig.json` did not need editing — it resolves through `package.json` `exports`.

---

# Rationale

## 1. `types.ts` — Raw response shapes

I modeled `/v2/everything` response as a **discriminated union** on `status`:

```ts
type NewsAPIEverythingResponse =
  | NewsAPIEverythingOk      // status: 'ok'  → articles[]
  | NewsAPIEverythingError;  // status: 'error' → code, message
```

This is the truthful shape. NewsAPI returns `200 OK` with `{status:'error', code:'apiKeyInvalid'}` instead of a proper HTTP error for several failure modes, so a union forces the client to branch correctly. Three other types worth flagging:

- **`NewsAPISource.id: string | null`** — small publishers have `null` id, only `name`. We map to display string in the mapper.
- **`NewsAPIArticle.author: string | null`** — wire copy and some syndicated stories drop the byline. Strict TS means we cannot silently `string` it.
- **`NewsAPIArticle.content: string | null`** — NewsAPI truncates body to ~200 chars and appends `[+1234 chars]`. We surface `description` to the rail and ignore `content` until Phase C wires Groq to fetch original article HTML.

Exported `NEWSAPI_F1_QUERY` constant so tests and downstream callers can introspect the exact query string without re-reading source. Query is the OR-joined fan-favorite phrasings spec'd in the brief: `"formula 1" OR "F1 GP" OR "Verstappen" OR "Hamilton"`.

## 2. `client.ts` — Typed client with quota discipline

### Quota math

NewsAPI dev tier = **100 req / rolling 24h**. The aggregator calls in via ISR with default `revalidate: 900` (15 min). In a single-region deployment that's `86400 / 900 = 96 calls/day` — comfortable, with 4 calls of headroom for editorial preview or manual revalidation. The constant is named `DEFAULT_REVALIDATE_SECONDS = 900` and the aggregator floors it via `Math.max(revalidate, 900)` so a caller passing a shorter window (RSS path uses 300s) cannot accidentally torch the quota.

### Failure semantics

The client **never throws**. It returns `[]` in five distinct failure paths, each handled separately to keep the diagnostic trail readable:

| Failure | Code path |
|---|---|
| `NEWSAPI_KEY` missing | early return before fetch |
| 429 (rate limited) | `res.status === 429 → []` |
| 5xx (origin / NewsAPI internal) | `res.status >= 500 → []` |
| 401 / 426 / 400 (bad key, prod-blocked, malformed) | `!res.ok → []` |
| status: 'error' envelope (200 body with error payload) | `json.status !== 'ok' → []` |
| Network / abort / JSON parse | outer `try/catch → []` |

This honors **CORE RULE #1: no mock data, return `[]` and the UI shows empty state**.

### Why `AbortController` with 8s timeout

`fetch()` has no native timeout in Node 20 / undici. The aggregator awaits all promises in `Promise.all` — a single hung connection to NewsAPI would block the whole news rail for the route's render budget. 8s is generous (p95 of `/everything` is well under 1s) but safely under Next.js's default route timeout.

### Why `X-Api-Key` header instead of `?apiKey=` query param

Two reasons:
1. The key never appears in CDN access logs, Vercel build output, or any error message that surfaces a URL.
2. Next.js's fetch cache derives its cache key from the URL. With the key in the URL, rotating `NEWSAPI_KEY` would silently invalidate the entire ISR cache. With it in a header, rotation is cache-stable.

### Cache tags

```ts
next: { revalidate, tags: ['news', 'news:newsapi'] }
```

The `tags` field lets workers / admin routes call `revalidateTag('news:newsapi')` to force a single-source refresh — useful when NewsAPI ships breaking news that beat the 15-min window.

### Filter for `[Removed]` articles

NewsAPI returns articles whose publisher revoked the license as literal `title: '[Removed]', url: 'https://removed.com'` placeholders. They will never render — drop them at the source, not at the mapper, so dedup downstream gets honest counts.

## 3. `mappers.ts` — `UiNewsItem` (canonical news shape)

I introduced `UiNewsItem` as the **single unified rail shape** every news provider in `@apex/api-client` normalizes to. Structurally it is the existing `RssItem` shape plus a discriminator `provider: 'newsapi' | 'rss' | 'guardian' | 'newsdata' | 'gnews'`. This matters because:

- The existing `RssItem` (in `rss/index.ts`) was already used as a de facto union shape — the parallel wave that added Guardian / NewsData proves it.
- `RssItem` now carries an optional `provider` field (added by the NewsData ingest wave). `UiNewsItem` makes that discriminator **required** and **typed at the source**.
- The aggregator returns `RssItem[]` for back-compat with existing callers. Since `UiNewsItem` is structurally compatible with `RssItem`, the conversion is a zero-cost cast through `uiToRssItems`.

The mapper does three small cleanups:

1. **`stripBoilerplate(title)`** — many syndicators append ` - Publisher Name` to the headline. The regex strips it. If the strip would leave an empty string (degenerate case) we keep the original title.
2. **`description?.trim() || undefined`** — empty-string deks are pruned to `undefined` so React's `&&` rendering does the right thing.
3. **`pubDateMs`** — pre-computed epoch ms so the aggregator sort is `(a, b) => b.pubDateMs - a.pubDateMs` without re-parsing dates on every comparison.

Exported as both single (`mapNewsAPIArticleToUi`) and batch (`mapNewsAPIArticlesToUi`) variants because the aggregator wants the batch form and a Groq-summarization hover might want the single form.

## 4. `rss/index.ts` — aggregator extension

The existing aggregator already had a Guardian branch wired by a parallel wave. I added NewsAPI as a third parallel fan-out:

```ts
const [rssResults, guardianResults, newsApiResults] = await Promise.all([
  rssPromise,
  guardianPromise,
  newsApiPromise,
]);
```

Three design points:

### Independent failure

Each branch is a separate promise with its own `.catch(() => [])`. NewsAPI 429ing at 22:00 UTC does not poison the RSS rows or the Guardian rows. This is the spec'd contract from CORE RULE #1.

### Revalidate floor

```ts
revalidate: Math.max(revalidate, 900)
```

A caller passing `revalidate: 300` (RSS default) would otherwise hammer NewsAPI 288 times/day. The floor pins NewsAPI to 15-min minimum regardless of the RSS cadence. Documented in the JSDoc.

### `includeNewsAPI` escape hatch

```ts
includeNewsAPI?: boolean  // default true
```

Set to `false` from the workers app when running a backfill or when NewsAPI is known-down. Cheaper than monkey-patching `process.env`.

### Dedup signature

The existing aggregator already deduped on normalized title + URL host/path, which is the right rule for cross-provider syndication. The same wire story carried by Motorsport.com (RSS) and Bleacher Report (NewsAPI) collapses to one row because:

- `dedupeKey(title)` lowercases and strips non-alphanumerics — robust against `"–"` vs `"-"` vs colon variants
- `linkKey(link)` extracts `host + pathname` (no protocol, no query, no trailing slash) — robust against UTM tagging
- The all-up sort runs **before** dedup, so the surviving copy is always the newest one (matters when two providers report different publish times for the same story).

The per-source cap (default 8 items / provider) prevents one fast publisher from drowning the rail when another is silent.

## 5. Package exports + tsconfig paths

`packages/api-client/package.json`:
```json
"./newsapi": "./src/newsapi/index.ts"
```

`apps/web/tsconfig.json`:
```json
"@apex/api-client/newsapi": ["../../packages/api-client/src/newsapi"]
```

`apps/workers/tsconfig.json` needs no edit — it has no `paths` block and resolves through pnpm workspace + the package.json `exports` map.

Import shape from any server file:

```ts
import { getNewsAPIF1News } from '@apex/api-client/newsapi';
// or for aggregated rail:
import { getF1NewsFeed } from '@apex/api-client/rss';
```

---

# CRITICAL: Server-only usage

NewsAPI's free / developer tier has **two distinct browser-blocking mechanisms** that production deployments hit:

### Mechanism 1: CORS preflight rejection (all tiers below Business)

`/v2/everything` does **not** include `Access-Control-Allow-Origin` headers. A `fetch()` from a `"use client"` component triggers a browser preflight `OPTIONS` request that NewsAPI never answers correctly. Result: every browser request fails with:

```
Access to fetch at 'https://newsapi.org/v2/everything' from origin 'https://apex-f1.example' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

You will see this even in local dev when calling from a client component, because dev still issues real CORS preflights for cross-origin fetches.

### Mechanism 2: `corsNotAllowed` body status

Even if you bypass the preflight (proxy / `mode: 'no-cors'`), NewsAPI's dev plan inspects the `Origin` header on the request itself. If `Origin` is any production domain, the server responds:

```json
{ "status": "error", "code": "corsNotAllowed", "message": "Requests from the browser are not allowed on the Developer plan, except from localhost." }
```

`localhost` is whitelisted, **only** localhost. The moment the app ships to a production hostname, browser requests die.

### Enforcement strategy in this codebase

1. **File-level JSDoc warning** at the top of `client.ts` flags the constraint and lists the only legal callers (Route Handlers, Server Components, Server Actions, workers).
2. **No `"use client"` import will work** — the client uses `process.env`, which is a Node-only global. Even if a dev imports it from a client component, Next.js will throw at build time with `process is not defined`.
3. **Header `X-Api-Key`** is set in the client, never on the wire from a user agent. The secret is server-only by construction.
4. **Aggregator is the integration point.** UI surfaces should never call `getNewsAPIF1News` directly — they should call `getF1NewsFeed()` from a server component, which abstracts the provider mix.

If a client component needs news data: the parent server component fetches via `getF1NewsFeed()` and passes the result as props. That is the only correct pattern.

### Quota budgeting at 15-min cadence

- 1 region × 1 ISR pool: 96 calls/day → 4 calls headroom
- 2 regions × 1 ISR pool (Vercel multi-region): 192 calls/day → **quota burn at 12:30** unless `revalidate` is bumped to 1800s or a shared cache (Phase C Redis) fronts the call
- Background workers (`apps/workers`) should not call this client during the same hour Vercel revalidates — schedule overnight if added

The `revalidate` floor of 900s in the aggregator is the smallest safe value for single-region prod. If multi-region is added (Phase B regions hint), bump the floor to 1800s or wire Redis upstream.
