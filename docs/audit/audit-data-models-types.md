# Data + schema audit — packages/types + packages/db schema + workers + Drizzle migrations

Now I have all I need. Producing the strict findings now.

### [packages/db/src/schema/video.ts:37] [SEVERITY: P0] [Video dedupe index is non-unique — worker can race-double-insert]
**What's broken:** `video_provider_asset_idx` is a plain `index()` on `(provider, providerAssetId)` — not `uniqueIndex()`. The youtube-nightly worker (`apps/workers/src/youtube-nightly.ts:43-65`) does a SELECT-then-INSERT against this index with NO unique constraint, so two concurrent invocations (manual run + cron) can both pass the `exists.length > 0` check and insert duplicate rows. Even single-threaded, there is no upsert path — every cron iteration re-issues a SELECT before INSERT, which is O(N) round-trips and not idempotent at the DB level.
**User-visible symptom:** Duplicate YouTube videos on `/videos`, `/latest`, and any rail consuming the `video` table once the DB is populated. Round-robin balancing breaks because dupes inflate one channel's count.
**Fix:** Promote to `uniqueIndex('video_provider_asset_unique').on(t.provider, t.providerAssetId)`. Rewrite youtube-nightly worker to a single `.insert(...).onConflictDoUpdate({ target: [schema.video.provider, schema.video.providerAssetId], set: { ... } })` and drop the manual SELECT.
**Why:** Idempotent upserts on natural keys are the contract every other worker (`race`, `result`, `standing_driver`) already honors.

### [packages/db/src/schema/driver.ts:18] [SEVERITY: P1] [Type↔schema drift: `Driver.number` vs `driver.permanentNumber`]
**What's broken:** `packages/types/src/index.ts:66` declares `number: number` (required), but the Drizzle table column is `permanentNumber` (nullable). The mapper in jolpica-historical writes to `permanentNumber`. Anything reading `driver.number` from the DB row will get `undefined`; anything reading `permanentNumber` from a Jolpica-mapped object also misses because the API client likely maps to `.number`.
**User-visible symptom:** Driver card number badges render blank or fall back to "—" once `/drivers/[slug]` reads from DB. Currently masked because no web route uses `@apex/db` yet.
**Fix:** Either rename DB column to `number` (`number: integer('number')`) OR rename the type field to `permanentNumber?: number` and propagate. Pick one, regenerate migration. Add `code: text('code').notNull()` and `nationality countryCode` (the DB has `countryCode` nullable, the type has it required at line 71).
**Why:** Single source of truth — the type and column names diverge silently and the union breaks at the read site, not the write site.

### [packages/db/src/schema/article.ts:25] [SEVERITY: P1] [`articleType` enum drift — `newsletter` in DB, missing from shared type]
**What's broken:** DB enum includes `'newsletter'` at `article.ts:25`, but `packages/types/src/index.ts:6` declares `ArticleType = 'news' | 'feature' | 'analysis' | 'quiz' | 'guide' | 'press' | 'gallery'` — no `newsletter`. A row inserted with `type: 'newsletter'` will fail TypeScript at the read boundary even though Postgres accepts it.
**User-visible symptom:** Article cards filter rails crash or hide newsletter posts; type-checked filter dropdowns omit the option.
**Fix:** Add `'newsletter'` to the `ArticleType` union in `packages/types/src/index.ts:6` (or remove it from the DB enum). Export the Drizzle `articleType` const tuple and derive the TS union from it (`type ArticleType = typeof articleType[number]`) to prevent future drift.
**Why:** Two enum definitions for one concept = guaranteed drift.

### [packages/db/src/schema/team.ts:24] [SEVERITY: P1] [`team.colorHex` is nullable; shared type says required]
**What's broken:** `colorHex: text('color_hex')` is nullable in the DB, but `Team.colorHex: string` is required in `packages/types/src/index.ts:94`. Result.team → Team rendering will pass `null` into TypeScript-required slot, breaking driver/team color rails (`teamColorHex` heatmap, helmet swatches).
**User-visible symptom:** Crashed rendering of `style={{ background: team.colorHex }}` or default-to-gray fallbacks across `/teams`, `/drivers/[slug]`, results tables.
**Fix:** Make `.notNull().default('#262626')` on the column, or mark the type field optional. Same applies to `team.name` (notNull in DB, required in type — that one is consistent) and `team.colorHex` is the actual drift.
**Why:** Frontend can't `.toUpperCase()` or pass `null` to CSS — must enforce at the column level since the type promises it.

