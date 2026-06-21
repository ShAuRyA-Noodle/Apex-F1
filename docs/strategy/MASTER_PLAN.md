# APEX — MASTER EXECUTION PLAN

*Synthesized from 8 strategic deep-dives. Prepared 2026-06-22 for ShAuRyA. Phase A shipped, Phase B foundation live. Stack locked: Next.js 16 + Turborepo + Tailwind v4 + Lenis/GSAP/Framer Motion + Drizzle/Supabase. 12/12 Jolpica routes green.*

---

## 1. NORTH STAR

Apex is the **premium, independent, telemetry-grade F1 fan platform** built for the person who pauses the broadcast at lap 28 to check the gap chart — sitting cleanly between sanitized official media (Formula1.com) and chaotic Reddit/Discord, with Apple-grade design as the cheap-to-build, hard-to-copy moat. The $20-100M outcome is won by (a) building owned distribution — a 100k+ newsletter list independent of Google/Meta/X algorithms — alongside (b) two compounding habit loops (Sunday race-day Pulse, Thursday Grid Prediction Market) that anchor weekly returning users. Solo bootstrap through M9, raise only to compress timeline on a known opportunity, and surface to two strategic acquirers (NYT/Athletic + Motorsport Network or Liberty itself) by Y3 to engineer competitive tension.

---

## 2. THE 10 MOST IMPORTANT DECISIONS

### 1. Apex+ paid tier launch timing
- **Options:** Day-1 paid / M9 launch / M12 launch / freemium-forever
- **Recommendation:** Hybrid — **Founding Member offer ($29 lifetime, capped at 1000) at M3**, **full Apex+ ($4.99/mo / $49/yr) at M9**.
- **Reasoning:** Founding Member generates $29k of zero-CAC operating cash and a 1000-fan evangelist Discord without committing to monthly billing complexity (monetization-growth §4.3). Full Apex+ waits until M9 so MAU and content depth justify the paywall (M9 ≈ 87k MAU per forecast).

### 2. Brand domain + name
- **Options:** apex.gg (gaming halo, short, $30/yr) / apex.racing (motorsport TLD) / apex-f1.com (FOM TM exposure) / pivot name entirely
- **Recommendation:** **apex.gg as primary canonical, apex.racing redirect**.
- **Reasoning:** legal-risk §3.3 rules out any `*f1*` domain (direct FOM trademark exposure). File USPTO Class 41 ITU this month to lock priority before any press.

### 3. Live timing strategy
- **Options:** Build full WebSocket pipeline Phase C / OpenF1 polling fallback / skip live, post-session results only
- **Recommendation:** **Build it (Phase C, weeks 10-12)** but accept OpenF1 risk and architect Jolpica-only fallback from day one.
- **Reasoning:** Live race-day Pulse is the #1 retention anchor (product-depth §5.1.6). Without it, Apex is just another blog. Mitigation: graceful degrade to snapshot polling + "live data delayed" banner if OpenF1 brownouts (legal-risk R24).

### 4. Raise or bootstrap
- **Options:** Bootstrap to exit / Angel $250-500k at M9-M12 / Seed $1-3M at M18 / Series A $5-8M at M30
- **Recommendation:** **Bootstrap M1-M18. Only consider seed at M18+ with hard metrics (250k MAU, $50k MRR, 35% WAU/MAU).**
- **Reasoning:** moat-exit §9 + monetization §6: every dollar of dilution at <$5M valuation costs 5-20× at exit. Free-tier infra makes $148/mo OpEx feasible. Capital is fuel not oxygen.

### 5. Editorial hire #1 timing
- **Options:** Solo through Year 1 / Contract writer M1 / Full-time editor M6 / M12
- **Recommendation:** **Contract writer #1 by Week 4 (£350-£500/piece). Full-time editor M6 (from Founding-Member cash).**
- **Reasoning:** editorial §11: founder cannot sustain 5+/week + ops + sponsor sales. Bottleneck is editorial throughput per product-depth closing. Hire from The Race contributor pool or r/F1Technical top-flair engineers.

### 6. Which killer feature to build first
- **Options:** Pulse (live race day) / Grid Prediction Market / Ghost Lap / Tifosi profile / Archive OS
- **Recommendation:** **Grid Prediction Market MVP first (weeks 8-9 in Phase B), then Ghost Lap MVP (weeks 11-12), then Pulse in Phase C.**
- **Reasoning:** product-depth ranks Grid Market as #1 for retention impact × build complexity. Pulse depends on auth + live WS infra (Phase C). Grid runs on Jolpica we already have.

### 7. Spoiler-safe mode default
- **Options:** ON by default / OFF by default / no spoiler mode
- **Recommendation:** **Ship spoiler-safe toggle in user profile, default OFF, prominent in onboarding.**
- **Reasoning:** ux-cinematic §5.4 — this is the kind of design detail that earns word-of-mouth from global fans in different timezones. Costs little, distinguishes Apex from F1.com.

### 8. AI editorial disclosure
- **Options:** Use AI silently / Disclose all AI assist / Ban AI in editorial
- **Recommendation:** **Disclose every AI-assisted piece in footer: "Draft assisted by AI; reviewed by [author]." Ban pure AI publication without human review.**
- **Reasoning:** legal-risk §8.4 + editorial §6 — FTC + EU AI Act Art. 50 now require this; readers reward transparency. AI is scaffold not article.

