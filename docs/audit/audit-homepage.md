# Homepage audit — every section and every interaction on /

Modal trigger works fine.

Now the NewsletterCTA — at lines 9-18 of `apps/web/components/home/NewsletterCTA.tsx`, the form's `onSubmit` is **purely client-side simulation**. It never calls `/api/newsletter`. The actual newsletter endpoint exists and the dedicated `/newsletter` page wires it correctly. **This is the biggest finding.** The homepage CTA is fake.

PartnerBar is text-only — no dead buttons. Pass.

Let me check the StandingsPreview wins/win pluralization and the `seasonNum` issue one more time. The /results/{season}/drivers route is called from QuickLinks #2 with `season=2026` (the current year per memory), which is fine — but StandingsPreview links to `/results/current/...` which is broken.

Let me also check if the EditorsPicks has any hover state on text-only cards (lines 63-85) — no scale on image but text doesn't get a hover treatment beyond grayscale image scale.

Now compiling the report.

---

### [apps/web/components/home/NewsletterCTA.tsx:9-18] [P0] Newsletter submit is fully simulated — never hits backend
**What's broken:** `onSubmit` does NOT call `/api/newsletter`. It only sets local `state` to `'success'` if the email contains `@`, then clears it after 4 s. The real `/api/newsletter` route (and the dedicated `/newsletter` page's `NewsletterForm` which wires it correctly) is bypassed entirely. No email ever leaves the browser, no log, no queue.
**User-visible symptom:** Founder enters email on the homepage CTA, sees the green confirmation, walks away. Nothing happens. No capture. Worst possible fake — the most-converted CTA on the home page is theater.
**Fix:** Replace the body of `NewsletterCTA.tsx` `onSubmit` with the exact fetch + localStorage queue pattern from `apps/web/app/newsletter/form.tsx` (lines 12-44). Reuse by importing `NewsletterForm` and stripping the duplicate header/layout, or extract the form body into `components/newsletter/SubscribeForm.tsx` and consume from both surfaces.
**Why:** One real submit path; eliminates the divergence where `/newsletter` works but the homepage doesn't.

### [apps/web/components/home/QuickLinks.tsx:9] [P0] "Archive" chip 404s — `/results/archive` route does not exist
**What's broken:** The chip links to `/results/archive` but `apps/web/app/results/` only contains `[season]/drivers/page.tsx` and `[season]/teams/page.tsx`. There is no `archive/page.tsx` and `[season]` is a dynamic segment that will try `Number("archive")` → `NaN` → broken Jolpica call → render explosion (or Next.js 404 on bad fetch).
**User-visible symptom:** Click "Archive" in the QuickLinks rail → either Next 404 or an unhandled Jolpica error.
**Fix:** Either (a) create `apps/web/app/results/archive/page.tsx` listing all seasons 1950-2026 with links to `/results/{year}/drivers`, or (b) change the QuickLinks href to `/results/2025/drivers` for the most recent finished season. Option (a) is the right move — the brief talks about a "high-volume databank".
**Why:** A "results archive" surface is implied by the screen-folder roster (`the_archive_high_volume_databank/`); shipping the route is core to the product.

### [apps/web/components/home/StandingsPreview.tsx:56,63] [P0] "FULL STANDINGS" buttons point at non-numeric season → NaN fetch
**What's broken:** Both "FULL DRIVER STANDINGS" and "FULL CONSTRUCTOR STANDINGS" link to `/results/current/drivers` and `/results/current/teams`. The downstream pages do `const seasonNum = Number(season)` → `NaN`, then call `jolpica.getDriverStandings(NaN, …)` which interpolates as `NaN/driverStandings.json` and 404s at Jolpica. The header also renders "DRIVER STANDINGS · current" (lowercased, off-brand).
**User-visible symptom:** Click "FULL DRIVER STANDINGS" → broken page, empty table, or server error.
**Fix:** Either (a) change the home links to `/results/2026/drivers` and `/results/2026/teams` (current-year literal), or (b) inside `apps/web/app/results/[season]/{drivers,teams}/page.tsx` add `const apiSeason = season === 'current' ? 'current' : Number(season);` and pass that to `jolpica.*`, plus render `season === 'current' ? new Date().getFullYear() : season` in the header. Pick (b) — it makes `/results/current/*` permanently work.
**Why:** Jolpica natively supports `current` as a season key; the codepath just needs to stop coercing to Number.

### [apps/web/components/home/HighlightsRail.tsx:35] [P1] "ALL →" link uses wrong channel slug → filter silently no-ops
**What's broken:** The link is `/video?channel=formula1`. The video page slugifies channel names via `name.toLowerCase().replace(/\s+/g, '-')`, so "FORMULA 1" becomes `formula-1`. `formula1 !== formula-1` → the filter returns zero channels → the page falls back to `YT_F1_CHANNELS` (all channels) without telling the user.
**User-visible symptom:** Founder clicks "ALL →" expecting Formula 1 channel only, sees mixed channel results. Looks like the filter is broken.
**Fix:** Change href to `/video?channel=formula-1` in `HighlightsRail.tsx` line 35. Optional hardening: in `apps/web/app/video/page.tsx` line 50 also accept `formula1` by stripping all non-alphanumerics on both sides for compare.
**Why:** Cheap one-character fix; aligns home rail with the slug contract on `/video`.