### [packages/db/src/schema/team.ts:38] [SEVERITY: P1] [`driverTeamHistory` table exists but is never written by any worker]
**What's broken:** Schema defines `driver_team_history` (`team.ts:38-58`) with `(driverId, teamId, seasonYear, role)` but no worker populates it. Jolpica's `/drivers/{year}` and `/results/{year}/{round}` payloads contain the constructor each driver drove for that round — `jolpica-historical.ts:79-121` ingests both lists side-by-side but never joins them into a history row. The mid-season transfer (e.g., Hamilton → Ferrari 2025) and historical "Mansell at Williams 1986" lookups are impossible.
**User-visible symptom:** Driver profile timeline ("Career" rail) cannot show team-year chronology — falls back to current-team-only chip. `/drivers/[slug]/career` returns empty.
**Fix:** In `jolpica-historical.ts`, after upserting result rows, insert into `schema.driverTeamHistory` with `(driverId, teamId, seasonYear)` deduped by a unique index. Add `uniqueIndex('dth_driver_team_season_unique').on(t.driverId, t.teamId, t.seasonYear)` to the table (currently only has two non-unique indexes — line 55-56).
**Why:** Memory note `project_brand_apex` mentions premium driver profile; without history you can't render anything historic beyond "current team."

### [packages/db/src/schema/result.ts:42] [SEVERITY: P1] [`result.position` nullable but never indexed for retirements; `positionText` only carries "R"/"DNF"]
**What's broken:** `position: integer('position')` is nullable (correct, for retirements), but `result_race_position_idx` at line 43 includes the nullable column — Postgres allows it but `ORDER BY position NULLS LAST` queries (which the standings/results page WILL run) cannot use this index optimally. Additionally there is no index on `positionText`, so filters like "show only DNFs" require a full table scan.
**User-visible symptom:** Once 70+ years × 24 races × 20 drivers (~33k result rows) are seeded by historical, `/results/[year]/[round]` ordering and DNF filters get slow.
**Fix:** Add partial index `index('result_finished_position_idx').on(t.raceId, t.position).where(sql\`position IS NOT NULL\`)` and a separate `index('result_status_idx').on(t.raceId, t.status)` for retirement filters.
**Why:** Index plans matter once Jolpica historical (1950–present) finishes seeding.

### [apps/workers/src/jolpica-historical.ts:155-172] [SEVERITY: P1] [Race upsert is `onConflictDoNothing` — updates to circuit/date never propagate]
**What's broken:** `jolpica-historical.ts:169` uses `.onConflictDoNothing()` on race insert. If Jolpica corrects a date, circuit, or slug after first seed (which they do — schedule revisions are routine), re-running the historical seed never updates the existing row. The nightly worker DOES use `onConflictDoUpdate` (line 62-71), so the two workers disagree on update semantics for the same table.
**User-visible symptom:** `/schedule` and `/races/[slug]` show stale circuit/date for any race that was revised post-first-seed.
**Fix:** Change `.onConflictDoNothing` to `.onConflictDoUpdate({ target: [schema.race.seasonYear, schema.race.round], set: { slug, name, officialName, country, city, circuitId, dateStart, isSprint, status, wikiUrl, updatedAt: new Date() } })`.
**Why:** Idempotency = "running again converges on the truth," not "running again is a no-op."

### [apps/workers/src/jolpica-historical.ts:194-209] [SEVERITY: P1] [Result upsert is `onConflictDoNothing` — corrections to position/points lost]
**What's broken:** Same pattern at line 207. FIA stewards revise classifications post-race (Spa 2021 half-points, Monza 2020 Hamilton penalty, etc.). Re-running historical to backfill silently keeps the first-fetched (possibly wrong) row.
**User-visible symptom:** Driver/team standings rails undercount or miscount after retroactive penalties.
**Fix:** Use `onConflictDoUpdate({ target: [schema.result.raceId, schema.result.driverId], set: { position, positionText, points, laps, timeMs, gapToLeader, status, grid, fastestLapRank, fastestLapTimeMs, fastestLapLap } })`.
**Why:** F1 history is mutable; the DB must follow.

