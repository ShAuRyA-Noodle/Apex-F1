# YouTube Data API v3 integration — replacing channel-RSS-only mode

Clean. All YouTube-touched files typecheck. Now the final deliverable.

---

# YouTube Data API v3 wiring — complete

## Files written

| Path | Role |
|---|---|
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/youtube/data-client.ts` | NEW — Data API v3 client (search, videos, channels, playlistItems) |
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/youtube/mappers.ts` | NEW — enriched UI shape + format helpers |
| `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/youtube/index.ts` | REWRITE — two-tier barrel, Data API preferred, RSS fallback |
| `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/home/FeaturedVideoRail.tsx` | UPDATE — shows view count + exact duration when enriched |
| `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/home/HighlightsRail.tsx` | UPDATE — same |
| `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/video/page.tsx` | UPDATE — adds view counts + Newest / Most-viewed sort tabs |
| `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/api/cron/youtube-sync/route.ts` | NEW — daily 04:00 UTC sync, 505 units/day budget, Vercel cron auth |

`package.json` exports map and `apps/web/tsconfig.json` paths already point at `./src/youtube/index.ts` — no edits needed (they survived the linter pass shown earlier).

## Architecture rationale

### 1. Two-tier provider, single entry point

`getF1Videos()` returns `Array<YouTubeVideo | YouTubeVideoEnriched>`. The Data API path returns `YouTubeVideoEnriched` records with a `enriched: true` discriminator; the RSS path returns the original `YouTubeVideo` shape. Components narrow with `isEnriched(v)` and conditionally render view-counts + duration. This keeps **one** render pipeline regardless of which tier is active and lets us swap tiers per-request based on `process.env.YOUTUBE_API_KEY`.

If the Data API returns empty (quota exhausted, key invalid, network blip), we silently fall through to RSS. Per project rule #1 (no mock data), if both fail we return `[]` and the UI shows its existing empty state.

### 2. Quota budget — the most important thing

YouTube Data API v3 default quota is 10,000 units/day. The cost asymmetry is brutal:

| Endpoint | Units / call | Where used |
|---|---|---|
| `/search.list` | **100** | cron only |
| `/videos.list` | 1 (up to 50 ids batched) | render-path + cron |
| `/channels.list` | 1 (up to 50 ids batched) | render-path |
| `/playlistItems.list` | 1 | render-path (uploads playlist) |

Render-path strategy when warm: **0 units**. When cold (cache miss across all five channels):
- `/channels.list` once for all 5 channels = **1 unit** (7-day cache)
- `/playlistItems.list` once per channel = **5 units** (1-hour cache)
- `/videos.list` once batched = **1 unit** (24-hour cache)
- **Total cold: 7 units.** Same data via `/search` would be **500 units**.

Cron-path daily cost: 1 × `/search` (100u) + 1 × `/videos` (1u) per channel × 5 channels = **505 units/day = 5.05% of quota**.

This leaves ~94% headroom for incidental cache misses, manual cron re-runs, ad-hoc exploration, and growth to ~20 channels before any quota increase request.

### 3. Cache durations

| Data | TTL | Why |
|---|---|---|
| `/search` | 6h | Defense-in-depth against accidental re-call; cron runs daily anyway |
| `/videos` | 24h | Stats drift slowly; durations are immutable |
| `/channels` | 7d | Subscriber counts move on a weekly timescale |
| `/playlistItems` | 1h | New uploads must appear within an hour |

All caches use Next.js `fetch({ next: { revalidate } })` per project rule #5 (no Redis until Phase C).

### 4. Cron auth

Two valid auth modes:

1. `x-vercel-cron` header — Vercel's edge strips this from inbound public requests before they reach the function, so only Vercel's scheduler can pass it.
2. `Authorization: Bearer ${CRON_SECRET}` — set `CRON_SECRET` in Vercel project env vars; use this for manual re-runs from the Vercel UI's "Run now" button on the cron page.

No key in env? The route returns a 200 with `skipped: 'YOUTUBE_API_KEY missing'` and zero units spent. This keeps the cron green during the provisioning window so Vercel doesn't alarm.