### [apps/web/components/home/HeroLeadStoryClient.tsx:70-76] [P1] Hero "All news" CTA secondary, no icon affordance issue + missing analytics hook
**What's broken:** "All news" links to `/latest` (route exists, fine), but the link has no `prefetch` behavior because it's a plain `<a>` instead of `next/link`. SPA navigation on the most-clicked secondary CTA falls back to a hard reload.
**User-visible symptom:** Click "All news" → full page reload (visible flash), slower than the rest of the site.
**Fix:** Import `Link` from `next/link` and replace `<a href="/latest" …>` with `<Link href="/latest" …>` at line 70. Same treatment on `HeroRail.tsx` line 21 (`ALL STORIES →`), `FeaturedVideoRail.tsx` line 23 (`ALL VIDEO →`), `EditorsPicks.tsx` line 26 (`MORE →`).
**Why:** Internal links should always use `next/link` for prefetching + soft nav; external (`lead.link`, source articles) stay as `<a target="_blank">`.

### [apps/web/components/home/SocialPulse.tsx:14] [P1] Empty / rate-limited Reddit state returns `null` — section vanishes silently
**What's broken:** When Reddit returns 429 or zero posts, `getRedditFormula1Pulse` likely returns `[]`, and the component early-returns `null`. The "OPEN SUBREDDIT →" link, the section header, and the user-visible context all disappear. The founder will perceive this as a missing feature rather than a transient outage.
**User-visible symptom:** Section is sometimes there, sometimes gone. No explanation, no fallback CTA to keep traffic.
**Fix:** Replace `if (posts.length === 0) return null;` with a degraded-but-real rendering: keep the header row + "OPEN SUBREDDIT →" link, render one full-width card that says `Reddit pulse is rate-limited right now — read r/formula1 live`, link to `https://www.reddit.com/r/formula1/new/`. Add a `data-state="rate-limited"` attribute for QA.
**Why:** No mock data, but the surface should never silently disappear — that violates the "no dead sections" mandate.

### [apps/web/components/home/FeaturedVideoRail.tsx:28] [P2] Horizontal scroll rail has no snap, no scroll affordance, no keyboard nav
**What's broken:** The video rail is `flex gap-4 overflow-x-auto pb-2` — no `scroll-snap-type`, no visual scroll indicator (left/right arrows), no `tabindex` on the scroll container. Mobile feels janky; desktop users with a non-touch trackpad can't tell the rail scrolls. There are also no `prev/next` controls.
**User-visible symptom:** On mobile, content stops mid-card; on desktop, users miss that there are 8 videos. The rail feels like a static row of 3-4 cards.
**Fix:** Add `snap-x snap-mandatory scroll-pl-4` to the rail container and `snap-start shrink-0` to each `<article>`. Mount a paired `<button>` set (`chevron_left` / `chevron_right`) at the section header level that scrolls the container by `clientWidth * 0.9`. Wrap the rail in a sibling-aware client component (`FeaturedVideoRailScroller.tsx`).
**Why:** Same pattern is already used implicitly by `QuickLinks` (`overflow-x-auto`) — promote it to a reusable `<HorizontalRail>` primitive in `components/ui/`.

### [apps/web/components/home/EditorsPicks.tsx:63-85] [P2] Small bento cards have no image-less fallback styling
**What's broken:** The four supporting picks only render an `<img>` if `a.imageUrl` exists. When an RSS item has no image, the card collapses to two text lines with no visual weight — it sticks out as broken in a 3-up grid.
**User-visible symptom:** Some grid cells are tall (with image), others short (text only). Layout shifts and looks half-broken.
**Fix:** In `EditorsPicks.tsx` line 71, replace the conditional with an always-rendered placeholder when `imageUrl` is missing: render a 16/10 box with a large `material-symbols-outlined: article` icon on `bg-surface-container-high` and the source name watermarked top-left. Same fix needed in `HeroRail.tsx` line 37.
**Why:** Consistent card height across rows; no dead-looking text-only cards.

### [apps/web/components/home/HeroLeadStoryClient.tsx:18-25] [P2] Hero `<img>` uses raw `<img>` not `next/image` → no LCP optimization, no responsive srcset
**What's broken:** The 88vh hero loads a full-resolution remote image with no width/height hints and no `next/image` integration. LCP suffers on slow networks. There is no skeleton/blur placeholder if the image is slow.
**User-visible symptom:** Hero loads blank, then suddenly the image pops in. Looks unpolished on first visit.
**Fix:** Either (a) switch to `next/image` with `priority`, `fill`, `sizes="100vw"`, and add the RSS provider hostnames to `next.config.ts` `images.remotePatterns`, or (b) keep `<img>` but add `loading="eager"` `decoding="async"` `fetchpriority="high"` and a CSS gradient placeholder behind it (`bg-gradient-to-b from-surface-container-high to-background`).
**Why:** This is the LCP element on the entire site; it earns the optimization budget.