### [packages/db/src/schema/result.ts:48-86] [SEVERITY: P2] [`qualifying`, `sprintResult`, `pitStop`, `lap` tables exist but NO worker writes them]
**What's broken:** Tables ship in schema, but `jolpica-historical.ts` only fetches `/results/` (race results). The doc comment at top of file (line 9-10) promises "Per-round qualifying + sprint + pit stops + laps" but the code never calls `jolpica.getQualifying / getSprint / getPitStops / getLaps`.
**User-visible symptom:** `/results/[year]/[round]/qualifying`, sprint tab, pit-stop strategy chart, and lap-time graph all return empty once the routes ship in Phase C.
**Fix:** Add four sequential fetch+insert blocks in `jolpica-historical.ts:175-214` mirroring the result block. Add the mapper functions in `@apex/api-client/jolpica` (likely already exported). Throttle with same `POLITE_DELAY_MS`.
**Why:** Without these, the "Mission Control / Race Lab" page from CLAUDE.md cannot render anything beyond final classification.

### [apps/workers/src/openf1-live.ts:47-50] [SEVERITY: P2] [openf1-live writes nothing — no Redis, no DB, no ingestion_run]
**What's broken:** The script polls OpenF1 every 2s but the TODO at line 47 admits no persistence. Critically, this worker never calls `runWorker()` so it does not write to `ingestion_run` — there is no audit trail that it ran, what session, or how many ticks succeeded. The `session.openf1SessionKey` column exists in `packages/db/src/schema/session.ts:21` to bridge OpenF1 ↔ our session UUIDs, but nothing populates it.
**User-visible symptom:** During race weekends, live data fetching is invisible to ops — no way to confirm the worker is alive or how stale the cache is. /admin observability dashboard cannot show "last tick at HH:MM:SS".
**Fix:** Wrap the polling loop in `runWorker('openf1-live', async ({log, bump}) => { ... })`. Each tick should `bump({ itemsIn: snap.intervals.length + snap.positions.length })`. Persist `session.openf1SessionKey` once Jolpica session UUID is matched. Even without Redis, write the latest snapshot to a `live_snapshot` JSONB table (new) so SSR has a fallback.
**Why:** Rule "every worker writes ingestion_run" is broken; ops blind.

### [packages/db/src/schema/event_log.ts:11-25] [SEVERITY: P2] [event_log schema is missing index on (userId, name) used by analytics retention queries]
**What's broken:** `event_log` indexes `(ts)` and `(name)` separately but the analytics file `apps/web/lib/analytics.ts:13-28` defines 15 event names and the natural query is "all events of name X for user Y in time window Z." That requires a composite `(userId, name, ts)` or `(name, ts)` index — the latter exists only partially. Also, the schema has no `session_id` or `request_id` column, so funnel analysis (`pageview` → `article_card_click` → `video_play`) can't chain events from the same visit.
**User-visible symptom:** Once 1M+ events accumulate, /admin analytics dashboards take seconds-to-minutes; can't compute conversion funnels.
**Fix:** Add `sessionId: text('session_id')` and `requestId: text('request_id')` columns. Add composite `index('event_log_name_ts_idx').on(t.name, t.ts)` and `index('event_log_user_ts_idx').on(t.userId, t.ts)`. Also add a `path: text('path')` column since `pageview` events without URL are useless.
**Why:** Analytics schema must support the queries you'll actually run, not just inserts.

### [packages/db/src/schema/user.ts:28] [SEVERITY: P2] [`follow.entityId` is UUID — won't work for `tag` follows (tag.id is UUID, but `race` follow contradicts entityId uniqueness across entityKind)]
**What's broken:** `follow.entityKind` allows `'driver' | 'team' | 'race' | 'tag'` but `entityId` is a UUID with NO foreign key. There is no enforcement that an `entityKind='driver'` row's entityId actually exists in `driver.id`. A stale follow (driver retired & deleted) leaves an orphan; `/account` lists ghosts.
**User-visible symptom:** Once Supabase Auth lands, user follow lists show "Unknown driver" tiles for deleted entities. Cannot enforce cascade-on-delete for any follow.
**Fix:** Either split into four tables (`follow_driver`, `follow_team`, `follow_race`, `follow_tag`) each with a real FK + cascade, or add a trigger / app-level cleanup. Cleanest fix: separate tables since you'll query them separately anyway (`SELECT * FROM follow_driver WHERE user_id = $1`).
**Why:** Polymorphic-without-FK is the most common source of orphan rows in Postgres.

