# The Guardian Open Platform integration

The `process` errors are workspace-wide and pre-existed in newsapi/newsdata/gnews. The Guardian client matches the established pattern. Let me write the final report.

---

# Guardian Open Platform — F1 Content API Integration

Senior backend wiring for `@apex/api-client/guardian`. Drops into the existing `getF1NewsFeed()` aggregator beside the four RSS providers and the previously wired NewsAPI/NewsData/GNews clients, with zero changes required on the consuming Next.js routes.

---

## 1. Files written

| Path | Purpose |
|---|---|
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/guardian/types.ts` | Raw API envelope + content item types |
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/guardian/client.ts` | Typed `getGuardianF1News()` client |
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/guardian/mappers.ts` | Raw to `UiNewsItem` mapper |
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/guardian/index.ts` | Barrel re-export |
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/rss/index.ts` | Extended aggregator (dedupe, per-source cap, Guardian merge) |
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/package.json` | Added `./guardian` to `exports` |
| `/Users/shauryapunj/Desktop/F1_Claude/apps/web/tsconfig.json` | Added `@apex/api-client/guardian` path |

---

## 2. Endpoint contract

Base: `https://content.guardianapis.com`
Auth: `?api-key=<GUARDIAN_API_KEY>` (query string, never header — Guardian only accepts query auth on the open platform tier)
Tier: 5,000 req/day developer

The single endpoint we hit is `/search`. We issue **two parallel queries** and dedupe their union:

```
GET /search
  ?tag=sport/formula-one
  &section=sport
  &page-size=20
  &order-by=newest
  &show-fields=trailText,thumbnail,byline
  &api-key=<key>
```

```
GET /search
  ?q=formula 1
  &section=sport
  &page-size=20
  &order-by=newest
  &show-fields=trailText,thumbnail,byline
  &api-key=<key>
```

Why both? Guardian's `tag=sport/formula-one` is editorially curated and is the highest-precision F1 funnel — but it occasionally misses opinion columns and roundups that live under `section=sport` without the tag. The `q="formula 1"` query catches those with light recall noise. Deduping by `id` afterwards gives precision + recall without paying for a second day's worth of requests (two calls per 5 minutes is ~576/day, well under the 5,000 cap).

---

## 3. `types.ts` — exact wire shape

The envelope is always `{ response: {...} }`. Key invariants Guardian docs guarantee:

- `response.status` is `"ok"` on success, `"error"` on failure (with a `message`)
- `response.results[]` always present on `status: "ok"` (possibly empty)
- `webPublicationDate` is ISO 8601 with timezone — directly `Date`-parseable
- `fields` is sparse — only the fields you request via `show-fields` appear, all keys are optional
- `id` is a stable, opaque path-style string (e.g. `"sport/2026/jun/22/lewis-hamilton-canadian-gp..."`), safe to use as a dedupe key

We keep names verbatim from the API (`webTitle`, `webUrl`, `webPublicationDate`, etc.) so the type file doubles as wire documentation.

`GuardianContentItem.fields?.thumbnail` is a CDN URL pointing to Guardian's `i.guim.co.uk` image host — pre-cropped, safe to use as-is in `<img>` tags. No CORS issues because Next.js fetches it server-side.

`GuardianShowField` is exported as a union so callers (and our F1 helper) get IntelliSense on the fields list when they expand beyond the default trio.

---

## 4. `client.ts` — `getGuardianF1News()`

Two layers:

**`guardianSearch(params, opts)`** is the low-level escape hatch. Throws on non-2xx or `status: "error"`. Useful for ad-hoc queries (e.g. driver-profile pages wanting `?q=Verstappen&from-date=2026-01-01`).

**`getGuardianF1News(opts)`** is the F1-rail entry point:

- Reads `process.env.GUARDIAN_API_KEY` on every call (server-only, never bundled). Returns `[]` immediately if missing — honors CORE RULE #1 (no synthetic fallback).
- Issues the tag-query and keyword-query in parallel via `Promise.all`.
- Each branch is wrapped in `.catch(() => [])` so a single endpoint failure does not poison the union.
- Dedupes by `item.id` (Guardian's authoritative identity).
- Re-sorts the merged set by `webPublicationDate` DESC.
- The outer `try/catch` returns `[]` on any unhandled throw (impossible given the per-branch catches, but defense in depth).

Defaults:

```ts
{
  tag: 'sport/formula-one',
  section: 'sport',
  q: 'formula 1',
  showFields: ['trailText', 'thumbnail', 'byline'],
  orderBy: 'newest',
  pageSize: 20,
  revalidate: 300,
}
```

The 300s revalidate matches the RSS aggregator window and is well under Guardian's recommended polling minimum (60s for the dev tier).

Why not use the SDK? Guardian's official `guardian-content-api` npm package is unmaintained (last commit 2018) and pulls in a hand-rolled HTTP layer. The endpoint is a single GET with query params — `fetch` is simpler, faster, and respects Next.js ISR via the `next.revalidate` option.

---

## 5. `mappers.ts` — `UiNewsItem` parity

`UiNewsItem` is structurally identical to the existing `RssItem` so Guardian results slot into the aggregator with zero call-site changes. We export `UiNewsItem` as a type alias and a single-item mapper plus a bulk mapper:

| Source field | Mapped to |
|---|---|
| (constant) | `source = 'The Guardian'` |
| `webTitle` | `title` (stripped of any residual HTML) |
| `webUrl` | `link` |
| `webPublicationDate` | `pubDate` (raw ISO) + `pubDateMs` (computed) |
| `fields.trailText` | `description` (HTML stripped) |
| `fields.thumbnail` | `imageUrl` |
| `fields.byline` | `author` |
| `sectionName` | `categories[0]` |

`stripHtml()` mirrors the RSS strip pass so the aggregator's downstream rendering is consistent. Guardian's `trailText` is light HTML (`<strong>`, occasional `<em>`); leaving raw markup would break the dark-themed card typography in `/latest`.

`pubDateMs = 0` on unparseable dates — `getF1NewsFeed` sorts on it, so a malformed item just falls to the bottom rather than crashing the rail.

Items with missing `title` or `link` are filtered out in `mapGuardianItems`. Same hardening pattern as the RSS parser.

---

## 6. Aggregator changes — `src/rss/index.ts`

`getF1NewsFeed()` now:

1. Kicks off the four-feed RSS fan-out (existing logic untouched).
2. Lazily `import('../guardian')`s inside an IIFE so the import cost is zero when `GUARDIAN_API_KEY` is absent — dynamic import keeps the cold-path tree-shakeable in production builds.
3. `Promise.all`s both branches so total wall-clock time = max(RSS, Guardian), not sum.
4. Sorts the merged set newest-first **before** dedupe, guaranteeing the freshest copy of any duplicated article is the one retained.
5. Dedupes by **two** keys:
   - `dedupeKey(title)`: lowercased, non-alphanumerics collapsed to spaces. Catches "Hamilton wins Canadian GP" vs "Hamilton Wins Canadian GP." vs "Hamilton wins Canadian GP!" reliably.
   - `linkKey(link)`: URL parsed, www-stripped, query-stripped, trailing-slash-stripped. Catches the same article shared with UTM tags from different sources.
6. Caps each `source` at `maxPerSource` (default **8**). If RaceFans drops 20 items in five minutes it cannot drown Autosport or The Guardian. Cap runs after sort+dedupe so the 8 retained items per source are the 8 newest unique ones.
7. Optional `limit` slice at the end.

The dynamic import pattern (`await import('../guardian')`) was chosen over a static `import` to:
- Keep the RSS module loadable when Guardian is intentionally disabled (e.g. quota exhaustion fallback).
- Avoid a static dependency edge that would force consumers of `@apex/api-client/rss` to also resolve the Guardian module.

The error handling matches the RSS branches: any throw inside the Guardian IIFE returns `[]` and the rest of the rail proceeds.

---

## 7. Package + tsconfig wiring

`packages/api-client/package.json` `exports` now includes:

```json
"./guardian": "./src/guardian/index.ts"
```

(Plus a cleanup pass: the duplicate `./openf1` key that was previously listed twice has been deduped.)

`apps/web/tsconfig.json` `paths` adds:

```json
"@apex/api-client/guardian": ["../../packages/api-client/src/guardian"]
```

so `import { getGuardianF1News } from '@apex/api-client/guardian'` resolves identically in the Next.js TS server and at build time. The pattern mirrors all other providers.

---

## 8. Verification

### 8.1 curl smoke test

The user has `GUARDIAN_API_KEY` provisioned in `apps/web/.env.local`. Run from any shell with the env loaded:

```bash
curl -sS "https://content.guardianapis.com/search?tag=sport/formula-one&section=sport&page-size=3&order-by=newest&show-fields=trailText,thumbnail,byline&api-key=${GUARDIAN_API_KEY}" | jq '.response | {status, total, pageSize, currentPage, results: [.results[] | {id, webTitle, webUrl, webPublicationDate, fields}]}'
```

### 8.2 Expected response shape

```json
{
  "response": {
    "status": "ok",
    "userTier": "developer",
    "total": 4127,
    "startIndex": 1,
    "pageSize": 3,
    "currentPage": 1,
    "pages": 1376,
    "orderBy": "newest",
    "results": [
      {
        "id": "sport/2026/jun/22/lewis-hamilton-canadian-gp-podium",
        "type": "article",
        "sectionId": "sport",
        "sectionName": "Sport",
        "webPublicationDate": "2026-06-22T18:24:11Z",
        "webTitle": "Lewis Hamilton takes podium at chaotic Canadian Grand Prix",
        "webUrl": "https://www.theguardian.com/sport/2026/jun/22/lewis-hamilton-canadian-gp-podium",
        "apiUrl": "https://content.guardianapis.com/sport/2026/jun/22/lewis-hamilton-canadian-gp-podium",
        "isHosted": false,
        "pillarId": "pillar/sport",
        "pillarName": "Sport",
        "fields": {
          "trailText": "Mercedes driver climbs to third after late safety car shuffles the order in Montreal",
          "thumbnail": "https://i.guim.co.uk/img/media/abc123.../master/2000.jpg?width=300&quality=85&auto=format",
          "byline": "Giles Richards in Montreal"
        }
      }
    ]
  }
}
```

### 8.3 Error response shape

If the key is bad or missing:

```json
{
  "response": {
    "status": "error",
    "message": "Invalid authentication credentials"
  }
}
```

The client detects `status !== 'ok'` and throws — the public helper catches and returns `[]`.

### 8.4 TypeScript verification

`tsc --noEmit` on the package surfaces only the pre-existing `process` symbol errors that already exist identically in `newsapi/client.ts`, `newsdata/client.ts`, and `gnews/client.ts`. The Guardian module has no novel diagnostics. The workspace-level Next.js build resolves `process.env` via `@types/node` ambient typing and compiles cleanly.

### 8.5 Runtime verification path

Once `apps/web` is rebooted at `localhost:1950`:

1. `/latest` route — Guardian articles should appear interleaved with RSS items, no more than 8 per source, no duplicate titles between Guardian and Autosport.
2. Hover state: each Guardian card shows `By Giles Richards in Montreal` (or similar) as the byline, sourced from `fields.byline`.
3. Thumbnails resolve from `i.guim.co.uk` (no CORS errors in the network panel — Next.js proxies server-side).
4. Toggle the env key off → Guardian items disappear, four RSS sources remain, no errors in server logs.

---

## 9. Rationale highlights

**Why two queries instead of one combined `q=formula 1&tag=sport/formula-one`?**
Guardian treats `q` and `tag` as `AND` filters when supplied together. We want the `OR` semantic — anything tagged F1 *or* anything matching the keyword in sport. Two parallel requests + client-side dedupe is the simplest correct approach.

**Why dedupe by `id` in the client but by `title+link` in the aggregator?**
Guardian's `id` is internally unique, so it's sufficient when deduping within Guardian itself. The aggregator deduplicates across providers (Guardian, RSS, NewsAPI, etc.) where `id` doesn't exist as a cross-provider concept — only the title and URL do.

**Why a per-source cap of 8?**
With 4 RSS sources + Guardian + (NewsAPI/NewsData/GNews when their keys arrive) = up to 8 providers. 8 items each = 64-item rail, which is roughly two full screens at the current `/latest` card density. Below 8, RaceFans alone (which publishes ~30/day) would crowd out slower-but-higher-quality sources like The Guardian (~3-5/day on F1). 8 is the sweet spot.

**Why dynamic `import('../guardian')` inside the RSS module?**
Static import would create a hard module edge from `rss` to `guardian`, meaning anyone consuming `@apex/api-client/rss` (e.g. a future workers job that only wants raw RSS) would have to resolve the Guardian module too. Dynamic import keeps the dependency graph lean and matches the lazy-loading pattern used in other parts of the Apex monorepo for optional providers.

**Why `revalidate: 300` and not `revalidate: 60`?**
F1 news is bursty around sessions but stable between them. 300s matches the existing RSS cadence and leaves Guardian's 5,000/day budget at ~96% headroom (288 calls/day at this rate, doubled to 576 for the two-query strategy). When the live-blog provider integration lands later we can shorten this to 60s on race weekends via a per-session override of the `revalidate` opt.

**Why doesn't the client throw to callers?**
Apex CORE RULE #1: missing/failed external data renders an empty state, never a synthetic one and never a 500. The public `getGuardianF1News` and the aggregator both honor this. The lower-level `guardianSearch` does throw, because some future caller (a CMS admin page, a debug route) may legitimately want to surface the error — but the public path swallows.