### [apps/web/components/home/PartnerBar.tsx:4-19] [P3] PartnerBar is honest but inert — no CTA / no link out
**What's broken:** The disclaimer text is fine and on-brief ("Independent · Unofficial · Original editorial"), but it has zero affordance. The line "Data is sourced from public APIs (Jolpica, OpenF1, Wikidata)" namedrops three real partners with no hyperlinks. The "Logos appear here only when licensed" tail-promise has no inbound action.
**User-visible symptom:** Section reads as a static legal footer; nothing to click, no follow-through, no place to verify the data sources.
**Fix:** Wrap "Jolpica", "OpenF1", and "Wikidata" in external links to `https://api.jolpi.ca/`, `https://openf1.org`, `https://www.wikidata.org` with `target="_blank" rel="noopener noreferrer"`. Add one secondary CTA below the paragraph: `<Link href="/about">How Apex works →</Link>` (route confirmed to exist).
**Why:** Same content, but the section earns its real estate by sending a curious user to `/about` or the source APIs.

### [apps/web/components/home/StandingsPreviewTabs.tsx:83-85] [P3] Pluralization bug: "1 WIN" reads fine, but "5 WIN" / "0 WIN" is wrong
**What's broken:** The row renders `{row.wins} WIN` for every row. Drivers with 0 or >1 wins read as ungrammatical; for an editorial brand premising "telemetry-grade" copy this stands out.
**User-visible symptom:** Standings rail shows "12 WIN", "0 WIN" instead of "12 WINS", "0 WINS".
**Fix:** Line 84: change to `<span className="text-outline">{row.wins === 1 ? 'WIN' : 'WINS'}</span>`. Apply same fix in `apps/web/app/results/[season]/drivers/page.tsx` and `.../teams/page.tsx` if they have the same pattern.
**Why:** One-line correctness; matches the editorial tone in CLAUDE.md.

### [apps/web/components/home/QuickLinks.tsx:5] [P3] Standings chip hardcodes 2026 — will rot in 2027
**What's broken:** The "Standings" chip is hardcoded to `/results/2026/drivers`. When the year flips, it silently points at last season.
**User-visible symptom:** In January 2027, "Standings" still shows 2026 unless someone touches the file.
**Fix:** Once the `[season]/current → 'current'` fix from the StandingsPreview finding lands, change this href to `/results/current/drivers`. Otherwise, swap to a computed value with `` `/results/${new Date().getFullYear()}/drivers` `` inside the component (must mark as a server component or run in `generateMetadata`-style flow; the file already has no `'use client'` so it's server-rendered → safe).
**Why:** Self-healing across season boundaries; matches how `StandingsPreview` already uses `jolpica.getDriverStandings('current')`.

### [apps/web/components/home/FeaturedVideoRail.tsx:18-22] [P3] Section subtitle hardcodes channel list — drifts from YT_F1_CHANNELS
**What's broken:** The subtitle text is literal: "Latest from FORMULA 1, Chain Bear, Tommo F1, Driver61". If `YT_F1_CHANNELS` adds/removes a channel (e.g. WTF1, which is referenced in `/video/page.tsx` metadata), this string lies.
**User-visible symptom:** Section claims four channels but rail shows videos from five (or three).
**Fix:** Import `YT_F1_CHANNELS` (already imported on `/video/page.tsx`) and render `YT_F1_CHANNELS.map(c => c.name).join(', ')`.
**Why:** Single source of truth — copy and data both live in `@apex/api-client/youtube`.

---

COUNT: P0=3 P1=3 P2=3 P3=4

TOP_FIVE_PRIORITY:
1. `NewsletterCTA.tsx:9-18` — homepage newsletter is fully simulated. **Highest-conversion CTA on the site is fake.** Fix first.
2. `QuickLinks.tsx:9` — `/results/archive` 404s. Visible dead link in primary nav rail.
3. `StandingsPreview.tsx:56,63` — both "FULL STANDINGS" buttons crash on `/results/current/*`. Two dead CTAs below a live standings table.
4. `HighlightsRail.tsx:35` — Formula 1 channel filter silently no-ops because of slug mismatch.
5. `HeroLeadStoryClient.tsx:70-76` (+ HeroRail, FeaturedVideoRail, EditorsPicks "ALL/MORE →" links) — internal links bypass `next/link` → full page reloads.

FIX_BUNDLE_SIZE: ~180 LOC total
- Newsletter form refactor (extract shared form): ~60 LOC
- `/results/archive/page.tsx` new route: ~50 LOC
- `[season]/drivers` + `[season]/teams` 'current' handling: ~10 LOC
- Channel slug fix: 1 LOC
- `<a>` → `<Link>` swaps across 4 files: ~10 LOC
- SocialPulse degraded state: ~15 LOC
- Image-less card placeholders: ~10 LOC
- Hero `<img>` upgrade: ~5 LOC
- PartnerBar links + about CTA: ~8 LOC
- Pluralization + dynamic year + dynamic channel subtitle: ~10 LOC
