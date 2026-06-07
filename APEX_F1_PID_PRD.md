# Apex — F1 Fan Platform — Combined PID + PRD

> **PID** = Project Initiation Document (governance, scope, risks, roadmap, business case).
> **PRD** = Product Requirements Document (what gets built, user-facing requirements, acceptance criteria, component spec).
> This file is both. Sections 1–7 are PID. Sections 8–22 are PRD. Sections 23–29 are mixed appendices.

**Working brand name:** Apex (placeholder; final TBD — see §28 Open Decisions).
**Working directory:** `/Users/shauryapunj/Desktop/F1`.
**Date:** 2026-05-21.
**Status:** Draft v1 — pre-build.
**Reference teardown:** `FORMULA1_SYSTEM_DESIGN_PLAN.md` (architecture observations).

---

## 0. TL;DR

Apex is an unofficial Formula 1 fan platform: a fast, cinematic, data-rich website + mobile app that competes with Formula1.com on UX while staying lawful (no trademark misuse, no copied editorial, no rehosted paid video). Three phases:

1. **Phase 1 (Web MVP, ~12 weeks):** schedule, results, news, drivers, teams, video, mobile-first SSR, public APIs for data (Jolpica / OpenF1), original editorial CMS, YouTube embeds for video, our own design system, beta launch.
2. **Phase 2 (Web v2, ~16 weeks):** live timing dashboard, social aggregation (Instagram/YouTube/Reddit), telemetry overlays, accounts, push, basic monetization.
3. **Phase 3 (Mobile, ~16 weeks):** Android first (Flutter recommended), iOS second, inshorts-style news feed, race weekend live mode, push notifications, offline cache.

Stack: Next.js 15 + Postgres (Supabase) + Drizzle + Redis (Upstash) + Cloudflare R2/Images + Trigger.dev workers + Meilisearch + PostHog + Sentry. Mobile: Flutter + Firebase.

Legal stance: **unofficial fan project**, brand-safe naming, original copy, factual data via public APIs, embeds (not rehosts) for video, partner logos only if licensed, prominent disclaimer.

---

## 1. Vision, Mission, Goals, Non-Goals

### 1.1 Vision
A faster, denser, more cinematic home for the Formula 1 fan than the official site, with social-native media discovery (Instagram + YouTube + Reddit) and race-day live mode that feels closer to mission control than a news page.

### 1.2 Mission
Aggregate factual race/driver/team data, original editorial coverage, and licensed/embeddable media into one product that loads fast, looks premium, and works offline-first on mobile during travel/race weekends.

### 1.3 Strategic goals (12-month)
- **G1**: Web MVP live with 100% of factual data parity to Formula1.com schedule + results surfaces.
- **G2**: 25k MAU on web within 90 days of public launch.
- **G3**: Android app live by month 12 with 10k installs.
- **G4**: 5+ original long-form editorial pieces per week.
- **G5**: Time-to-interactive ≤ 1.5 s on 4G for homepage; LCP ≤ 1.8 s; CLS ≤ 0.05.
- **G6**: Zero IP takedowns / cease & desist in year one.

### 1.4 Non-goals (explicit)
- **Not** rehosting F1 TV livestreams. F1 TV is a paid product owned by Formula One Management; mirroring is illegal. Apex can link out.
- **Not** copying Formula1.com source code, CSS, HTML, written articles, photos, logos, F1 trademarks, team logos (unless licensed).
- **Not** building a betting/gambling product (different regulatory regime).
- **Not** building a rights-acquired video platform (capex too high pre-revenue).
- **Not** a generic motorsport aggregator (NASCAR/Indy/MotoGP) — F1-only at launch.

---

## 2. Business Case

### 2.1 Why now
- DTS Netflix-driven viewership inflection (+50% US, +30% global vs. 2018).
- F1 demographic younger, social-native; Formula1.com is editorial-first, slow, and lacks social-media-native discovery.
- Paywalled F1 TV creates an aggregation gap that ad-supported / freemium products can fill lawfully via embeds + own editorial.
- Public/community APIs (OpenF1, Jolpica) now mature enough to power production apps.
- AI-assisted content workflow lowers editorial cost.

### 2.2 Monetization paths (ranked by feasibility)
1. **Display ads** (programmatic via Google AdSense / EPP / Sortable) — Day-1 lever, ~$3–8 RPM mobile, ~$10–20 RPM desktop in motorsport vertical.
2. **Affiliate commerce** — F1 merch (official store via Awin), tickets (Viagogo, Motorsport Tickets), hotels (Booking partner) — 4–10% commission.
3. **Newsletter sponsorships** — race-week editions, ~$500–2k per send at 25k subs.
4. **Premium subscription (Apex+)** — $4.99/mo: ad-free, telemetry replays, fantasy tools, archive deep-dive. Phase 2.
5. **API monetization** — sell our aggregated/cleaned data via developer API. Phase 3+.
6. **B2B white-label** — race-team / media-partner dashboards. Far future.
7. **Native sponsorships / brand partners** — teams, sponsors, racing sims (iRacing, F1 EA).

### 2.3 Cost envelope (estimated monthly, MVP scale)
| Item | Vendor | $/mo |
|---|---|---|
| Hosting (Next.js) | Vercel Pro | 20 |
| Postgres + Auth + Storage | Supabase Pro | 25 |
| Redis | Upstash Pay-as-you-go | 10 |
| Object storage / images | Cloudflare R2 + Images | 15 |
| Worker / cron | Trigger.dev Hobby | 0–20 |
| Search | Meilisearch Cloud Build | 30 |
| Email transactional | Resend | 20 |
| Errors | Sentry Team | 26 |
| Analytics | PostHog Hobby | 0 |
| Uptime | Better Stack | 0 |
| Domain | — | 2 |
| **Total** | | **~$148/mo** |

Scale to ~$600–1.2k/mo at 250k MAU.

---

## 3. Legal & IP Boundaries (read this first)

This is the section most fan projects screw up. The rule of thumb: **facts are free; expression is owned; trademarks signal source**.