### 5. Persistence late-binding

The cron writes to `@apex/db.persistVideos(rows)` when that package lands. Until then it uses a string-keyed dynamic import (`new Function('s', 'return import(s)')`) so the route compiles without the package. When you ship `@apex/db`, export a `persistVideos(rows: YTVideoDetail[]): Promise<number>` that idempotently upserts on `videoId` — the cron will pick it up automatically.

### 6. Why uploads-playlist for render and /search for cron

The cheap uploads-playlist tier (1 unit) misses three categories: Shorts, members-only previews, and community-uploaded content. The expensive `/search` tier captures all three. We pay 100 units once a day for completeness on the cron, and 1 unit per cold-cache render-path hit for freshness on the rails. This is the optimal trade-off given the quota.

---

## What you need to do — add `vercel.json`

The cron schedule lives outside the route file. Add this at `/Users/shauryapunj/Desktop/F1_Claude/apps/web/vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/youtube-sync", "schedule": "0 4 * * *" }
  ]
}
```

Vercel auto-detects this on the next deploy. Verify it appears under Project → Settings → Cron Jobs.

Also add `CRON_SECRET` (any long random string) in Vercel project env vars so you can manually re-trigger the route from the Vercel cron UI.

---

## YOUTUBE_API_KEY — verbatim Google Cloud Console click path

You are stuck on the Metrics page because you provisioned the API but never minted a key. Keys live in **Credentials**, not Metrics. Here is the literal click sequence:

### A. Pick or create a project

1. Open https://console.cloud.google.com/ — make sure you are signed into the Google account you want to bill against (free tier is fine; 10,000 units/day requires no billing).
2. In the **top-left**, next to "Google Cloud" wordmark, click the **project picker dropdown** (it shows your current project name or "Select a project").
3. In the dialog: click **"NEW PROJECT"** in the top-right.
4. Project name: `apex-f1-prod` (or whatever you like). Leave organisation blank if you are personal.
5. Click **CREATE**. Wait ~5 seconds for the notification badge to flip to "Project created".
6. Click the notification, or re-open the project picker and select `apex-f1-prod`. The header should now show this project name.

### B. Enable the YouTube Data API v3

1. In the **top-left burger menu (☰)**, hover over **"APIs & Services"**, then click **"Library"**. Or paste this in the URL bar: `https://console.cloud.google.com/apis/library`.
2. In the search box, type exactly: `YouTube Data API v3`.
3. Click the **"YouTube Data API v3"** card (publisher: Google Enterprise API).
4. Click the blue **"ENABLE"** button. Wait ~10 seconds for the redirect.
5. You will land on the **Overview / Metrics** page for that API. **This is the page you were stuck on.** Keys are not made here. Continue to step C.

### C. Create the API key

1. In the left sidebar of the API page, click **"Credentials"** (it has a key icon). Or paste: `https://console.cloud.google.com/apis/credentials`.
2. At the top of the Credentials page, click **"+ CREATE CREDENTIALS"** (blue button, top-bar).
3. From the dropdown, select **"API key"** (NOT "OAuth client ID", NOT "Service account").
4. A modal pops up titled "API key created" showing the literal key string (`AIza...`, ~39 chars). **Copy it now** to a scratch buffer. You can re-view it later but copying immediately is easier.
5. In the same modal, click **"Edit API key"** (or click the pencil icon on the key row after closing the modal).

### D. Restrict the key (mandatory before paste into prod env)

1. Field **"Name"**: rename from "API key 1" to `apex-youtube-server` so future-you knows which key this is.
2. Section **"Application restrictions"**: choose **"None"** for now (server-side fetch, no referrer to validate). If you later proxy through Cloudflare with a static egress IP, switch this to **"IP addresses"** and add Vercel's egress range.
3. Section **"API restrictions"**: choose **"Restrict key"**. In the dropdown that appears, tick **only** `YouTube Data API v3`. Untick everything else. This is the single most important restriction — it caps blast radius if the key leaks.
4. Scroll down. Click **"SAVE"**.