### [packages/db/src/schema/user.ts:38-49] [SEVERITY: P2] [`saved.contentKind` enum missing 'race' — but UI memory says race-pages are savable]
**What's broken:** `saved.contentKind` enum at line 44 is `['article', 'video']` only. CLAUDE.md describes race detail pages and driver profiles as first-class. Per the memory note `project_motion_stack` and the page roster, races/drivers are core surfaces — they should be savable too.
**User-visible symptom:** Once /races/[slug] ships, the "save" button can't write a row.
**Fix:** Expand enum to `['article', 'video', 'race', 'driver']`. Apply same FK-orphan caveat from the prior finding.
**Why:** Adding enum values later requires a migration AND a `DROP CONSTRAINT / ADD CONSTRAINT` dance — better to fix now.

### [apps/workers/src/youtube-nightly.ts:62] [SEVERITY: P2] [Video `publishedAt` falls back to `new Date()` when missing — pollutes "Latest" rail with synthetic timestamps]
**What's broken:** `publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date()` at line 62. If RSS scrape returns a video without a timestamp (member-only, geo-restricted, scheduled premiere), we stamp it as "now," which pushes it to the top of every `ORDER BY published_at DESC` query forever.
**User-visible symptom:** Bogus "just uploaded" videos sit at the top of `/videos` rails.
**Fix:** Skip videos with no `publishedAt` (continue), or fall back to the cron `startedAt` AND set an `availability: 'unknown'` flag so render-path can filter them. The column is `nullable` — just allow null and `ORDER BY published_at DESC NULLS LAST`.
**Why:** Synthetic timestamps poison ordering forever.

### [packages/db/src/schema/result.ts:34] [SEVERITY: P2] [`result.status` is freeform text — no enum, no index]
**What's broken:** Jolpica returns ~30 distinct status strings ("Finished", "+1 Lap", "Accident", "Engine", "Gearbox", "Hydraulics", "Did not start", ...). Stored as freeform `text`, with no normalization. UI cannot reliably group "DNF for mechanical" vs "DNF for accident" — and the UI sample handler in CLAUDE.md (race-lab deep dive) likely needs this.
**User-visible symptom:** Reliability charts on driver profile and team page can't bucket DNF causes.
**Fix:** Add a `statusCategory: text('status_category', { enum: ['finished', 'lapped', 'dnf_mechanical', 'dnf_accident', 'dns', 'dsq', 'other'] })` column computed at ingest time. Keep the original `status` for display.
**Why:** Querying `LIKE '%Engine%' OR LIKE '%Gearbox%'` does not scale.

### [packages/db/src/schema/article.ts:39] [SEVERITY: P2] [`article.authorId` has FK but no index — author profile page query will full-scan]
**What's broken:** `authorId` references `author.id` but the table has no `index('article_author_idx').on(t.authorId)`. `/authors/[slug]` listing articles by author is the canonical query and will full-scan once article count grows.
**User-visible symptom:** Slow author profile pages.
**Fix:** Add `authorIdx: index('article_author_idx').on(t.authorId)` to the index block at line 54.
**Why:** Every FK that participates in a list-by-FK query needs its own index.

### [packages/db/src/schema/video.ts:28-29] [SEVERITY: P2] [`video.raceId` and `video.sessionId` FK exist but no worker sets them — videos can never link to races]
**What's broken:** Schema includes `raceId` and `sessionId` FKs on video, but the youtube-nightly worker never sets them. The mapper in `@apex/api-client/youtube` would need to fuzzy-match YouTube titles to race rounds (e.g., "Hungarian GP 2026 Race Highlights" → 2026 R12). Without it, `videos[]` is a flat island and `/races/[slug]/highlights` can't filter videos by race.
**User-visible symptom:** Race detail pages cannot show their own highlight reel.
**Fix:** Add `enrichVideoWithRace()` step in youtube-nightly that runs a title-match against the current season's races + does naive year/country fuzzy match. Even matching only 60% beats 0%. Backfill from `raceSlug` field already declared in `types/index.ts:174` `VideoItem.raceSlug`.
**Why:** Pre-shipped foreign keys with no writer = dead columns.

