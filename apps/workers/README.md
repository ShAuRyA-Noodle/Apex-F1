# @apex/workers

Ingest + cron workers for Apex. Each script is a single-shot Node entry runnable via `pnpm --filter @apex/workers <script>`.

## Workers shipped

| Script | Frequency | Purpose | Required env |
|---|---|---|---|
| `jolpica:historical` | Once on provision | Seed full 1950 → present archive (seasons, drivers, teams, races, results) | `DATABASE_URL` |
| `jolpica:nightly` | Daily 03:00 UTC | Sync current-season schedule + standings + latest result | `DATABASE_URL` |
| `openf1:live` | Race weekends (Fly VM) | Poll OpenF1 every 2s, write Redis snapshot for WS fanout | `REDIS_URL` (Phase C) |
| `youtube:nightly` | Daily 04:15 UTC | Add new videos from curated F1 channels via public channel-RSS | `DATABASE_URL` |

## Local dev

```bash
export DATABASE_URL='postgresql://...'   # from Supabase project once provisioned
pnpm --filter @apex/workers jolpica:nightly
```

## Cron scheduling (Trigger.dev — Phase B Wave 4)

Each script gets a corresponding Trigger.dev job in `packages/trigger/` (not yet shipped):

```ts
client.defineJob({
  id: 'jolpica-nightly',
  trigger: cronTrigger({ cron: '0 3 * * *' }),
  run: async () => { /* exec jolpica:nightly logic */ },
});
```

## Idempotency

All inserts use `onConflictDoUpdate` or `onConflictDoNothing` on a stable natural key (`driver.slug`, `team.slug`, `race(season_year, round)`, `result(race_id, driver_id)`, `video(provider, provider_asset_id)`). Re-running any script is safe.

## Run audit

Every script wraps its body in `runWorker('source-name', ...)` which writes a row to `ingestion_run` with start/end/status/itemsIn/itemsOut/error. Query that table to monitor health.

## Rate limits

- Jolpica: 4 req/sec ceiling, we pace at ~3.5 req/sec via `POLITE_DELAY_MS = 280`.
- OpenF1: per-IP, several req/sec — we run at 0.5 req/sec (2s tick).
- YouTube channel-RSS: no formal limit but YouTube does aggressively rate-limit if hit faster than ~10 req/min.