### 9. Mobile timing
- **Options:** Build PWA only / Flutter at M9 per PID / Flutter at M6 / Skip mobile entirely
- **Recommendation:** **Stick to PID §22 — Flutter starts M9, delivers M12. Web responsive only until then.**
- **Reasoning:** moat-exit notes 70% F1 traffic is mobile but mobile-phase3 spec confirms Flutter is a $30-50k contractor + 4-month engineering lift. Don't pull forward. Founder memory: `project_mobile_deferred`.

### 10. Trademark filing — full scope vs lean
- **Options:** USPTO Class 41 only ($350) / US+EU+UK three jurisdictions ($5.5k) / defer all
- **Recommendation:** **USPTO Class 41 ITU this month ($350 self-file). EU+UK at M3 only after first revenue.**
- **Reasoning:** legal-risk §3.2 — Class 41 ITU locks priority date globally without burning legal budget pre-revenue. Madrid Protocol later when staying-power confirmed.

---

## 3. MASTER 12-WEEK PHASE B EXECUTION PLAN

Phase A is in. Phase B foundation (typed Jolpica client, 7 data routes ISR live) just landed. The schedule below covers **weeks 5-16** (the 12-week execution window through Phase B + spillover into Phase C kickoff). Source: tech-architecture §13 + editorial 90-day calendar + monetization forecast.

### Week 5 — DB Foundation
- **Theme:** Schema-as-foundation.
- **Surface shipped:** No new public route. `/admin` skeleton gated.
- **Tech:** `packages/db` full Drizzle schema (core, people, results, standings, editorial, navigation, identity, ops), migrations 0001-0005, materialized views, Supabase EU project provisioned, Drizzle Studio wired.
- **Editorial:** Article #1 — *Welcome to Apex: The F1 Site Built For The People Who Pause The Broadcast* (founder's letter).
- **Marketing:** Founder X account "@apex_f1" goes live. First "build in public" thread.
- **KPI targets:** 500 newsletter signups, 1k unique visitors, USPTO ITU filed, DMCA agent registered.

### Week 6 — Historical Ingest + Redis Cache Wrapper
- **Theme:** 1950-2026 data hydrated.
- **Surface shipped:** Internal — `/admin/data-status` showing ingest health.
- **Tech:** `apps/workers/jolpica/historical.ts` running, token bucket, idempotent upserts. Decade-chunked runs on Trigger.dev. `packages/cache` wrapper.
- **Editorial:** Articles #2-3: *The 2026 Title Fight Is Closer Than The Standings Suggest* (Strategy Breakdown) + QUIZ: *Name Every F1 Champion Since 2000*.
- **Marketing:** First "Did you know" tweets sourced from new historical data. Contract Writer #1 onboarded.
- **KPI targets:** `result` table ≈25k rows. 800 newsletter subs. First Reddit comment-karma cycle starts (no posts yet).

