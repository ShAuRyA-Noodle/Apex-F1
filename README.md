# Apex

> Independent Formula 1 fan platform. Schedule, results, drivers, teams, news, video, live timing.
> Phase 1 web: Next.js 15 + Turborepo + Tailwind v4 + Lenis + GSAP + Framer Motion.

This is the production codebase for Apex. The PID/PRD lives in [`APEX_F1_PID_PRD.md`](./APEX_F1_PID_PRD.md). Phase 1 plan lives in [`FORMULA1_STARTUP_PHASE1_PID.md`](./FORMULA1_STARTUP_PHASE1_PID.md). System teardown lives in [`FORMULA1_SYSTEM_DESIGN_PLAN.md`](./FORMULA1_SYSTEM_DESIGN_PLAN.md).

## Stack

| Layer | Choice |
|---|---|
| Web framework | Next.js 15 (App Router, RSC, Turbopack dev) |
| Language | TypeScript strict (`noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` + `@theme`) |
| Motion | Lenis (smooth scroll) + GSAP/ScrollTrigger (pin/scrub) + Framer Motion (micro) |
| Monorepo | Turborepo + pnpm workspaces |
| Data (Phase B) | Postgres on Supabase + Drizzle + Upstash Redis |
| Storage (Phase B) | Cloudflare R2 + Cloudflare Images |
| Workers (Phase B) | Trigger.dev (cron + queue) |
| Search (Phase B) | Meilisearch |
| Live (Phase C) | OpenF1 polling + Fly.io WS fanout |
| Errors / analytics (Phase C) | Sentry + PostHog |
| Deploy | Vercel (web) + Fly.io (workers) |

## Workspace

```
F1_Claude/
├── apps/
│   ├── web/          Next.js public site (Phase 1)
│   └── (admin)       CMS (Phase B)
├── packages/
│   ├── ui/           Design tokens + cn helper
│   ├── types/        Shared TS types (Drizzle row shapes etc.)
│   └── (api-client) Phase B
├── infra/            (Phase B) Drizzle migrations, Fly configs
├── APEX_F1_PID_PRD.md          PID + PRD (1085 lines)
├── FORMULA1_STARTUP_PHASE1_PID.md
├── FORMULA1_SYSTEM_DESIGN_PLAN.md
├── CLAUDE.md         Project bible
├── turbo.json
└── pnpm-workspace.yaml
```

Existing top-level folders (`the_grid_homepage/`, `race_lab_*`, `velocity_verse/`, etc.) are
**design-reference artifacts**. `screen.png` is the design oracle and `code.html` was the static
Stitch prototype. They are not part of the build.

## Quick start

```bash
nvm use            # node 20
pnpm install
pnpm dev           # http://localhost:3000
pnpm typecheck
pnpm build
```

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| **A. Cinematic Foundation** | Monorepo, design tokens, AppShell (top util + race ticker + mega nav + footer + cookie consent), smooth scroll, homepage, legal pages, /about, Lighthouse CI | ✅ in progress |
| **B. Surface Build-Out** | 13 Phase-1 routes wired to Jolpica + OpenF1 + Supabase, ISR/SWR, Meilisearch, admin CMS, full 1950 to present historical archive | ⏳ |
| **C. Production Hardening + Live** | Auth (Supabase), live timing UI on OpenF1 WS, Sentry + PostHog, Resend newsletter, Stripe groundwork, k6 load test, public beta | ⏳ |

Mobile (Flutter) deferred to PID Phase 3 (months 9-12).

## Brand & legal

Apex is **independent and unofficial**. Disclaimer is in the footer of every page and on every
legal route. Brand name is "Apex", never "F1" or "Formula 1" in domain, logo, or store listing.
Public data only. Original editorial only. Embeds (not rehosts) for video.

## Environment

Phase A runs with **zero secrets**. Phase B will read:

```
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=
REDIS_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=
CLOUDFLARE_IMAGES_TOKEN=
YOUTUBE_API_KEY=
OWM_API_KEY=
NEXT_PUBLIC_SITE_URL=
```

See PID §27 Appendix B for the full env list.