### [packages/db/src/client.ts:13] [SEVERITY: P2] [`postgres({ max: 10, prepare: false })` — no pool-size override for workers vs serverless]
**What's broken:** The same `getDb()` is used by Vercel serverless (apps/web) and long-running workers (apps/workers). Vercel serverless wants `max: 1` (each lambda is short-lived; pooling is on PgBouncer side). Long-running workers want `max: 10-20`. Single shared config = wasted connections on Vercel and starved connections on workers.
**User-visible symptom:** On warm Vercel traffic spikes you blow through Supabase's free-tier connection limit (60); on workers you bottleneck under-utilizing.
**Fix:** Accept `getDb(opts?: { max?: number })` or read `process.env.DB_POOL_MAX` (default 1 on Vercel via `process.env.VERCEL === '1'`, else 10).
**Why:** Connection management is the #1 Supabase / serverless gotcha.

### [packages/types/src/index.ts:186-205] [SEVERITY: P3] [`SocialPost` and `Partner` types are unused dead types]
**What's broken:** `SocialPost` (provider: instagram/youtube/reddit/twitter/tiktok) and `Partner` types are declared but no Drizzle table backs them and no provider integration writes them. Imports search returns zero consumers under `/apps`.
**User-visible symptom:** None today; cognitive overhead and bit-rot.
**Fix:** Either ship the `partner` and `social_post` Drizzle tables (and add ingestion in Phase C), or delete the types until they're needed. Match the schema-types parity discipline used elsewhere.
**Why:** Dead code drifts.

### [packages/db/src/schema/ingestion_run.ts:12-22] [SEVERITY: P3] [No index on `source` + `startedAt` — admin "last 10 runs of jolpica-historical" requires a full scan]
**What's broken:** `ingestion_run` has no indexes at all. The natural admin/observability query is `SELECT * FROM ingestion_run WHERE source = $1 ORDER BY started_at DESC LIMIT 10`. With nothing indexed, this scans every row after a few months.
**User-visible symptom:** Slow `/admin/observability` runs panel.
**Fix:** Add `(t) => ({ sourceStartedIdx: index('ir_source_started_idx').on(t.source, t.startedAt.desc()) })`.
**Why:** Cheap to add now; expensive to discover later.

### [packages/db/src/schema/race.ts:32] [SEVERITY: P3] [`race.timezone` is nullable but `Race.timezone` in shared type is required]
**What's broken:** `timezone: text('timezone')` is nullable in DB; `Race.timezone: string` is required in `types/index.ts:43`. Time-display helpers (`toZonedTime(race.timezone, ...)`) will throw on null.
**User-visible symptom:** Server crash or fallback to UTC when rendering schedule for races where Jolpica didn't return TZ.
**Fix:** Either notNull-default to circuit's tz, or mark optional in type. Same fix mode as the other type↔column drift findings.
**Why:** Strict-mode TypeScript will not save you from a Postgres null.

### [packages/db/src/schema/standing.ts:23-25] [SEVERITY: P3] [`standingDriver.round` should allow 0 for pre-season — schema rejects it]
**What's broken:** `round: integer('round').notNull()` with no constraint. The unique index `sd_unique` at line 30 covers `(seasonYear, round, driverId)`. But `jolpica-nightly.ts:42-46` uses `lastFinishedRound = 0` BEFORE the season's first race — meaning every driver gets `round = 0` standings stored, which is technically fine but `JOIN race ON race.round = sd.round` returns nothing for those rows (no round 0 exists in `race`). Better: store `round: null` for pre-season and adjust the unique constraint accordingly, OR explicitly document round 0 = "pre-season cumulative."
**User-visible symptom:** Pre-season standings widget either shows zeros for everyone or fails to join.
**Fix:** Either (a) define `round 0 = pre-season carry-over` in a comment and never join to race on that round, or (b) make round nullable and use `uniqueIndex('sd_unique').on(t.seasonYear, t.round, t.driverId).where(sql\`round IS NOT NULL\`)` for non-null rounds plus a partial unique for null rounds.
**Why:** Foot-gun for join semantics.

