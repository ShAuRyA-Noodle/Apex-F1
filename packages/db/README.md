# @apex/db

Drizzle ORM + Postgres schema for Apex.

## Schema scope

Phase B Wave 1 — schema only. No migrations applied to a remote yet. Provision Supabase project first (see `docs/founder/00_INDEX.md` item 04), then:

```bash
export DATABASE_URL=postgresql://...   # from Supabase Project Settings → Database
pnpm --filter @apex/db generate         # writes ./migrations/0000_*.sql
pnpm --filter @apex/db migrate          # applies to remote
```

## Tables shipped

Core PID §11 surfaces. UUIDs everywhere except `season.year`.

| Table | Purpose |
|---|---|
| `season` | year + status |
| `circuit` | circuit metadata (incl. lat/lon for track map) |
| `race` | season × round, status, dates, FK to circuit |
| `session` | FP1/FP2/FP3/SQ/S/Q/R per race, OpenF1 session_key linkage |
| `driver` | grid metadata + bio + Wikipedia URL |
| `team` | constructor metadata + livery color |
| `driver_team_history` | driver-team-season trio |
| `result` | race results (pos / pts / laps / time / status / fastest lap) |
| `qualifying` | Q1/Q2/Q3 ms + final position |
| `sprint_result` | sprint position + pts + time |
| `pit_stop` | lap + duration |
| `lap` | per-lap time + position |
| `standing_driver` | driver standings by round |
| `standing_team` | constructor standings by round |
| `article` + `article_{tag,driver,team,race}` | editorial CMS |
| `tag`, `author`, `image` | CMS sidecars |
| `video` | YouTube + future native, with race/session linkage |
| `app_user` + `follow` + `saved` | user identity + UX state |
| `event_log` | PostHog-style server-side event mirror |
| `ingestion_run` | worker run audit log |

## Connection helper

`getDb()` returns a lazy singleton Drizzle client. Reads `DATABASE_URL`.

```ts
import { getDb, schema } from '@apex/db';

const db = getDb();
const races = await db.select().from(schema.race).limit(10);
```

## Phase B Wave 2 (not yet)

- Materialized views: `mv_homepage_standings_preview`, `mv_active_race_card`
- Full-text search columns (or push to Meilisearch)
- RLS policies on `app_user`, `follow`, `saved`, `notification_pref`
- Stripe customer + subscription linkage
- `notification_pref`, `embed_record`, `nav_group`, `nav_link`, `partner`
- Telemetry replay schema (`lap_telemetry_summary`, parquet path index)
