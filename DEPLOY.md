# Apex · deploy guide

Apex deploys to **Vercel only**. No Render, no Fly, no separate worker box.

| Concern | Where | Notes |
| --- | --- | --- |
| Next.js 16 app (apps/web) | Vercel | Hobby tier covers Phase 1 traffic |
| API routes + SSE | Vercel Functions | `/api/live/stream` auto-reconnects within the function timeout |
| 4 cron jobs | Vercel cron | Declared in `apps/web/vercel.json` |
| Database | Supabase | Free tier, 500 MB |
| Newsletter | Resend | Free 3000 emails/mo, 100 contacts |
| Long-running seed (`jolpica-historical`) | Local one-shot | Run against the Supabase prod URL once; no permanent worker needed |
| Live OpenF1 polling | On-demand inside SSE | The `/api/live/stream` route polls when a client subscribes; no continuous worker |

GitHub is the source of truth. Every push to `main` triggers a Vercel deploy.

## 1 · One-time Vercel setup

```bash
# from repo root
vercel login          # OAuth in browser
vercel link           # link this repo to a new Vercel project
                      # · Scope     = your personal account
                      # · Project   = apex-f1 (or anything)
                      # · Framework = Next.js (auto-detected)
                      # · Root dir  = ./apps/web
```

In Vercel dashboard → Settings → Build & Development Settings:
- **Root Directory**: `apps/web`
- **Build / Install / Output Command**: leave blank · root `vercel.json` overrides with `pnpm install --frozen-lockfile && pnpm --filter @apex/web build`
- **Node.js Version**: `22.x`

## 2 · Environment variables

Paste every row from `apps/web/.env.example` into Vercel → Settings → Environment Variables. Pick all three scopes (Production / Preview / Development).

| Bucket | Keys |
| --- | --- |
| News + AI | `GROQ_API_KEY`, `NEWSAPI_KEY`, `GUARDIAN_API_KEY`, `NEWSDATA_API_KEY`, `GNEWS_API_KEY`, `CURRENTS_API_KEY` |
| Media | `YOUTUBE_API_KEY`, `UNSPLASH_ACCESS_KEY`, `GIPHY_API_KEY`, `HUGGINGFACE_TOKEN` |
| Newsletter | `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` |
| Cron + DB | `CRON_SECRET` (run `openssl rand -base64 32`), `DATABASE_URL` (Supabase Transaction connection string) |
| App | `NEXT_PUBLIC_SITE_URL` (= production domain, e.g. `https://apex-f1.vercel.app`) |
| Optional tip jar | `NEXT_PUBLIC_TIP_JAR_KOFI`, `NEXT_PUBLIC_TIP_JAR_BMC` |

`apps/web/.env.local` is the source of truth for the local values. It is gitignored.

## 3 · Deploy

```bash
vercel --prod
```

Or just push to `main` · the GitHub integration the `vercel link` step set up handles it.

## 4 · After first deploy

### Sanity sweep
```bash
APEX_URL=https://apex-f1.vercel.app
for path in / /latest /video /search /support /drivers /schedule /live/timing; do
  curl -s -o /dev/null -L -w "$path  %{http_code}  %{time_total}s\n" "$APEX_URL$path"
done
```
Every row should read 200 + sub-second on warm hits.

### Cron jobs (Vercel cron)
Already declared in `apps/web/vercel.json`:
- `/api/cron/rss-sync` every 5 min
- `/api/cron/jolpica-nightly` daily 03:00 UTC
- `/api/cron/weather-sync` hourly
- `/api/cron/youtube-sync` daily 04:00 UTC

Vercel auto-injects `x-vercel-cron: 1` on these calls. The routes also accept `Authorization: Bearer $CRON_SECRET` so you can replay any of them by hand from a terminal:
```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://apex-f1.vercel.app/api/cron/rss-sync
```

### Newsletter (Resend)
After `RESEND_API_KEY` + `RESEND_AUDIENCE_ID` land in Vercel env:
1. Hit `/newsletter` in production.
2. Submit a test email.
3. Confirm it lands in the Resend audience UI at https://resend.com/audiences/<id>.

If the env is missing, the endpoint returns `202 { mode: "local-queue" }` and only logs the capture · the form still says "you're in" so dev never looks broken, but you'll know to wire the keys.

### Supabase (when ready)
1. Create project at https://supabase.com (free tier).
2. Copy the Transaction-mode connection string → set as `DATABASE_URL` on Vercel.
3. Apply Drizzle schema from repo root:
   ```bash
   DATABASE_URL=... pnpm --filter @apex/db drizzle-kit push
   ```
4. One-time seed history:
   ```bash
   DATABASE_URL=... pnpm --filter @apex/workers jolpica:historical
   ```

## Costs (free-tier sanity)

| Service | Tier | Limit | Apex headroom |
| --- | --- | --- | --- |
| Vercel | Hobby | 100 GB bw / 100k invocations | Comfortable for Phase 1 |
| Supabase | Free | 500 MB DB, 50k MAU | Full Jolpica history fits |
| Resend | Free | 3000 emails/mo, 100 contacts | Plenty for early Race Week Briefing |
| All third-party APIs | Free dev tier | (see `apps/web/.env.example`) | Already provisioned, no recurring spend |

Tip jar at `/support` covers infra when something crosses the free tier. No ads, no team sponsorships, no FOM money. Ever.