### [apps/workers/src/jolpica-historical.ts:77-78] [SEVERITY: P3] [Driver/constructor loop has serialized awaits — historical seed runs ~4-6h could be ~1h with batching]
**What's broken:** Each driver is awaited in a sequential loop (`for (const d of driverList.map(mapDriver)) { await db.insert ... }`). For 70+ years × ~25 drivers/year × 280ms = ~8 minutes of pure await-overhead on drivers alone, before counting result rows.
**User-visible symptom:** Operational pain re-seeding history.
**Fix:** Batch into single `.insert(schema.driver).values([...]).onConflictDoUpdate(...)` (Drizzle supports bulk values) per year. Same for constructor and result rows. Cuts round-trip count 25×.
**Why:** Hours saved on every historical re-seed.

### [packages/db/src/schema/session.ts:5] [SEVERITY: P3] [`sessionStatus` declared but no index — querying "live sessions" full-scans]
**What's broken:** No index on `status`. Once openf1-live writes `status: 'live'`, the natural query `SELECT * FROM session WHERE status = 'live'` (powering the live banner / homepage hero) is unindexed.
**User-visible symptom:** Eventually slow homepage hero query.
**Fix:** `statusIdx: index('session_status_idx').on(t.status)` — or a partial `WHERE status = 'live'` for tiny-set lookups.
**Why:** Cheap.

### [packages/db/src/schema/circuit.ts:11-15] [SEVERITY: P3] [`circuit.lengthKm` / `corners` nullable but `Circuit` type requires them]
**What's broken:** Drift again — `lengthKm: real('length_km')` and `corners: integer('corners')` are nullable; the type at `types/index.ts:22-23` requires both. Jolpica often omits corners count for historical circuits (pre-1980).
**User-visible symptom:** Render crash on historical circuit detail pages.
**Fix:** Type: `lengthKm?: number; corners?: number`. Update consumers to guard.
**Why:** Type↔column drift same pattern.

### [packages/db/src/schema/article.ts:43] [SEVERITY: P3] [`readTimeMinutes` nullable in DB, required in type]
**What's broken:** `Article.readTimeMinutes: number` (required) vs DB nullable column. RSS imports often have no body; cannot compute readTime.
**User-visible symptom:** Article card "5 min read" badge shows "undefined min read" or crashes.
**Fix:** Either compute a default (`Math.max(1, Math.ceil(bodyMd?.split(/\s+/).length / 200 ?? 1))` in mapper) and `.notNull().default(1)`, OR optional in type.
**Why:** Same drift pattern; render-time blank.

---

**COUNT: P0=1 P1=7 P2=11 P3=8**

**TOP_FIVE_PRIORITY:**
1. **packages/db/src/schema/video.ts:37** — Non-unique dedupe index allows duplicate YouTube rows (P0). Promote to `uniqueIndex` + switch worker to upsert.
2. **packages/db/src/schema/driver.ts:18** — `permanentNumber` vs `number` type↔schema drift breaks driver-card render (P1). Unify naming.
3. **apps/workers/src/jolpica-historical.ts:155-209** — Both race AND result inserts use `onConflictDoNothing`, blocking FIA revisions and date corrections (P1). Switch to `onConflictDoUpdate`.
4. **packages/db/src/schema/team.ts:38** — `driverTeamHistory` table exists but no writer; driver-career pages will return empty (P1). Add insert in historical worker + unique index.
5. **apps/workers/src/openf1-live.ts:47-50** — Live worker doesn't write `ingestion_run`, no Redis persistence, ops is blind during race weekends (P2 leaning P1). Wrap in `runWorker` + at minimum log ticks.

**FIX_BUNDLE_SIZE: ~480 LOC** (~120 schema edits + 1 new migration, ~180 worker edits across 4 files, ~80 type-package edits, ~40 LOC live-worker `runWorker` wrap, ~60 LOC new indexes & column additions). One Drizzle migration generation + one types-pkg minor bump required.