### 3.1 What is safe to use
| Asset | Status | How |
|---|---|---|
| Race schedule (dates, locations, names of circuits) | Factual | Use Jolpica / OpenF1 |
| Driver names, numbers, teams, nationalities, results | Factual | Use Jolpica / OpenF1 |
| Lap times, sector times, positions, tyre, weather | Factual | Use OpenF1 |
| Driver biographies | Factual but expression copyrighted | Write our own; or use Wikipedia (CC-BY-SA, attribute) |
| Circuit info / maps | Factual data OK; F1 official map = copyrighted | Build our own SVG track maps from OpenStreetMap data |
| Photography | Copyrighted | License (Getty, Motorsport Images, AP) or generate / own-shoot |
| Logos (F1, FIA, team) | Trademarked | **Do not use** unless licensed; nominative-fair-use allowed in editorial body text only |
| YouTube videos from F1 official channel | Copyrighted but embed-licensed | Embed via YouTube iframe (allowed by uploader's "allow embedding" flag) |
| Instagram posts | Copyrighted but embed-licensed | Use Instagram oEmbed for permalink-based embeds |
| Reddit posts | User-generated; per Reddit ToS | Link out / use Reddit oEmbed |
| Wikimedia Commons | Free / various Creative Commons | Attribute correctly |

### 3.2 What is forbidden
- Copy/paste of Formula1.com written articles, captions, alt text, or headlines.
- Mirror of Formula1.com images/videos (no hotlinking, no proxying their CDN).
- Reuse of Formula1.com CSS / HTML / JS bundles.
- Use of "FORMULA 1", "F1", FIA marks, team marks in our **brand name**, **domain**, **logo**, **app icon**, **store listing**.
- Implying official affiliation. Required disclaimer everywhere.
- Hotlinking livetiming.formula1.com SignalR feed directly — terms-grey-area; use OpenF1 as a middleman.
- Re-streaming F1 TV / Sky Sports / ESPN F1 broadcasts.
- Hosting torrents, full-race replays, or clipped highlight reels we did not produce.

### 3.3 Mandatory site-wide disclaimer
> *Apex is an independent, fan-built Formula 1 information service. Apex is not affiliated with, endorsed by, or associated with Formula 1, Formula One World Championship Limited, FIA, FOM, Liberty Media, or any constructor or driver. "Formula 1", "F1", "Grand Prix", and team/driver names are used in a purely descriptive/nominative sense.*

Place in footer of every page, app About screen, app store listing, all OAuth scopes.

### 3.4 DMCA / takedown plan
- Designated agent registered with US Copyright Office.
- Email `legal@<our-domain>` published in footer.
- 48-hr response SLA, content-removal workflow in CMS.

### 3.5 Privacy / data
- GDPR + CCPA cookie consent banner from day 1 (use Cookiebot or own).
- No PII collection until signup; analytics anonymized; IP truncation on server-side events.
- Data residency: EU + US regions; Supabase EU project for EU traffic.

---

## 4. Personas + Jobs-To-Be-Done

| Persona | Description | Top JTBD | Killer feature |
|---|---|---|---|
| **Casual Sunday viewer** | Watches the race, ignores rest | "What time is the race in my timezone?" | Race-week localized countdown widget + push |
| **DTS-onboarded newcomer** | Storyline-driven, knows Lewis/Max/Norris | "Why is X driver mad at Y?" | Story timelines, rivalry pages, character-driven editorial |
| **Diehard analyst** | Watches every session, knows the grid | "Show me sector deltas for Q3" | Live timing + telemetry replays |
| **Stats archivist** | Loves history, queries random facts | "Most wins on rainy Sundays at Spa" | Archive search, structured query UI |
| **Mobile commuter** | Reads on metro/train | "5 fastest things I missed today" | Inshorts-style swipeable cards, offline cache |
| **Fantasy gamer** | F1 Fantasy / picks pools | "Best DRS-friendly car for Spa" | Fantasy aid tools, projections |
| **Merch shopper** | Wants gear | "Where do I buy a Norris cap?" | Aggregated commerce w/ affiliate |

---

## 5. Market & Competition

| Competitor | Strength | Weakness | Apex angle |
|---|---|---|---|
| Formula1.com | Official, comprehensive, has rights | Slow, paywalled video, generic UX | Speed, free, cinematic UX |
| Motorsport.com | Editorial depth, multi-series | Cluttered, ad-heavy | Cleaner UX, F1-only focus |
| Autosport.com | Heritage, paywall | Old design, paid | Free + modern |
| RaceFans.net | Fan-built, opinionated | Limited media, small team | Modern stack, better mobile |
| Reddit r/formula1 | Community velocity | Noisy, ephemeral, no schedule | Structured + community signals |
| The Race | Strong video, podcast | Paywall climbing | Free, embed-aggregation |
| F1 official app | Push, live timing | Restricted features w/o F1 TV sub | Free live data via OpenF1 |
| Discord/WhatsApp groups | Real-time chat | No structure | Optional chat layer later |

Differentiation: **fastest** + **most cinematic** + **social-aggregated** + **free**.

---

## 6. Risks & Mitigation

| ID | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Cease & desist from FOM for trademark use | High | Med | Strict brand separation, mandatory disclaimer, legal review pre-launch |
| R2 | DMCA takedown of embedded video | Med | Low | Use only owner-allowed embeds; remove on notice within 24h |
| R3 | OpenF1 / Jolpica API outage or rate limit during race | High | Med | Aggressive Redis cache; multi-source fallback; ingestion buffer |
| R4 | Instagram Graph API restricts hashtag search further | Med | High | Plan around: own-uploaded curated set + oEmbed user-supplied URLs |
| R5 | YouTube Data API quota exceeded | Med | Med | Server-side dedupe, cache `videos.list`, raise quota via Google form |
| R6 | Scraping detection on livetiming.formula1.com | High | Low | Don't scrape; use OpenF1 |
| R7 | Slow editorial output → low SEO | Med | Med | AI-assisted drafts (human-reviewed); RSS-ingest licensed wires |
| R8 | Mobile app store rejection due to brand | Med | Med | Pre-submit review w/ legal; non-infringing name + icon |
| R9 | Race-weekend traffic spike crashes site | High | Med | Vercel + Redis edge cache + ISR; load test before season opener |
| R10 | GDPR fine | High | Low | Cookie consent, DSAR workflow, EU data residency |
| R11 | Live data inaccuracy → user trust loss | Med | Med | Cross-check OpenF1 vs Jolpica; "data delayed" banner during outages |
| R12 | Founder bandwidth | High | High | Outsource editorial early; defer Phase 2/3 if needed |

---

## 7. Governance & Timeline (PID core)

### 7.1 Roles (recommended)
- **Product owner / founder** — you. Final decisions on scope, brand, monetization.
- **Tech lead (full-stack)** — owns architecture, deployment, security.
- **Editorial lead** (contract) — race-week coverage, 4–6 posts/wk.
- **Designer (part-time)** — locks design system, owns brand kit.
- **Mobile dev** (Phase 3) — Flutter/native.
- **Legal advisor** (retainer ~$200/mo) — pre-launch IP review, ongoing C&D handling.

### 7.2 Phase gates
- **Gate 1 — End of Week 2:** schema + ingest + design tokens locked.
- **Gate 2 — End of Week 6:** all factual surfaces (schedule/results/drivers/teams) usable.
- **Gate 3 — End of Week 10:** editorial CMS live, first 10 articles published.
- **Gate 4 — End of Week 12:** public beta. Lighthouse ≥ 90 perf/a11y/SEO.
- **Gate 5 — Month 6:** live timing + social. Soft monetization on.
- **Gate 6 — Month 12:** Android beta on Play Console.

### 7.3 Definition of done (per surface)
A page is "done" when:
- Schema-typed against shared `@apex/types` package.
- Server-rendered (or ISR), no client-only fallbacks for primary content.
- Mobile-first responsive, tested at 360 / 768 / 1024 / 1440 / 1920.
- Lighthouse perf ≥ 90 desktop, ≥ 80 mobile.
- All images have alt text; keyboard nav works; AXE 0 critical issues.
- Tracked: page-view + at least 2 interaction events.
- Documented in `docs/surfaces/<slug>.md`.

---

# PRD SECTION

## 8. Information Architecture (full sitemap)

```
/
├── /latest                              news listing (filters, infinite-scroll)
│   ├── /latest/article/[slug]           article detail (long-form, gallery, embeds)
│   ├── /latest/tag/[tag]                tag/topic listing
│   ├── /latest/author/[slug]            author archive
│   └── /latest/section/[section]        feature/analysis/quiz/guide
├── /video                               video index (rails by topic, search)
│   └── /video/[slug]                    video detail + transcript
├── /schedule                            current season schedule
│   ├── /schedule/[season]               historical season schedule
│   └── /schedule/[season]/[race]        race weekend detail (sessions, weather, circuit)
├── /results                             current season results landing
│   ├── /results/[season]/drivers        driver standings
│   ├── /results/[season]/teams          constructor standings
│   ├── /results/[season]/races          race-by-race results
│   ├── /results/[season]/[race]         single race result (qualifying + race + sprint)
│   ├── /results/archive                 multi-decade archive index
│   └── /results/awards                  hall of fame / awards
├── /drivers                             current grid
│   ├── /drivers/all                     full historical driver index
│   ├── /drivers/[slug]                  driver profile (bio, stats, career, gallery)
│   └── /drivers/hall-of-fame
├── /teams                               current constructor grid
│   ├── /teams/all
│   └── /teams/[slug]                    team profile (history, car, drivers, championships)
├── /live                                race-weekend live mode (Phase 2)
│   ├── /live/timing                     live timing dashboard
│   ├── /live/track                      track map + positions
│   └── /live/race-control               race control messages stream
├── /social                              social feed aggregation (Phase 2)
│   ├── /social/instagram                IG embeds, by hashtag / handle
│   ├── /social/youtube                  YT shorts + videos
│   └── /social/reddit                   r/formula1 best-of
├── /fantasy                             fantasy tools (Phase 2)
├── /search                              site-wide search (Meilisearch)
├── /account                             auth, prefs (Phase 2)
│   ├── /account/saved                   saved articles
│   ├── /account/teams                   followed teams
│   └── /account/notifications
├── /membership                          Apex+ (Phase 3)
├── /about
├── /legal/terms
├── /legal/privacy
├── /legal/disclaimer
└── /sitemap.xml
```

## 9. Surface-by-surface specifications

### 9.1 Homepage `/`

**Purpose:** entry point; serve "what happened, what's next, what to watch" in <1 viewport on desktop.

**Sections (top to bottom):**
1. `RaceTickerBar` — previous race result chip, current/upcoming race countdown chip, next race chip. Localized timezone.
2. `HeroLeadStory` — one large editorial card (image + title + dek + tag + read-time).
3. `HeroRail` — 4–5 side article cards (compact, image left or top).
4. `QuickLinks` — chips: Schedule, Standings, Drivers, Teams, Regulations.
5. `FeaturedVideoRail` — 6-card horizontal scroll, each with thumbnail, duration, title.
6. `EditorsPicks` — 8–12 cards, mixed sizes (asymmetric grid).
7. `StandingsPreview` — top-3 drivers + top-3 constructors with mini bar of points.
8. `HighlightsRail` — race highlight videos (YouTube embeds).
9. `SocialPulse` — 3-up: top IG / top YT short / top Reddit thread.
10. `CommerceStrip` — tickets + merch affiliate cards (Phase 2).
11. `PartnerBar` — only licensed partners (often empty initially).
12. `NewsletterCTA` — email capture.

**Data sources:** CMS (articles, videos, slots), OpenF1 (next race), Jolpica (standings).
**Caching:** ISR 60 s; SWR 300 s.
**Acceptance:** LCP ≤ 1.8 s desktop, ≤ 2.5 s mobile 4G. No layout shift.

### 9.2 Schedule `/schedule` and `/schedule/[season]`

**Purpose:** factual, dense, timezone-aware calendar.

**Components:**
- `SeasonSwitcher` — dropdown 1950 → current.
- `ScheduleSummary` — chips: total races, sprint races, completed, remaining.
- `RaceTimeline` — vertical timeline, one card per round.
  - Round number, circuit name, country, flag.
  - Local date range + user-localized.
  - Status badge: completed / live / upcoming.
  - Click → race detail.
- `NextRaceCountdown` — pinned top, ticks every second.

**Race card content:**
- Round, race official name (e.g., "Bahrain Grand Prix").
- Circuit name + length + corners.
- Session schedule (FP1, FP2, FP3, SQ?, S?, Q, R) with start time in user TZ.
- Weather forecast (OpenWeatherMap, race-week only).
- Quick links: results (if past), live (if today), preview (if upcoming).

**Data sources:** Jolpica `schedule/{season}`; OpenF1 `meetings`/`sessions` for sub-session timing.
**SEO:** structured data JSON-LD `SportsEvent` per session.
**Acceptance:** full season renders in ≤ 1.5 s on mobile; timezones match `Intl.DateTimeFormat` user locale; sprint vs. standard weekend visually distinct.

### 9.3 Race detail `/schedule/[season]/[race]` and `/results/[season]/[race]`

Combined detail page; tabs: Overview / Sessions / Qualifying / Sprint (if applicable) / Race / Pit Stops / Lap-by-Lap / Telemetry (Phase 2).

**Overview tab:**
- Circuit hero (own SVG map).
- Stats: laps, distance, lap record, last winner, most poles.
- Weather forecast or recap.
- Editorial preview/recap article (if exists).

**Race result tab:**
- `ResultsTable` columns: Pos, Driver (flag + code + name), Team (color strip), Laps, Time/Gap, Points, Fastest Lap.
- Mobile: collapsed to Pos/Driver/Time/Points; tap to expand.
- DNF/DSQ/DNS shown.
- Bonus: pit stops timeline strip, position-change line chart.

**Data sources:** Jolpica `{season}/{round}/results`, `qualifying`, `sprint`, `pitstops`, `laps`.

### 9.4 News listing `/latest`

- Sticky filter rail: section (news/feature/analysis/quiz/gallery), tag, team, driver, date range.
- Sort: latest / most-read.
- Article card variants: lead, compact, list, gallery.
- Pagination = infinite scroll w/ "load more" fallback; URL-paginated for SEO.
- Right rail (desktop): trending tags, top stories of week.

**Acceptance:** filters update URL; back/forward works; cards 16:9 ratio; lazy-load images.

### 9.5 Article detail `/latest/article/[slug]`

- Above-the-fold: hero image, title, dek, byline, published date, read-time, share buttons.
- Body: rich text (paragraphs, h2/h3, blockquotes, pull-quotes, inline images, embeds, code blocks for telemetry charts).
- Inline embeds supported: YouTube, Instagram, X/Twitter, native gallery, native chart, native standings widget.
- Right rail (desktop) / bottom (mobile): related articles, "more from author", driver/team callouts.
- Sticky footer share bar on mobile.
- Reading progress bar (top of viewport).

**Acceptance:** typography readable at 18px/1.6 mobile; embeds lazy-loaded via Intersection Observer; structured data `NewsArticle`; OpenGraph + Twitter card.

### 9.6 Driver standings `/results/[season]/drivers`

- `StandingsTable` columns: Pos, Driver (flag/code/name), Nationality, Team, Points, Wins, Podiums, Poles, FastestLaps.
- Sortable each column.
- Compare mode: select 2–4 drivers → side-by-side season chart.
- Mobile: collapse to Pos/Driver/Points; tap expand.
- Top-3 podium card visualization above table.

**Data source:** Jolpica `{season}/driverStandings`.

### 9.7 Constructor standings `/results/[season]/teams`

- Same pattern; team color strip; constructor logo only if licensed.
- Per-team: drivers, podiums, poles, fastest laps.

### 9.8 Drivers index `/drivers`

- Grid of current grid (20 cards): headshot, code, name, number, team color, points.
- Toggle: current grid / all-time legends / by country / by team.
- Filter chips by nationality, era, team.

### 9.9 Driver profile `/drivers/[slug]`

- Hero: full-body cutout (transparent PNG, our asset or Wikimedia Commons-licensed) + name + number + team strip.
- Bio (our editorial).
- Career stats card: starts, wins, podiums, poles, FLs, points, championships.
- Season-by-season table.
- Race-by-race results for current season.
- Helmet & livery gallery.
- Related articles, related drivers.

### 9.10 Teams index `/teams`

- 10 cards, each: livery image, name, base, principal, power unit, championships.

### 9.11 Team profile `/teams/[slug]`

- Hero: car (rendered) + team color strip + championships count.
- Founding year, base, principal, technical chief, drivers (current + alumni).
- Constructors' championships timeline.
- Season-by-season points + position chart.
- Related articles.

### 9.12 Video index `/video` and `/video/[slug]`

- Rails: latest, race highlights, behind-the-scenes, technical analysis, driver interviews.
- Each card: thumbnail (YouTube), duration, title, channel.
- Detail page: embedded player + description + chapters + transcript (auto-generated via Whisper if we host original; YouTube provides captions otherwise) + related.

### 9.13 Live timing `/live/timing` (Phase 2)

- `TimingTower` table — Pos / # / Driver / Gap / Interval / Last lap / Sector 1 / Sector 2 / Sector 3 / Tyre / Stint laps / Pit count.
- Sector colors: purple = personal best of session, green = personal best, yellow = slower.
- Tyre icons: soft/medium/hard/intermediate/wet.
- `TrackMap` — SVG of circuit with driver dots updating via WebSocket.
- `RaceControlFeed` — chronological messages.
- `WeatherStrip` — temp, track temp, humidity, wind, rain probability.
- `PositionsChart` — 20-line chart, x=lap, y=position.

**Data:** OpenF1 (WebSocket-style polling or own SignalR adapter via worker).
**Acceptance:** sub-2-second update latency from session start; degrades gracefully to 5 s polling on slow networks.

### 9.14 Search `/search`

- Meilisearch index over articles + videos + drivers + teams + races.
- Instant search (debounce 150ms).
- Filters by content type.
- Recent searches (local-storage), trending queries (server-side).

### 9.15 Account `/account` (Phase 2)

- Email + OAuth (Google, Apple, X).
- Saved articles, followed drivers/teams, notification preferences (race start, qualifying start, BREAKING news, driver-X news).
- Region / language / timezone overrides.

---

## 10. Component library (atomic)

**Atoms:** Button, IconButton, Chip, Badge, Avatar, Flag, TeamColorStrip, TyreIcon, NumberDigits (mono), Spinner, Skeleton, Divider.

**Molecules:** ArticleCard (Lead/Compact/List/Gallery/Editorial), VideoCard, DriverCard (Mini/Profile/Hero), TeamCard, RaceCard, StandingsRow, SessionRow, LapRow, RaceControlMessage, WeatherChip, EmbedYouTube, EmbedInstagram, EmbedTweet, RelatedTile, CommercePromoCard, PartnerLogo, AdSlot, NewsletterForm.

**Organisms:** AppShell (TopUtilityBar + RaceTickerBar + MegaNav + Footer), HeroBlock, ArticleRail, VideoRail, StandingsTable, ResultsTable, SessionSchedule, TimingTower, TrackMap, RaceControlFeed, PositionsChart, FilterBar, SearchPanel, ConsentBanner, GalleryLightbox.

**Templates:** HomePage, ArticleListPage, ArticleDetailPage, SchedulePage, RaceDetailPage, StandingsPage, DriverIndexPage, DriverDetailPage, TeamIndexPage, TeamDetailPage, VideoIndexPage, LiveTimingPage, AccountPage.

Each component lives in `apps/web/src/components/` and has: TS types, Storybook story, unit test (Vitest), visual regression snapshot (Playwright).

---

## 11. Data model (Postgres / Drizzle)

```
season(id, year, status)
race(id, season_id, round, slug, name, official_name, country, city, circuit_id, date_start, date_end, timezone, is_sprint, status)
circuit(id, slug, name, country, location, length_km, corners, lap_record_time, lap_record_holder, lap_record_year, svg_path, image_id)
session(id, race_id, kind, scheduled_start, scheduled_end, actual_start, actual_end, status)  -- FP1/FP2/FP3/SQ/S/Q/R
driver(id, slug, code, number, first_name, last_name, full_name, nationality, dob, team_id_current, headshot_image_id, helmet_image_id, profile_image_id, bio_md, wiki_url, debut_year, retired_year)
team(id, slug, name, base, principal, technical_chief, power_unit, founded_year, color_hex, logo_image_id, car_image_id, livery_image_id)
driver_team_history(id, driver_id, team_id, season_id, role)
result(id, race_id, driver_id, team_id, position, position_text, points, laps, time_ms, gap_to_leader, status, grid, fastest_lap_rank, fastest_lap_time_ms, fastest_lap_lap)
qualifying(id, race_id, driver_id, q1_ms, q2_ms, q3_ms, position)
sprint_result(id, race_id, driver_id, position, points, time_ms, status)
pit_stop(id, race_id, driver_id, lap, time_of_day, duration_ms)
lap(id, race_id, driver_id, lap_number, position, time_ms)
standings_driver(id, season_id, driver_id, round, position, points, wins)
standings_team(id, season_id, team_id, round, position, points, wins)
article(id, slug, title, dek, body_md, author_id, hero_image_id, thumb_image_id, type, section, published_at, updated_at, embargo_until, is_breaking, is_pinned, is_premium, seo_title, seo_description, og_image_id)
article_tag(article_id, tag_id)
article_driver(article_id, driver_id)
article_team(article_id, team_id)
article_race(article_id, race_id)
tag(id, slug, label, kind)
author(id, slug, name, bio_md, avatar_image_id, twitter, instagram)
video(id, slug, provider, provider_asset_id, title, description_md, duration_s, thumbnail_image_id, embed_url, hls_url, availability, race_id, session_id, published_at)
image(id, kind, original_url, width, height, alt_text, focal_x, focal_y, license, attribution, blurhash)
embed_record(id, kind, url, provider_id, html, fetched_at)  -- IG, YT, X cache
nav_group(id, slug, label, order)
nav_link(id, group_id, label, href, is_external, badge, order)
partner(id, name, tier, logo_image_id, url, license_status)
user(id, email, hash, oauth_provider, display_name, locale, timezone, created_at)
follow(user_id, entity_kind, entity_id, created_at)
saved(user_id, content_kind, content_id, created_at)
notification_pref(user_id, channel, race_start, qual_start, breaking, drivers[], teams[])
event_log(id, ts, user_id, anonymous_id, name, props_jsonb)
ingestion_run(id, source, started_at, ended_at, status, items_in, items_out, error)
```

Indexes: race(season_id, round); result(race_id, position); standings_driver(season_id, round); article(published_at desc, type); video(published_at desc); event_log(ts desc, name).

Materialized views: `mv_homepage_standings_preview`, `mv_active_race_card`, `mv_season_quickstats`.

---

## 12. External APIs — catalog & integration plan

### 12.1 Jolpica-F1 (historical, Ergast successor)
- Base: `https://api.jolpi.ca/ergast/f1/`
- Endpoints used: `{season}.json`, `{season}/{round}/results.json`, `{season}/qualifying.json`, `{season}/sprint.json`, `{season}/driverStandings.json`, `{season}/constructorStandings.json`, `{season}/{round}/laps.json`, `{season}/{round}/pitstops.json`, `drivers.json`, `constructors.json`, `circuits.json`.
- Rate: ~4 req/sec, ~500/day burst.
- Strategy: nightly cron full-season sync into our DB; live-race day no direct calls (use OpenF1 for live).

### 12.2 OpenF1 (live + recent)
- Base: `https://api.openf1.org/v1/`
- Endpoints: `meetings`, `sessions`, `drivers`, `intervals`, `laps`, `stints`, `position`, `race_control`, `weather`, `car_data`, `pit`, `team_radio`.
- Rate: per-IP, several req/sec; no auth.
- Strategy: race-weekend workers poll every 1–5 s; cache snapshots in Redis with short TTL; expose to clients via our own WebSocket / SSE.

### 12.3 FastF1 (Python ingest layer)
- Use in `ingest-historical-telemetry` worker only. Cache parquet files in R2.
- Source for telemetry replays in Phase 2.

### 12.4 YouTube Data API v3
- Project in Google Cloud Console; key in env.
- Endpoints: `search.list`, `videos.list`, `playlistItems.list`, `channels.list`.
- Quota: 10,000 units/day default; `search.list` = 100 units; `videos.list` = 1 unit.
- Strategy: nightly poll of curated channels (F1, official team channels, Chain Bear, WTF1, F1 Beyond the Grid, Tommo F1, etc.) for new uploads; cache `videos.list` outputs 24 h; never call `search.list` from runtime requests.
- Embedding: iframe API client-side, no quota.

### 12.5 Instagram Graph API
- Requires Facebook App + Instagram Business or Creator account + Meta review.
- Endpoints: `IG User Insights`, `IG Hashtag Search` (limited — hashtag-id → recent/top media), `IG Media oEmbed`.
- Quota: 30 hashtag queries / hour / IG user; 4800 total IG-User calls / hour.
- 2024 restrictions: hashtag search returns limited public results; full firehose is private.
- Strategy:
  - Tier 1: editorial curates handles/posts; we store `embed_record` via oEmbed; render iframe embed.
  - Tier 2 (if approved): hashtag pull for `#F1`, `#Formula1`, `#<driverFirstLast>` every 30 min into curation queue; human approves before publish.
  - Tier 3 fallback: third-party tools (Iconosquare, Phantombuster — paid, with ToS care).

### 12.6 Reddit
- Public JSON endpoints `https://www.reddit.com/r/formula1/{top,hot,new}.json?limit=25` + OAuth for higher rate.
- Strategy: poll top of `r/formula1` every 10 min; surface top-3 on home / `/social/reddit`.

### 12.7 X / Twitter
- API v2 paid; we will not depend on it. Use blockquote+script `https://platform.twitter.com/widgets.js` for user-supplied URLs.

### 12.8 TikTok
- Display API for embeds; we will use oEmbed only for curated handles.

### 12.9 Wikipedia + Wikidata
- REST `/api/rest_v1/page/summary/{title}`; SPARQL `https://query.wikidata.org/sparql`.
- Use for: driver birthplaces, photos (commons), helmet histories, team founding years.
- Attribution required (CC-BY-SA).

### 12.10 OpenWeatherMap
- `/data/3.0/onecall` per race circuit lat/long for race week.
- Free tier ~1000 calls/day → poll hourly during race week.

### 12.11 Cloudinary / Cloudflare Images
- For our own uploaded assets. Define transform presets (see §13).

### 12.12 Resend
- Transactional + newsletter sends.

### 12.13 PostHog
- Server-side event ingest API + JS lib client-side.

### 12.14 Push (Phase 2/3)
- Web Push (VAPID); FCM for Android; APNs for iOS via Firebase.

### 12.15 oEmbed providers used
- YouTube `https://www.youtube.com/oembed?url=...`
- Instagram `https://graph.facebook.com/v18.0/instagram_oembed?url=...&access_token=...`
- X `https://publish.twitter.com/oembed?url=...`
- TikTok `https://www.tiktok.com/oembed?url=...`
- Reddit `https://www.reddit.com/oembed?url=...`

---

## 13. Media pipeline

### 13.1 Upload flow
1. Editor uploads original to `/admin/upload` → signed URL → Cloudflare R2 bucket `originals/`.
2. Worker: probe with `sharp` → write `image` row with width/height/blurhash/EXIF stripped.
3. Editor sets focal point (north/south/center/coords), alt text, license, attribution.
4. Variants generated on-demand by Cloudflare Images / Next.js Image.

### 13.2 Transform presets
- `hero_16x9`: 1584w / 891h, focal-aware crop.
- `card_16x9`: 352w/704w/1056w srcset.
- `square_thumb`: 192x192 face-center.
- `driver_head`: 128w transparent webp.
- `team_car`: 512w transparent webp.
- `partner_logo`: trim, fit 160x90.
- `og`: 1200x630 with title overlay.

### 13.3 Video
- Phase 1: YouTube embeds only.
- Phase 2: if we record original video, use Cloudflare Stream — $1/1000 min storage, $1/1000 min delivery. Provide HLS manifest.

---

## 14. Real-time architecture

### 14.1 Live timing pipeline
```
OpenF1 polling worker (Fly.io VM)
  ↓ writes
Redis (Upstash) — snapshot keys: lt:<session_id>:tower, lt:<session_id>:positions, lt:<session_id>:rc
  ↓ pubsub
WebSocket fan-out (Next.js + ws on /api/live)
  ↓
Client subscribes by session_id
```

### 14.2 Fallback
- If WS fails, client polls `/api/live/snapshot?session_id=...` every 5 s.
- Banner: "Data delayed — live feed reconnecting."

### 14.3 Telemetry replays (Phase 2)
- FastF1 worker generates `lap_telemetry_<season>_<round>_<driver>.parquet` → R2.
- Client uses DuckDB-wasm or Apache Arrow JS to render charts client-side.

---

## 15. Auth & subscriptions

### 15.1 Auth (Phase 2)
- Supabase Auth: email magic link + Google + Apple + X.
- Anonymous viewer = no friction (default).
- Logged-in adds: save, follow, notif prefs, comment (Phase 3?).

### 15.2 Apex+ subscription (Phase 3)
- Stripe + Stripe Tax.
- Tiers: Free / Apex+ ($4.99/mo or $49/yr).
- Apex+ unlocks: ad-free, telemetry replays, fantasy projections, full archive deep-search, push priority.

---

## 16. Tech stack (final recommendation)

| Layer | Choice | Why |
|---|---|---|
| Web framework | Next.js 15 App Router | SSR/ISR, RSC for big payloads, Vercel optimized |
| Language | TypeScript strict | Type safety + shared types across web/mobile |
| Styling | Tailwind v4 + project design tokens | Already in use, no build delta |
| UI primitives | Radix UI + own components | Accessible defaults |
| Motion | GSAP + ScrollTrigger | Premium scroll/pin (already in stack) |
| DB | Postgres 16 on Supabase | Auth + storage + realtime in one |
| ORM | Drizzle | Edge-runtime safe, SQL-first |
| Cache | Redis on Upstash | HTTP, edge-friendly |
| Queue / cron | Trigger.dev v3 | Managed, TS-native |
| Search | Meilisearch Cloud | Cheap, fast typo-tolerant |
| Object storage | Cloudflare R2 | No egress fees |
| Image transforms | Cloudflare Images / Next.js Image | Cheap |
| Email | Resend | Reliable, dev-friendly |
| Errors | Sentry | De facto |
| Analytics | PostHog | Open + product analytics + feature flags |
| Uptime | Better Stack | Status page bundled |
| Hosting | Vercel (web) + Fly.io (workers) | Pragmatic |
| Mobile | Flutter + Riverpod | Single codebase, near-native, fast |
| Push | FCM (Android) + APNs (iOS) via Firebase | Cross-platform |
| Editor / CMS | Custom admin in `apps/admin` (TipTap) | Bespoke control |
| Auth | Supabase Auth | Integrated |
| Payments | Stripe | Standard |

Monorepo via Turborepo: `apps/web`, `apps/admin`, `apps/mobile`, `packages/types`, `packages/ui`, `packages/api-client`, `packages/ingest`.

---

## 17. Performance budgets

| Metric | Target (mobile 4G) | Target (desktop) |
|---|---|---|
| LCP | ≤ 2.5 s | ≤ 1.8 s |
| INP | ≤ 200 ms | ≤ 150 ms |
| CLS | ≤ 0.05 | ≤ 0.02 |
| TTFB (ISR hit) | ≤ 300 ms | ≤ 150 ms |
| JS bundle homepage | ≤ 180 KB gz | ≤ 220 KB gz |
| Image weight per card | ≤ 30 KB AVIF | ≤ 50 KB AVIF |
| Lighthouse perf | ≥ 80 | ≥ 90 |
| Lighthouse a11y | ≥ 95 | ≥ 95 |
| Lighthouse SEO | ≥ 95 | ≥ 95 |

Enforced via Lighthouse CI in GitHub Actions on every PR.

---

## 18. SEO

- Server-rendered HTML (no client-only content for primary text).
- Per-page structured data:
  - Homepage: `WebSite` + `SearchAction`.
  - Article: `NewsArticle` + `BreadcrumbList`.
  - Schedule: `ItemList` of `SportsEvent`.
  - Race detail: `SportsEvent` + `SportsTeam` + `Person` participants.
  - Driver: `Person`.
  - Team: `SportsTeam`.
- Sitemaps: split by type (`/sitemap-articles.xml`, `/sitemap-races.xml`, `/sitemap-drivers.xml`, `/sitemap-teams.xml`), index at `/sitemap.xml`.
- Canonical URLs on every page.
- OpenGraph + Twitter card per page (auto-OG image with title overlay).
- `robots.txt` allow all; disallow `/account`, `/admin`, `/api`.
- hreflang for `en`, `es`, `pt-br` (Phase 2 localization).

---

## 19. Accessibility

- WCAG 2.2 AA target.
- Keyboard nav for mega nav, modal, tables.
- ARIA: live region for live-timing updates (`aria-live="polite"`).
- Focus rings visible always.
- Color contrast ≥ 4.5:1 on all text. Audit `telemetry-red` text on dark — must use as accent on chip backgrounds, not as body text color.
- Alt text required on every image (CMS validation blocks publish if missing).
- Skip-to-content link.
- Tested with AXE + Lighthouse + manual NVDA pass before launch.

---

## 20. Analytics & events

### 20.1 Pageview
- Auto on each route change; props: `route`, `season`, `race_id`, `driver_id`, `team_id` (where applicable), `referrer`, `experiment_buckets`.

### 20.2 Interaction events
- `nav_click` { group, label, href }
- `article_card_click` { article_id, position, surface }
- `video_play` / `video_complete` { video_id, provider, surface }
- `race_ticker_click` { state, race_id }
- `standings_view_all` { season, kind }
- `partner_click` { partner_id, tier }
- `commerce_click` { affiliate, sku }
- `load_more` { surface, page }
- `search` { query_len, results_count }
- `filter_change` { surface, key, value }
- `embed_view` { kind, provider }
- `account_signup` / `account_login` { method }
- `notification_subscribe` { topic }
- `live_session_join` / `live_session_leave` { session_id }
- `error_boundary` { component, message }

All events flow client → PostHog + server-side mirror to `event_log` table.

### 20.3 KPIs
- North-star: weekly active sessions per user.
- Acquisition: organic search %, referral %, direct %, social %.
- Activation: % first-time users who view ≥ 3 pages.
- Retention: D1/D7/D28.
- Race-weekend: peak concurrent + session-duration.
- Revenue (Phase 2+): RPM, affiliate CTR, subscription conv.

---

## 21. Design system (link)

Source of truth lives in `.claude/design-system.md`. Summary:
- Dark theme only. Background `#141313`. Asphalt `#262626`. Brand `telemetry-red #E10600`.
- Fonts: Anybody (display 700/800), Hanken Grotesk (body 400), EB Garamond (editorial 300), JetBrains Mono (telemetry 500).
- Material Symbols Outlined icons.
- Anti-patterns banned: light mode, 3-up emoji feature cards, generic indigo/purple, gradient text headers.
- Motion: scroll-pinned hero (GSAP), 600ms ease-out cubic curve, GPU-only transforms.

Each component pulls tokens from `.claude/design-system.md` verbatim. Color drift = build fail.

---

## 22. Mobile app (Phase 3)

### 22.1 Framework decision
**Recommend Flutter 3 + Riverpod + GoRouter + Dio + Hive (offline) + Firebase (push + crashlytics + analytics).**

Rationale:
- Single codebase for Android + iOS.
- Near-native UI smoothness on 60/120 Hz.
- F1 news app is image + scroll heavy → Flutter shines.
- Hot reload + good testing story.
- Cheaper than two native teams.

Alternatives kept on table: React Native Expo (share TS code with web), native Kotlin Compose first then Swift later (best UX, slowest delivery).

### 22.2 Core screens (Android first)
1. **Onboarding** — pick favorite team(s), pick favorite driver(s), enable notifications, timezone autodetect.
2. **Today** — Inshorts-style vertical swipeable cards: race countdown / breaking news / standings tile / featured video / top reddit / top IG.
3. **Race Hub** — current/next race detail; tabs Overview / Schedule / Weather / Results / Live (race day).
4. **Live Mode** — opens on race day automatically; timing tower + track map + race control feed; full-screen optimized for landscape too.
5. **News** — list view; filter by team/driver/topic; offline cache last 50 articles.
6. **Standings** — drivers/teams toggle; compare mode.
7. **Drivers / Teams** — index + profile.
8. **Search** — instant.
9. **Saved** — saved articles / followed entities.
10. **Settings** — notifications, region, units (km vs mi), Apex+ upsell, about, legal.
11. **Profile** — auth, prefs.

### 22.3 Push categories (Android channels)
- `race_start` — high importance, sound.
- `qualifying_start` — high.
- `breaking_news` — high.
- `driver_news` (filtered by follows) — default.
- `team_news` (filtered) — default.
- `editorial_picks` — low.

### 22.4 Offline / sync
- Hive local DB caches: last 100 articles, current season schedule/results/standings, followed entities.
- On app open: sync delta endpoint `/api/v1/sync?since=<ts>` returning changed entities.

### 22.5 Mobile-specific UX
- Bottom tab: Today / Live / Standings / News / Saved.
- Pull-to-refresh on every list.
- Haptics on important actions (race start, breaking news arrival).
- Adaptive icon + monochrome themed for Android 13+.

### 22.6 App store
- Name: Apex F1 Hub (or final brand). Subtitle clarifies unofficial.
- Icon: own mark; no F1 logos.
- Screenshots: original UI, no F1.com captures.
- Listing description ends with disclaimer.
- Play Store: Sports category. App Store: Sports.

---

## 23. Sprint roadmap (week-by-week — first 12 weeks)

### Week 1 — Foundation
- Monorepo scaffold (Turborepo, pnpm).
- Postgres on Supabase, Drizzle schema migration 0001 (all tables in §11).
- Cloudflare R2 + Images set up.
- Vercel project + envs.
- Design tokens locked in shared `packages/ui`.
- Storybook running.
- Disclaimer copy + legal pages drafted.

### Week 2 — Ingestion + brand
- Jolpica nightly cron for current season schedule/drivers/teams/results.
- OpenF1 polling worker (dev mode only).
- Wikidata SPARQL one-off seed for driver/team metadata.
- Brand naming locked (see §28).
- Logo + favicon shipped.

### Week 3 — Shell
- AppShell, TopUtilityBar, RaceTickerBar (live data), MegaNav, Footer.
- Cookie consent banner.
- Lighthouse CI in PRs.

### Week 4 — Homepage + schedule
- Homepage slots (hero / rail / quick / standings / partner).
- Schedule page (current season).
- Race detail page (overview tab).

### Week 5 — Results
- Driver standings.
- Team standings.
- Race detail tabs (qualifying / race / sprint).
- Pit stops + lap-by-lap.

### Week 6 — Drivers + teams
- Drivers index + profile.
- Teams index + profile.
- Helmet/livery gallery (seeded from Commons).

### Week 7 — News system
- Admin CMS scaffold (`apps/admin`).
- Article CRUD + TipTap editor.
- `/latest` listing + filters.
- Article detail page.
- 10 articles seeded.

### Week 8 — Video
- YouTube ingest worker (curated channels).
- Video index + detail.
- Embed components.

### Week 9 — Search + sitemap + structured data
- Meilisearch index pipeline.
- `/search` UI.
- Sitemaps + JSON-LD.

### Week 10 — Polish
- Mobile responsive sweep.
- AXE pass.
- Lighthouse pass.
- Error boundaries + 404/500 pages.
- Analytics events wired.

### Week 11 — QA + load test
- k6 load test homepage + standings + race detail at 1k RPS.
- Sentry alerts tuned.
- Status page live.

### Week 12 — Public beta launch
- Soft launch to email list.
- Twitter/X + Reddit r/formula1 announce (respecting subreddit rules).
- Newsletter live.
- First race-weekend monitoring rota.

### Phase 2 — Months 4–8
- M4: live timing pipeline + UI.
- M5: telemetry replays + position chart.
- M6: account system + push (web push).
- M7: social aggregation (IG/YT/Reddit).
- M8: ads + affiliate + first revenue.

### Phase 3 — Months 9–12
- M9: Flutter scaffold + auth + shell.
- M10: Today + News + Standings.
- M11: Live Mode + push channels.
- M12: Android beta on Play Console.

---

## 24. Acceptance criteria (per-phase gate)

### Phase 1 gate (Week 12)
- [ ] All 13 Phase-1 routes shipped + indexed.
- [ ] Lighthouse desktop perf ≥ 90, mobile ≥ 80, a11y ≥ 95, SEO ≥ 95.
- [ ] Cookie consent + disclaimer + privacy + terms live.
- [ ] At least 30 original articles published.
- [ ] Newsletter ≥ 500 subs.
- [ ] No critical Sentry issues open.
- [ ] Load test passes 1k RPS.

### Phase 2 gate (Month 8)
- [ ] Live timing latency p95 ≤ 3 s.
- [ ] Push opt-in rate ≥ 12% of logged-in users.
- [ ] MAU ≥ 25k.
- [ ] Ad RPM measured, affiliate clicks tracked.

### Phase 3 gate (Month 12)
- [ ] Android app on Play Console (open beta).
- [ ] Crash-free sessions ≥ 99.5%.
- [ ] Cold start < 2 s on mid-tier Android.
- [ ] 10k installs.

---

## 25. Anti-patterns (what NOT to do)

- Don't proxy `media.formula1.com` images. Ever.
- Don't scrape Formula1.com pages.
- Don't show team logos until license is signed; use colored strip + text instead.
- Don't put "F1" in the domain or app icon.
- Don't gate factual data (schedule/results) behind subscription.
- Don't auto-play video with sound.
- Don't use carousel-as-hero with auto-advance — accessibility nightmare.
- Don't ship pages that take >300 ms TTFB on cold ISR.
- Don't depend on a single API (multi-source fallback for schedule/results).
- Don't store PII in event logs.
- Don't put copyrighted lyrics, F1 article text, or commentary text inside CMS.
- Don't use AI to write driver bios without human review + fact-check.

---

## 26. Glossary

- **DRS** — Drag Reduction System.
- **FP1/FP2/FP3** — Free Practice sessions.
- **SQ / Sprint** — Sprint Qualifying / Sprint race (sprint weekends).
- **Q1/Q2/Q3** — Qualifying knockout stages.
- **Pole** — fastest qualifying position.
- **FL** — Fastest Lap.
- **Stint** — continuous run on one tyre set.
- **Pit lane / Parc Fermé** — restricted setup time after qualifying.
- **Undercut / Overcut** — pit strategy moves.
- **DNF / DSQ / DNS** — Did Not Finish / Disqualified / Did Not Start.
- **JTBD** — Jobs To Be Done.
- **PID** — Project Initiation Document (governance).
- **PRD** — Product Requirements Document (what to build).
- **ISR** — Incremental Static Regeneration.
- **SWR** — Stale-While-Revalidate.
- **RSC** — React Server Component.
- **LCP / INP / CLS** — Core Web Vitals.

---

## 27. Appendices

### A. Repo layout (proposed)
```
apex/
├── apps/
│   ├── web/                 Next.js public site
│   ├── admin/               CMS (Next.js, role-gated)
│   └── mobile/              Flutter (Phase 3)
├── packages/
│   ├── ui/                  shared components + design tokens
│   ├── types/               shared TS types (DB rows, API shapes)
│   ├── api-client/          typed fetchers for Jolpica/OpenF1/YT/IG/etc.
│   ├── ingest/              workers: ingest-jolpica, ingest-openf1, ingest-yt, ingest-ig, ingest-reddit, ingest-weather
│   └── live/                live-timing snapshot + WS server
├── infra/
│   ├── drizzle/             migrations
│   ├── ci/                  GH Actions
│   └── ops/                 Fly.io / Vercel / R2 configs
└── docs/                    surface docs, runbooks
```

### B. Environment variables (sketch)
```
DATABASE_URL=
REDIS_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=
CLOUDFLARE_IMAGES_TOKEN=
YOUTUBE_API_KEY=
META_APP_ID=
META_APP_SECRET=
IG_ACCESS_TOKEN=
OWM_API_KEY=
RESEND_API_KEY=
SENTRY_DSN=
POSTHOG_KEY=
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_DISCLAIMER_VARIANT=
```

### C. Sample Jolpica fetch
```ts
const url = `https://api.jolpi.ca/ergast/f1/${season}/driverStandings.json`;
const data = await fetch(url, { next: { revalidate: 60 } }).then(r => r.json());
const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
```

### D. Sample OpenF1 polling worker (pseudo)
```ts
const session = await fetch('https://api.openf1.org/v1/sessions?session_key=latest').then(r => r.json());
const tower = await fetch(`https://api.openf1.org/v1/intervals?session_key=${session.session_key}`).then(r => r.json());
await redis.setex(`lt:${session.session_key}:tower`, 5, JSON.stringify(tower));
```

### E. SEO JSON-LD example (race detail)
```json
{
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "Round 5 — National Grand Prix 2026",
  "startDate": "2026-05-23T13:00:00Z",
  "endDate": "2026-05-25T15:00:00Z",
  "location": { "@type": "Place", "name": "Apex Circuit", "address": "..." },
  "sport": "Motorsport",
  "url": "https://apex.tld/schedule/2026/round-5"
}
```

---

## 28. Open Decisions (need user input before build)

Mark each ✅ when answered.

| # | Decision | Options | Default if no answer |
|---|---|---|---|
| D1 | **Brand name** for the project | Apex / Apex F1 Hub / Paddock / Pitwall / Slipstream / DRS / other | Apex |
| D2 | **Mobile framework** | Flutter / React Native Expo / native Kotlin then Swift | Flutter |
| D3 | **Geo target** | Global EN / India-first (Hindi later) / EU-first | Global EN |
| D4 | **Monetization at launch** | Free + ads / Free no ads (delay) / Freemium w/ Apex+ from day 1 | Free no ads at MVP, ads in Phase 2 |
| D5 | **Editorial team** | Solo founder / 1 contract writer / 2-person editorial | 1 contract writer |
| D6 | **Hosting** | Vercel + Supabase + R2 / All Cloudflare (Workers + D1 + R2) / Self-host on Hetzner | Vercel + Supabase + R2 |
| D7 | **Live timing source** | OpenF1 only / OpenF1 + own SignalR adapter / FastF1 backend | OpenF1 only |
| D8 | **Subscription timing** | Day 1 / Month 6 / Year 2 | Month 6 |
| D9 | **Instagram strategy** | Editorial-curated only / Hashtag-pull (needs Meta approval) / Skip IG | Editorial-curated only |
| D10 | **Logo licensing** | Pursue partnerships for team logos / use color strips only | Color strips only initially |
| D11 | **Domain TLD preference** | .com / .gg / .app / .io / .racing | .com |
| D12 | **Language scope at launch** | English only / EN + ES + PT-BR | English only |
| D13 | **Community / comments** | None / Disqus / Native (Phase 3) | None at MVP |
| D14 | **Race-day live mode default route** | `/live` opens to timing / opens to track-map / opens to race-control | `/live/timing` |
| D15 | **Push web v. native first** | Web push at MVP / wait until mobile | Web push Phase 2 |

---

## 29. Next actions (post-PID approval)

1. **You**: answer D1–D15 (or accept defaults).
2. **You**: confirm budget envelope (~$150/mo MVP, scaling).
3. **You**: register domain + Vercel + Supabase + Cloudflare accounts.
4. **Me/agent**: write `docs/runbooks/race-weekend.md`, `docs/runbooks/ingest-failure.md`.
5. **Me/agent**: scaffold Turborepo + `apps/web` + `packages/ui` + `infra/drizzle/0001_init.sql` (PR-1).
6. **Me/agent**: implement Jolpica ingest worker (PR-2).
7. **Me/agent**: implement AppShell + RaceTickerBar (PR-3).
8. Continue weekly per §23 roadmap.

---

## 30. Quick definitions you asked

- **PID (Project Initiation Document)** — the formal kick-off doc for a project. It defines *why* the project exists, *who* is involved, *what* the scope is, *when* it will happen, *how* much it costs, and *what risks* exist. PRINCE2 / PMI terminology. It's a governance + business-case artifact. You hand it to a sponsor / investor / board.
- **PRD (Product Requirements Document)** — defines *what the product does*. User flows, features, surfaces, components, acceptance criteria. Engineering team builds from this. Lighter on business case, heavier on UX/UI/API spec.
- This file combines both: §1–7 are PID-style; §8–22 are PRD-style; §23–29 bridge them.

---

*End of document. v1 draft. Update via PRs to this file.*