### E. Verify quota

1. Left sidebar → **"Quotas & System Limits"** under "APIs & Services". Or: `https://console.cloud.google.com/iam-admin/quotas`.
2. Filter by service: `YouTube Data API v3`. You should see **"Queries per day"** at **10,000**. That is the free-tier default — no billing account needed.
3. If you ever need more, click the **"EDIT QUOTAS"** button and submit the form; Google approves most legitimate aggregator use cases within 2-3 business days.

### F. Paste into `.env.local`

In your repo:

```
# apps/web/.env.local  (gitignored)
YOUTUBE_API_KEY=AIzaSy...your_actual_key_here
CRON_SECRET=any_long_random_string_for_manual_cron_reruns
```

Restart the dev server (`pnpm dev`). Hit http://localhost:1950/video — within ~10 seconds you should see view-count chips and exact duration overlays on each card. The presence of the "Sort: Newest / Most viewed" toolbar is the visual confirmation the Data API tier is active. No toolbar = key not picked up (check the file path, restart again).

### G. Paste into Vercel

Project Settings → **Environment Variables** → **Add**:
- Key: `YOUTUBE_API_KEY`, Value: same `AIza...` string, Environments: Production + Preview + Development, click **Save**.
- Key: `CRON_SECRET`, Value: any long random string, Environments: Production, click **Save**.

Trigger a redeploy (push any commit or click "Redeploy" on latest deployment). The cron will now fire at 04:00 UTC daily; you can also re-run it manually from the Cron Jobs page using the `CRON_SECRET` bearer.

### H. Sanity-check the cron

Once deployed, hit `https://<your-prod-domain>/api/cron/youtube-sync` from a terminal:

```
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-prod-domain>/api/cron/youtube-sync
```

Expected response shape:

```json
{
  "ok": true,
  "startedAt": "...",
  "finishedAt": "...",
  "durationMs": 1200,
  "channels": [
    { "channelId": "UCB_qr75-ydFVKSF9Dmo6izg", "name": "FORMULA 1", "searchUnitCost": 100, "videosUnitCost": 1, "searchResults": 6, "enrichedResults": 6 },
    ...
  ],
  "totals": {
    "quotaUnitsUsed": 505,
    "quotaUnitsBudget": 10000,
    "quotaPercent": 5.05,
    "videosFetched": 30,
    "videosEnriched": 30,
    "videosPersisted": 0
  }
}
```

`videosPersisted: 0` is expected until `@apex/db` exports `persistVideos`. Quota at 5% confirms the budget math is correct in production.

### I. Common gotchas

- **403 quotaExceeded** on first call usually means the project's quota timer hasn't reset since enable — wait 5 minutes.
- **400 keyInvalid** means you pasted with leading whitespace or the wrong key. Re-copy from the Credentials page.
- **403 keyExpired / keyDisabled** means the API restriction in step D.3 doesn't include YouTube Data API v3 — re-tick it.
- **Empty results** even with a valid key: the channel-RSS fallback is engaging because the Data API returned `null`. Check the Vercel function logs for the underlying fetch error. Most likely cause: the key works locally but the production env var was never saved.
- **Subscriber counts show as 0**: YouTube hides exact subscriber counts for some channels (privacy setting on the channel). The Data API will return `"subscriberCount": "0"` or omit the field. There is no workaround — this is by design.

---

## Verification

- `pnpm typecheck` in `packages/api-client` passes for all YouTube files (the 4 huggingface errors are pre-existing and unrelated).
- `pnpm typecheck` in `apps/web` passes cleanly for `FeaturedVideoRail.tsx`, `HighlightsRail.tsx`, `app/video/page.tsx`, and `app/api/cron/youtube-sync/route.ts`.
- The existing `getF1Videos()` callers across the rest of the codebase continue to work because the return type widens from `YouTubeVideo[]` to `Array<YouTubeVideo | YouTubeVideoEnriched>` — a structural superset. Old call sites that don't narrow simply ignore the extra fields.