### Week 7 — SPAIN GP (Round 8) — Wire 13 PID routes to real data
- **Theme:** Public-facing data product fully alive.
- **Surface shipped:** `/`, `/schedule`, `/standings/driver`, `/standings/team`, `/race/[id]`, `/driver/[slug]`, `/team/[slug]` all real, ISR + `unstable_cache` tags.
- **Tech:** Lighthouse perf ≥90 desktop on home/schedule/standings. LCP ≤1.8s. INP ≤200ms.
- **Editorial:** 6 race-week pieces (Spain Preview + Catalunya Sector-3 Technical + Quiz + Quick Recap + Long Recap + Newsletter #2 race-week briefing).
- **Marketing:** First original-analysis Reddit post drafted (held until press flair approved). Newsletter goes live with Spain briefing.
- **KPI targets:** 1.5k newsletter, 5k unique visitors, 3.1k MAU (per monetization-growth M1 forecast).

### Week 8 — CANADA GP — Admin CMS + Meilisearch + Grid Prediction Market MVP starts
- **Theme:** Editorial velocity + first killer feature ground broken.
- **Surface shipped:** `/admin` article editor (TipTap), `/search` page with `react-instantsearch`. **Grid Prediction Market MVP scaffold** (`/grid/card/:raceId`) — 5 questions, global leaderboard only.
- **Tech:** Meilisearch on Fly. `revalidateTag('article:<id>')` on publish. Drizzle tables for `gridRaceCard`, `gridQuestion`, `gridPrediction`.
- **Editorial:** 6 Canada pieces incl. *Villeneuve at Île Notre-Dame, 1978* archive (uses our new historical data — moat in action).
- **Marketing:** First sponsor outreach — iRacing + Fanatec cold pitch ($0 ask, affiliate-first).
- **KPI targets:** First article publishes in <60s admin round-trip. Search returns <200ms. 7.6k MAU.

### Week 9 — Off-Week Before Austria — Auth + Tifosi MVP
- **Theme:** Identity layer.
- **Surface shipped:** Supabase Auth (magic link + Google + Apple + X). `/account`, `/account/follows`, `/account/saved`, **Tifosi pick-your-driver onboarding** (product-depth Feature 4).
- **Tech:** RLS on every table by default. pgTAP test fails build if any table lacks RLS. Account deletion cascade.
- **Editorial:** *Antonelli's First Quarter: A Forensic Of A Mercedes Rookie Season* (driver feature) + *The 1976 Title Lauda Actually Did Win* archive + Quiz.
- **Marketing:** **Founding Member offer ($29 lifetime, cap 1000) opens.** Newsletter push.
- **KPI targets:** First 100 Founding Members signed ($2,900 cash). 18.6k MAU. 2k newsletter.

### Week 10 — AUSTRIA GP — Live timing pipeline end-to-end (Pulse Phase 1)
- **Theme:** Race-day infrastructure.
- **Surface shipped:** `/live/[sessionKey]` route with `useLiveSession` hook. `/api/live/snapshot` fallback. Weather + race-control panels.
- **Tech:** `apps/workers/openf1-live` on Fly.io shared-cpu-1x ($2/mo). `apps/live-ws` on Fly. k6 livews scenario hits 1k concurrent, P95 send→client <800ms.
- **Editorial:** 5 Austria pieces incl. *Red Bull's Home Race: Post-Newey, What's Actually Changed* (team feature).
- **Marketing:** Apply for r/formula1 press flair (3 months of weekly publishing proof now ready).
- **KPI targets:** First live race covered. 28k MAU. 500 Founding Members.

### Week 11 — Off-Week — Observability + Stripe + Resend + Ghost Lap MVP
- **Theme:** Money machinery + viral asset.
- **Surface shipped:** **Ghost Lap MVP** (`/ghost-lap`) — 6 curated comparisons (Brazil 2021, Monaco 2024, Spa 2023, Monza 2019, Abu Dhabi 2021, one wildcard). Sentry tunnel. PostHog. Stripe products + webhook + checkout + portal.
- **Tech:** Test purchase → `user.is_apex_plus = true` within 3s. Better Stack monitors.
- **Editorial:** *Hamilton At Ferrari, Race-By-Race: Mid-Season Performance Audit* (driver feature) + Mailbag.
- **Marketing:** Newsletter #6. First Ghost Lap social asset shared (Brazil 2021 Verstappen vs Hamilton 4-second clip).
- **KPI targets:** 37k MAU. 5k newsletter. First Ghost Lap embed picked up on Reddit (target).

### Week 12 — SILVERSTONE / BRITISH GP — k6 load tests + Public Beta cut
- **Theme:** PUBLIC LAUNCH.
- **Surface shipped:** Public beta announcement. Newsletter signup hero. Founding Member CTA.
- **Tech:** k6 smoke + soak + spike against staging. Fix P95 violations. 30min soak @ 200rps with p99<2s.
- **Editorial:** 6 Silverstone pieces incl. *The Maggotts-Becketts Complex: What Aero Engineers Actually Look At* (Technical Deep-Dive) + *Stewart vs Rindt, 1969* archive.
- **Marketing:** **PUBLIC LAUNCH POST on Reddit (with press flair).** ProductHunt launch. Tommo F1 + Chain Bear cross-promo asks. First press mention pursued (The Race / Motorsport.com).
- **KPI targets:** 48k MAU. 6k newsletter. First sponsor MRR ($3k native).

### Week 13 — Hot Take + Quiz — Phase C Kickoff
- **Theme:** Habit cementing.
- **Surface shipped:** **Pulse Phase 1** (`/pulse`) — Leaderboard + TrackMap + RadioFeed only, one pinned driver, hard-coded moments.
- **Tech:** Realtime WS multiplex tested at 8k concurrents. Service worker for cross-tab persistence.
- **Editorial:** *Hot Take: The Constructors' Championship Is Broken* + *QUIZ: Would You Have Pitted? Re-Run Silverstone Lap 31 Safety Car*.
- **Marketing:** First strategic-buyer warmup — informal coffee with Athletic editor via mutual contact.
- **KPI targets:** 60k MAU. 7.5k newsletter. First Pulse session run (target Hungary GP).

### Week 14 — HUNGARY GP — First "real" Pulse race
- **Theme:** Race-day battle test.
- **Surface shipped:** Pulse goes live for Hungary GP. Spoiler-safe toggle live.
- **Tech:** Real-time concurrents target 2k peak. Fan reaction MVP (rate-limited Upstash).
- **Editorial:** 5 Hungary pieces incl. *Hungaroring Strategy Trap*.
- **Marketing:** First newsletter sponsorship sold ($700 at 7.5k subs).
- **KPI targets:** 73k MAU. 9.5k newsletter. Pulse: 1.5k concurrent during race.

### Week 15 — Summer Break Week 1 — Rivalry Timeline + Archive Push
- **Theme:** Evergreen SEO compounding.
- **Surface shipped:** **Archive OS MVP** — every entity gets a canonical page with Wikidata hydration (drivers, teams, circuits 1950+).
- **Tech:** ISR pre-render for top 200 entity pages. Schema.org `Article` + `SportsEvent` on each.
- **Editorial:** *Verstappen vs Norris: A Friendship That Was Always Going To Break* (rivalry timeline) + Photo Essay + Quiz + Newsletter #10.
- **Marketing:** First B2B-data pilot conversation (sim-racing publisher).
- **KPI targets:** 87k MAU. 12k newsletter. First press mention secured (target: The Race).

### Week 16 — Summer Break Week 2 — Apex+ Soft Launch + Mid-Season Awards
- **Theme:** Subscription revenue line opens.
- **Surface shipped:** **Apex+ paywall live** ($4.99/mo or $49/yr). Ad-free, full archive search, race-day private newsletter, founder's race-weekend journal.
- **Tech:** Stripe Customer Portal. `is_apex_plus` flag drives middleware gates. Annual selected by default at checkout.
- **Editorial:** *Mid-Season Awards: Driver Of The Half-Season* (Hot Take) + *Jim Clark At Spa 1963* archive.
- **Marketing:** Apex+ launch newsletter blast to all 12k subs + Founding Members. PR push.
- **KPI targets:** 100k MAU. 14k newsletter. **First 500 paying Apex+ subscribers in first 14 days** (kill criterion: <500 in 90 days = pull Apex+).

---

## 4. TOP 5 KILLER FEATURES TO BUILD IN PHASE B

Ranked from product-depth top 10 by (retention impact × defensibility × Phase B build feasibility):

### 1. The Grid Prediction Market (Feature 3)
- **Why defensible:** F1 official Fantasy is broken UX, gated, hated. Apex wins on UX + zero-stakes + social leagues. Network effects via private leagues = high switching cost. Generates 500k structured predictions/week = proprietary sentiment dataset (Trojan Horse 2 — eventually licensable to broadcasters).
- **MVP scope (Phase B weeks 8-9):** 5 questions only (pole, winner, podium, fastest lap, DNF). Global leaderboard. No leagues yet. Email settlement. Manual editorial wildcard.
- **Build complexity:** 3/5 (CRUD-heavy, no live WS, settlement is async job).
- **Expected lift:** 60% weekly Grid Card completion of registered MAU by month 6; +35% Pulse cross-conversion. Highest retention impact in product-depth report (5/5).

### 2. Pulse (Feature 1) — Live Race-Day Second-Screen
- **Why defensible:** F1 legally blocked from offering this free (F1 TV Pro upsell). Reddit/Discord can't structure it. The Race/Athletic don't do live. The Sunday habit anchor = highest LTV cohort.
- **MVP scope (Phase C weeks 13-14):** Leaderboard + TrackMap + RadioFeed. One pinned driver. Hard-coded moment triggers (overtakes, fastest lap). No fan reactions yet. No newcomer mode.
- **Build complexity:** 5/5 (live WS, fault tolerance, multi-device sync).
- **Expected lift:** 25% of MAU open Pulse ≥20min during race weekend by month 12. Median 45min session.

### 3. Ghost Lap (Feature 2) — Telemetry Replay
- **Why defensible:** F1.com locks behind F1 TV Pro. Nobody else has built free public telemetry replay. Curated "iconic comparisons" library is editorial moat. Viral Reddit share loop drives backlinks.
- **MVP scope (Phase B week 11):** 6 curated comparisons (Brazil 2021, Monaco 2024, Silverstone 2008, Spa 2023, Monza 2019, Abu Dhabi 2021). OpenF1 only (2018+). Static SVG, no GIF render, no embed.
- **Build complexity:** 4/5 (SVG 60fps rendering, telemetry sync, scrub UX).
- **Expected lift:** 50k replays/week by month 6. 8%+ share rate. Page-1 SEO for `[driver] vs [driver] [GP] comparison` queries.

### 4. Tifosi — Per-Driver Persistent Fan Identity (Feature 4)
- **Why defensible:** Reddit flairs anemic; F1.com has no identity layer. Once a fan has 500 karma + 3 badges + driver-themed profile, switching cost = identity loss. Generates the F1-fan-distribution dataset (Trojan Horse 1) — sellable to merch partners.
- **MVP scope (Phase B week 9):** Pick-your-driver during signup. Profile page with badge wall. Team-color theme cascades through site. Public profile URL.
- **Build complexity:** 3/5 (auth + theming + profile schema).
- **Expected lift:** 4/5 retention; drives merch affiliate (Verstappen-allegiant users see Red Bull merch with 3-5× conversion).

### 5. Paddock Memo Newsletter (Feature 5)
- **Why defensible:** Owned distribution = only acquisition channel that compounds without platform risk (Trojan Horse 3). At 100k subs, Apex can launch any new feature into 100k qualified inboxes at $0 CAC. Email subs convert 8-10× better to Apex+ than cold web traffic.
- **MVP scope (live from Week 7 — concurrent with editorial):** 1500-word Saturday-morning brief, 8-block fixed structure (Countdown, Preview, Strategy Intel, Driver to Watch, Paddock Corner, Standings, 3 Must-Reads, CTA). Resend integration.
- **Build complexity:** 2/5 (Resend + content workflow).
- **Expected lift:** 100k subs by M18 per forecast. ARPU ramp from $0.08 newsletter CAC vs $0.65 YouTube. Newsletter→Apex+ at 6-8%.

---

## 5. MONETIZATION TIMING

Per monetization-growth §3 forecast. Each lever turned on when its conversion math beats its operational cost.

| Lever | Month live | Justification |
|---|---|---|
| **Display ads (Mediavine/AdThrive direct)** | M4 (28k MAU, ~$1.6k/mo) | Below 25k MAU programmatic RPM is sub-economic; Mediavine accepts at 50k sessions/mo. Start with Ezoic header bidding at M3 as bridge. |
| **Affiliate (iRacing/Fanatec)** | M3 (sponsor convo Week 8) | Zero infra cost; works on referral codes. iRacing affiliate program is plug-and-play. Booking.com hotel affiliates for race-weekend travel queries. |
| **Newsletter sponsorship** | M4 (25k subs, $700/send rate) | Beehiiv Ad Network self-serve floor is 25k. Cap inventory at 60% of sends to keep editorial trust. |
| **Founding Member lifetime ($29 × 1000)** | M3 (Week 9) | $29k zero-CAC cash. Forces operational discipline. Generates 1000 Discord evangelist cohort. |
| **Native sponsorships** | M6 (48k MAU, $3-6k/mo) | iRacing + Fanatec deals first (smallest checks, easiest yes). TAG Heuer / Bose pitched only after 80k+ MAU + 1 design-press hit. |
| **Apex+ subscription ($4.99/$49)** | **M9 (87k MAU)** | Conversion math: 1.2% × 87k = ~1k subs × $4.67 = $4.7k/mo at launch. Below M9 the absolute number is too small to justify billing infra overhead. By M12 conversion ramps to 2% steady state. |
| **B2B API tier** | M10 (after Grid Market data accumulated) | $500/mo entry tier. Sell normalized F1 dataset (Jolpica+OpenF1+Wikidata composite) to fantasy apps and sentiment-curious media. Legal: avoid "official" framing. |
| **Premium tiers (Telemetry $9.99, Fantasy $7.99)** | M15 | Only once core $4.99 tier hits 3% conversion stably. Telemetry tier requires Ghost Lap full-scope build (M14-15). |

**Profitability:** OpEx <$700/mo through M12. Operating profit positive from M1. True breakeven (with $3k/mo founder draw from M7) at **M5-M7**.

---

## 6. TOP 5 RISKS REQUIRING IMMEDIATE ACTION

From legal-risk register + moat-exit threat modeling. Severity-weighted.

### Risk 1: FOM/Liberty C&D (Severity: Critical / Likelihood: Low-Med)
- **This week:** File USPTO Class 41 ITU on "APEX" word mark ($350 self-file via TEAS Plus). Run TESS/EUIPO/UKIPO clearance search. Create `legal@apex.gg`, `dmca@apex.gg`, `privacy@apex.gg` aliases.
- **This month:** Register `apex.gg` + `apex.racing` + defensive bundle ($150 at Cloudflare Registrar). Add "Apex is an independent fan platform, not affiliated with Formula 1, FIA, FOM, or any team" disclaimer to every footer and About page.
- **This quarter:** Engage TM counsel 4hr/mo retainer ($1,400). File EUIPO + UKIPO via Madrid Protocol (~$2,500 inc. counsel). Draft C&D response templates per legal-risk §2 scenarios. Buy Hiscox MediaTech bundle ($5,500/yr inc. GL + E&O + Cyber + Media).

### Risk 2: OpenF1 goes dark (Severity: Critical for Pulse / Likelihood: Low)
- **This week:** Add `data-source: openf1` attribution badge to all telemetry components. Document "OpenF1 community-derived, MIT-licensed" in About page.
- **This month:** Architect Jolpica-only fallback mode. `/live` route degrades to "results posting shortly" if OpenF1 silent >30s. Save snapshot of OpenF1 dataset weekly to R2.
- **This quarter:** Run full dry-run against past `session_key` two weekends before first real GP we cover. Watch OpenF1 GitHub issues + FIA press releases for data-exclusivity news.

### Risk 3: Solo-founder burnout (Severity: High / Likelihood: High)
- **This week:** Domain auto-pay on. 1Password Emergency Kit printed. Set Monday/Sunday "no Apex" personal rules.
- **This month:** Sign Contract Writer #1 by Week 4 ($350-500/piece). Founding-Member cash funds outsourcing. Inactive Account Manager set up.
- **This quarter:** Hire Editor #1 at M6 from Founding-Member cash even without angel money. Take 1 weekend off per month minimum. Plan-B job in tech remains a fallback (mentioned in kill criteria).

### Risk 4: Supabase RLS misconfiguration (Severity: Critical / Likelihood: Med)
- **This week:** pgTAP CI guard: build fails if any table has `rls_enabled=false`. Semgrep rule blocking `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/`.
- **This month:** RLS ON for every table by default. Service-role key never in client bundle. TruffleHog scan on every push.
- **This quarter:** Quarterly migration drill — practice export Supabase → self-hosted Postgres on Hetzner in <4h. Article 30 ROP drafted. DPAs signed with Supabase, Resend, PostHog, Vercel.

### Risk 5: AI-aggregator sites crowd long-tail SEO (Severity: Med / Likelihood: 90% — already happening)
- **This week:** Every published article gets named author byline + `Person` schema + verified social profile links. E-E-A-T signals on.
- **This month:** Original reporting protocol — every news article must have ≥1 source AI cannot replicate (interview, named paddock source, FIA document). Two-source rule documented in editorial SOP.
- **This quarter:** Build the formats AI is bad at: Ghost Lap interactive, Grid Market predictions, Pulse live, archive entity pages with proprietary derived metrics (Apex Pace Score). Pillar pages programmatic + curated, never AI-generated.

---

## 7. EDITORIAL LAUNCH PLAN — FIRST 30 DAYS

Pulled from editorial-content §3 Month 1 calendar. Anchored to Spain GP (Round 8) Week 7 and Canada GP (Round 9) Week 8.

### 12 ARTICLES TO SHIP
1. *Welcome to Apex: The F1 Site Built For The People Who Pause The Broadcast* (Founders' Letter, Week 5)
2. *The 2026 Title Fight Is Closer Than The Standings Suggest — Here's The Maths* (Strategy Breakdown, Week 6)
3. *Spain Preview: Why Turn 3 Is The Most Honest Corner On The 2026 Calendar* (Race Preview, Week 7)
4. *Catalunya's Sector 3 Holds The Answer To McLaren's Tyre Riddle* (Technical Deep-Dive, Week 7)
5. *Five-Minute Spain: [Winner] / Quick Recap* (Race Recap Quick, Week 7)
6. *How [Winner] Built A 9-Second Cushion Across Stint Two* (Race Recap Long, Week 7)
7. *Canada Preview: The Wall Of Champions Is The Most Honest Corner In F1* (Race Preview, Week 8)
8. *Why The Hairpin Decides Montreal — A Strategy Primer* (Strategy Breakdown, Week 8)
9. *Villeneuve At Île Notre-Dame, 1978 — The Drive That Built A Nation's Sport* (Historical Retrospective, Week 8)
10. *Race Recap Long: Montreal* (Week 8)
11. *Antonelli's First Quarter: A Forensic Of A Mercedes Rookie Season* (Driver Feature, Week 9)
12. *The 1976 Title Lauda Actually Did Win — A Reconstruction From The Data* (Historical Retrospective, Week 9)

### 4 NEWSLETTERS
- **Newsletter #1 (Week 5):** *Welcome to Race Week Briefing* — sets the cadence + format expectations
- **Newsletter #2 (Week 7):** *Spain arrives. McLaren can't afford another setup gamble.* (per sample in editorial §5)
- **Newsletter #3 (Week 8):** *Canada: The Wall of Champions briefing*
- **Newsletter #4 (Week 9, off-week):** *Off-Week Playlist — Five Stints From 2026 Worth Re-Watching*

### 6 SOCIAL POSTS (X/Twitter primary)
1. **Build-in-public thread (Week 5):** "Day 1 of building Apex, an independent F1 fan site. Here's the stack, here's the bet, here's the 12-week plan." Drives founder credibility per moat-exit §8.
2. **Did-you-know micro (Week 6):** "The 1971 Italian GP had the closest finish in F1 history. 0.01s across the line. Five cars within 0.61s. We unpacked it →" (links to Apex archive piece)
3. **Spain pre-race poll (Week 7, Thursday):** "One-stop or two at Catalunya? My call below. What's yours?" Drives reply-engagement.
4. **Ghost Lap social asset (Week 11):** Brazil 2021 Verstappen vs Hamilton overlay 30-second video. Onboard with sector overlay.
5. **Strategy intel quote-tweet (Week 8):** Apex's pre-race tyre-strategy thread quote-tweeted post-race when it lands. Builds the "smart F1 Twitter" rep.
6. **Founder-builder thread (Week 9):** "Just shipped Apex auth + Tifosi profile picker. Here's the spreadsheet I used to figure out what driver-allegiance means as a data model →" Transparency = recruiting tool.

---

## 8. DESIGN/MOTION NORTH STAR

Per ux-cinematic §1.

### 3 REFERENCE SITES APEX STUDIES
1. **[apple.com/airpods-max](https://www.apple.com/airpods-max/)** — scroll-locked product reveal choreography, ~3000ms pinned hero, hardware-only transforms, *one motion per viewport* discipline.
2. **[igloo.inc](https://igloo.inc)** — dark cinematic surface, slow scroll-scrubbed reveals (no rubber-band), 200vh of silence around hero video/WebGL.
3. **[marcellopolicarpo.com](https://marcellopolicarpo.com)** — type-as-hero, restrained custom cursor (one state, never gimmicky), slow display-weight reveals that feel editorial not flashy.

### 1 EXPLICIT ANTI-PATTERN APEX REJECTS
**[formula1.com](https://www.formula1.com)** itself — bento-grid carousel stack, fluorescent red CTA noise, "everything above the fold" panic, carousel-on-autoplay everywhere. Also rejected: the "Vercel template" look — gradient mesh blobs, glassmorphism cards floating on noise, marquee logo strips, the universal Framer `initial={{opacity:0, y:20}}` fade-up that signals "AI-generated portfolio."

### 3 MOTION SPECS APEX IMPLEMENTS BEFORE ANY OTHER UX WORK
1. **Driver profile char-by-char hero with team-color tint** (ux-cinematic §3.7) — 18ms char stagger, team color at 6% over black, giant driver number `clip-path` reveal. Validate on Pixel 6a at 60fps before any Next.js commit.
2. **Track map driver-dot live updates at 4Hz** (ux-cinematic §4) — Framer `layout` at 250ms tick cadence (NOT springs — springs visually de-sync from real telemetry). Pan/zoom while dots tween. 50fps minimum on Pixel 6a.
3. **Scroll-pinned race detail circuit hero** (ux-cinematic §3.3) — GSAP ScrollTrigger pin for +=200%, sector progressive highlight on scroll. Test 5 users — 4 must understand the sector reveal without explanation. Lenis + ScrollTrigger interplay zero frame drops.

**Bonus locked motion tokens:** `motion.fast: 180ms`, `motion.base: 320ms`, `motion.slow: 600ms`, `motion.cinematic: 900ms`. Easing `ease.apex = [0.215, 0.61, 0.355, 1]` for 80% of interactions. Anything >900ms not scroll-bound = designed wrong.

---

## 9. PHASE C + MOBILE PREVIEW

### PHASE C (Weeks 13-20, lands ~M5-M6)
- **Pulse Phase 1** — Leaderboard + TrackMap + RadioFeed + 1 pinned driver. Hungary GP as first real race coverage.
- **Auth full** — Supabase Auth + Tifosi profile picker + identity-route shell.
- **Sentry tunnel + PostHog mirror** — observability per tech-architecture §10.
- **Stripe + Apex+ subscription live** ($4.99/mo / $49/yr) at M9. Founding Member upgrade flow.
- **Resend templates** — race reminder, weekly digest, magic link, Apex+ welcome.
- **k6 load tests** — soak 30min @ 200rps p99<2s, livews 1k concurrent.
- **Public beta announcement** — Reddit (with press flair), ProductHunt, founder X thread.
- **Grid Prediction Market full scope** — leagues, streaks, badges, seasonal trophy.
- **Ghost Lap full scope** — self-serve picker across 2018-present, GIF render pipeline, embed code generator.
- **Archive OS MVP** — Wikidata-hydrated entity pages, ISR pre-rendered for top 200 entities.

### PHASE 3 / MOBILE (M9-M12, delivered M12)
Per mobile-phase3 spec. Flutter 3.27.x + Riverpod 2.x + GoRouter + Dio/Retrofit + Hive + Supabase + FCM/APNs.
- **11 screens:** Onboarding (driver-picker), Today, Live, Race Hub, News, Standings, Drivers index + detail, Teams index + detail, Search, Saved, Settings.
- **Push notification categories:** session-start reminders, breaking news, followed-driver moments, Apex+ digest.
- **Offline sync:** Hive boxes cache last 50 articles, current standings, this-weekend race card. Sync cursor pattern per box.
- **ASO:** "Apex — F1 Fan Companion" / Subtitle: "Independent F1 News & Stats". First-paragraph disclaimer mandatory. Zero F1 marks in screenshots/metadata.
- **IAP:** Stripe-anchored Apex+ pricing mirrored via Apple/Google IAP, with 30% platform tax baked into pricing display.
- **Contract Flutter dev** M10-M11 ($15-25k). QA contractor M12 ($5k).
- **Targets:** 30k installs by EOY2. App-store rating ≥4.5. Race-day push CTR ≥18%.

---

## 10. THE NEXT 7 DAYS

Ranked todo. An engineer can start tomorrow with this list.

1. **File USPTO Class 41 Intent-to-Use on "APEX" word mark** — $350, 30min self-file via TEAS Plus. Run TESS clearance first. Owner: founder. Deadline: this Wednesday.
2. **Register `apex.gg` + `apex.racing` + 4 defensive domains at Cloudflare Registrar** — $150 total. Enable registrar lock + 2FA. Owner: founder. Deadline: this Tuesday.
3. **File DMCA Designated Agent with US Copyright Office** — $6, dmca.copyrightoffice.gov, 30min. Owner: founder. Deadline: this week.
4. **Create `packages/db` package with full Drizzle schema** — copy verbatim from tech-architecture §1 (core, people, results, standings, editorial, navigation, identity, ops enums). Migrations 0001-0005. Run `pnpm db:migrate` clean on fresh Supabase EU project. Owner: founder. Deadline: end of Week 5 (3 days).
5. **Add legal disclaimer to footer of every route + About page** — *"Apex is an independent fan platform and is not affiliated with, endorsed by, or sponsored by Formula 1, FIA, FOM, or any Formula 1 team. All trademarks are the property of their respective owners."* Owner: founder. Deadline: tomorrow (1 hour).
6. **Stand up `legal@apex.gg`, `dmca@apex.gg`, `privacy@apex.gg`, `security@apex.gg` email aliases** via Cloudflare Email Routing. Owner: founder. Deadline: this Tuesday.
7. **Open founder X account @apex_f1 and ship build-in-public Thread #1** — "Day 1 of building Apex" with stack + 12-week plan + screenshot of homepage. Per moat-exit §8 — founder credibility is single biggest valuation lever. Owner: founder. Deadline: this Friday.
8. **Draft + publish Article #1: *Welcome to Apex* (founders' letter)** — 1200 words. Voice = composed, forensic, cinematic. Owner: founder. Deadline: Sunday (article-as-launch signal).
9. **Set up Resend account + newsletter signup form** — inline on hero, footer, race-ticker bar. Double opt-in mandatory. Owner: founder. Deadline: by end of Week 5.
10. **Run TESS / EUIPO / UKIPO clearance search on "APEX"** — confirm no live oppositions in Class 41 entertainment-news. Owner: founder. Deadline: before TM filing in item 1.

---

## 11. VALUATION TARGETS Y1/Y2/Y3

Pulled from moat-exit §6 + monetization-growth §3.3. All ranges 12 months out from indicated month.

### Year 1 end (M12: ~135k MAU, $130-160k revenue, ~25k newsletter)
- **Revenue multiple:** 8-15× (early-stage premium media) on ~$135k = **$1.0-2.0M**
- **Audience multiple:** $20-40 per MAU × 135k = **$2.7-5.4M**
- **Strategic premium (design + niche moat):** +$0.5-1M
- **Range: $1-3M post-money** if any raise happens. Realistic angel comp: $1.5-2.5M SAFE cap. **Don't raise above $3M cap** — too dilutive for too little de-risking.

### Year 2 end (M24: ~510k MAU, $1.1-1.2M ARR, profitable)
- **Revenue multiple:** 5-12× on $1.2M = **$6-14M** (sub-heavy mix gets higher end)
- **Audience multiple:** $25-50 × 510k = **$12-25M**
- **Profitability premium:** rare at this scale = +20-30%
- **Range: $8-15M post-money.** Realistic seed comp: $10-12M post on $1.5-2M raise. Only raise if mobile launch or expansion needs it.

### Year 3 end (M36: ~1M+ MAU, $3-5M ARR, 15-25% EBITDA)
- **Revenue multiple:** 5-10× on $4M midpoint = **$20-40M**
- **Audience multiple:** $30-60 × 1M = **$30-60M**
- **EBITDA multiple:** $800k EBITDA × 15-25× = $12-20M (lower-bound sanity check)
- **Strategic buyer premium** (F1 rights cycle 2027-28 creates urgency): +25-50% = +$5-15M
- **Range: $25-60M.** Series A comp: $25-40M post on $5-8M raise — only if pursuing $100M+ exit; otherwise stay capital-efficient and surface to NYT/Athletic + Motorsport Network.

**Sanity check:** Athletic at exit was ~$450/paid sub. Apex Y3 at 20k Apex+ subs = ~$9M subs-only. With ads + sponsorship + affiliate, Y3 should be 3-6× that = $27-54M. **Math triangulates.**

---

## 12. KILL CRITERIA

Pre-committed per moat-exit §11. Pre-committing prevents founder denial when data is bad.

| Trigger | Decision | Reasoning |
|---|---|---|
| **M6 MAU <5k AND newsletter <1k** | **Pivot evaluation week.** Audit traffic sources, retention. Most likely problem: positioning, not product. Rewrite homepage + 3 most-read articles. Re-evaluate at M9. | F1 niche should clear 5k by M6 with consistent editorial. Below = positioning issue. |
| **M12 MAU <25k AND no path to 25k visible** | **Decide: lifestyle business OR shutdown.** If founder happy with $50-100k/yr + freedom = continue as lifestyle. If founder wants startup outcome = sunset cleanly. **Do not raise capital to mask weak metrics.** | 25k at M12 is the floor for venture-scale optionality. Below = good blog, not a startup. |
| **FOM C&D received** | **Comply within 7 days.** Remove flagged content/marks. Engage IP counsel ($3-8k flat fee). If legal cost projection >$10k OR repeat C&Ds = **pivot brand to broader motorsport** (MotoGP + IndyCar + WEC) within 90 days. | Legal fights with FOM are unwinnable for solo founder. Compliance + diversification preserves business. |
| **Apex+ launch (M9) gets <500 paying subs in 90 days** | **Kill Apex+ paid tier. Move to ad + sponsorship pure-play.** Pricing/value-prop didn't land. | Sub conversion <2% of engaged audience = not a sub business. Force the question. |
| **Founder reaches M18 with personal runway <6 months AND revenue <$10k/month** | **Take part-time engineering role + downshift Apex to nights/weekends.** | Burnout + financial stress = #1 killer of solo founders. Acknowledge, don't deny. |
| **Direct competitor with >$3M raised launches comparable product Y1-Y2** | **Accelerate to acquisition conversation OR find differentiated wedge** (region, format, niche). Don't out-spend funded competitors on growth. | Outspent 10:1 on paid = organic + design defense buys 12-18 months. |
| **2027-28 F1 rights cycle: Apple buys F1** | **Open acquisition conversation with Apple Sports immediately.** Value peaks now. | Apple acquiring F1 = best exit window for Apex. Don't miss it. |
| **OpenF1 goes dark permanently** | **Degrade `/live` to Jolpica-only post-session results within 24h.** No outage-driven brand damage. | Risk-accepted dependency (legal-risk R24). Pulse Phase 2 (replays + sentiment) remains viable. |

---

## CLOSING POSTURE

Apex's competitive position is real: nobody owns the **independent + premium + telemetry-grade + community-warm** quadrant. F1.com owns authority but can't be honest. The Race owns honest editorial but lives on YouTube. Reddit owns community but lacks design. Apex collapses these into one product where Apple-grade design taste is the cheap-to-build, hard-to-copy moat — and the founder's solo-build economics make every month of execution compound without dilution.

The single highest-leverage activity in Year 1 is the newsletter. Not the homepage. Not the mobile app. Not Apex+. **The newsletter is owned distribution and the foundation of every exit comp above $20M** (moat-exit closing). The single highest-leverage activity in Year 2 is the founder's public profile — builders who build in public command 2-3× exit premium. The clock starts now.

— *End of master plan.*
