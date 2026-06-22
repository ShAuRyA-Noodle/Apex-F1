# Shell audit — TopUtilityBar / MegaNav / RaceTickerBar / Footer / CookieConsent / PosthogScript / VideoPlayerModal

I have everything needed. Compiling the final audit.

---

### [apps/web/components/shell/TopUtilityBar.tsx:24] [SEVERITY: P0] [Sign-in link routes to a non-existent /account page]
**What's broken:** `authLinks` points to `/account` and `/account?signup=1` but no `app/account/page.tsx` exists. Same href is reused in MegaNav `MobileTakeover` (line 533).
**User-visible symptom:** Clicking "SIGN IN" or "CREATE" in the top utility bar or the mobile menu sends the user straight to a Next.js 404.
**Fix:** Either (a) scaffold `apps/web/app/account/page.tsx` with a real magic-link auth flow (Supabase / Clerk / Resend-OTP) — recommended; or (b) until auth lands, retarget both links to `/newsletter` (the only thing in this codebase that captures an identity today) and wrap "Create" in a `disabled` badge. The fastest honest fix in this PR: change href to `/newsletter?intent=signin` and `/newsletter?intent=signup`, then have `/newsletter` read `?intent` and preselect copy.
**Why:** A dead Sign-in button on every page violates the "nothing should be dead" mandate harder than anything else in the shell.

### [apps/web/components/shell/TopUtilityBar.tsx:19] [SEVERITY: P0] [Archive link routes to a non-existent /results/archive]
**What's broken:** Link points to `/results/archive`. The results router only resolves `/results/[season]/(drivers|teams)`. `/results/archive` is not a route. Same href is reused in `MegaNav` (line 108) and `Footer` (lines 15 and 49 group).
**User-visible symptom:** "ARCHIVE" in the utility bar, "All seasons" in the Results mega-dropdown, and the Footer "Archive" link all 404.
**Fix:** Create `apps/web/app/results/archive/page.tsx` that lists every season Jolpica reports (`jolpica.getSeasons()`) and links each card to `/results/[season]/drivers`. Until that ships, retarget to `/results/2026/drivers` and rename label to "Latest results".
**Why:** Three shell surfaces lean on this URL; one fix unblocks all three.

### [apps/web/components/shell/MegaNav.tsx:109] [SEVERITY: P0] [Champions index link 404s]
**What's broken:** `Results > Archive > Champions index` and Footer `Grid > Champions` both target `/drivers/champions`, but `app/drivers/` only ships `page.tsx` and `[slug]/page.tsx`. There is no `/drivers/champions` route.
**User-visible symptom:** "Champions index" dropdown row and "Champions" footer link 404.
**Fix:** Add `apps/web/app/drivers/champions/page.tsx` that pulls `jolpica.getDriverStandings()` for each completed season and surfaces season-champion rows. Until then, redirect via `next.config.mjs` rewrites: `{ source: '/drivers/champions', destination: '/results/archive' }`.
**Why:** A label as load-bearing as "Champions" should not vanish into a 404 — either build the page or hide the link.

### [apps/web/components/shell/MegaNav.tsx:129] [SEVERITY: P0] [Hall of Fame link 404s]
**What's broken:** MegaNav `Drivers > Hall > Hall of Fame` (line 129) and Footer `Grid > Hall of Fame` (line 23) both link to `/drivers/hall-of-fame`. No such page exists.
**User-visible symptom:** 404 from two prominent shell surfaces.
**Fix:** Either delete both entries from `NAV` and `groups` arrays (cleanest), or scaffold `apps/web/app/drivers/hall-of-fame/page.tsx` that filters Jolpica drivers with championship count >= 1 and renders as an editorial wall.
**Why:** Dead nav items signal "vapor" — the founder is explicit: no "Coming soon" without a visible badge.

### [apps/web/components/shell/MegaNav.tsx:60-64] [SEVERITY: P1] [Latest dropdown preview is hardcoded "Verstappen reacts to Singapore floor change"]
**What's broken:** `preview` object on the Latest section is a literal string ('BREAKING' / 'Verstappen reacts to Singapore floor change' / '14 min ago · Autosport'). It never refetches and will read identically a year from now.
**User-visible symptom:** Every visitor on every page sees the same stale "BREAKING" preview card in the Latest mega-dropdown. Violates "no synthetic data."
**Fix:** Promote `MegaNav` to a server component shell that fetches the top article from `lib/news/aggregator.ts` (the same source `/latest` uses) and passes a `latestPreview` prop into a client `MegaNavInteractive`. Cache with `revalidate: 300`. Build preview as `{ eyebrow: source.toUpperCase(), title: article.title, href: article.url ?? '/latest', meta: `${relativeTime(article.publishedAt)} · ${article.source}` }`.
**Why:** This card is the most-seen "headline" on the site — making it real is the highest-leverage truth fix in the shell.

### [apps/web/components/shell/MegaNav.tsx:86-91] [SEVERITY: P1] [Schedule dropdown preview is hardcoded "Marina Bay Street Circuit · 13d 4h"]
**What's broken:** Static preview string for the Schedule mega-dropdown. The countdown "13d 4h" is a literal string; the circuit is hardcoded "Marina Bay"; href is hardcoded `/schedule/2026/singapore`.
**User-visible symptom:** Schedule dropdown shows a wrong next-race name and a fake countdown. Diverges from the real ticker chip directly below it.
**Fix:** Same pattern as the Latest preview: fetch the same `pickWindow()` already used in `RaceTickerBar.tsx`, derive `nextRace`, pass `{ eyebrow: 'NEXT ROUND', title: nextRace.circuitName, href: '/schedule/' + nextRace.season + '/' + nextRace.slug, meta: `Lights out · ${formatDelta(nextRace.raceStartIso)}` }` into MegaNav. Recompute `meta` on the client every 60s with `useEffect` to avoid the static-string problem.
**Why:** The ticker bar already knows the next race — the dropdown should consume the same source, not invent its own.

### [apps/web/components/shell/MegaNav.tsx:613-624] [SEVERITY: P2] [Search overlay "SUGGESTED" items have no onClick that searches]
**What's broken:** The four suggested-search rows ('Next race · Singapore', 'Drivers · 2026 grid', etc.) only call `onClose`. They do not run a search, navigate, or populate the input.
**User-visible symptom:** Click a suggestion → modal closes silently. No search runs, user lands back on the same page.
**Fix:** Map each suggestion to `{ label, query, href }` and on click do `router.push(href)` (`useRouter` from `next/navigation`). Concretely: `[{label:'Next race · Singapore', href:'/schedule'},{label:'Drivers · 2026 grid', href:'/drivers'},{label:'Results · Constructors', href:'/results/2026/teams'},{label:'Live timing', href:'/live/timing'}]`. Also make the input `<form action="/search">` so pressing Enter actually submits to the real `/search` route.
**Why:** Site-wide search modal that swallows clicks is the most obviously dead element after the auth links.

### [apps/web/components/shell/MegaNav.tsx:594-601] [SEVERITY: P2] [Search overlay input is not wired to the /search route]
**What's broken:** `<input>` updates local `q` state but there is no submit handler. Pressing Enter does nothing; there is no `<form>` element.
**User-visible symptom:** User types "Hamilton 2017", hits Enter, modal stays open, nothing happens.
**Fix:** Wrap the input in `<form onSubmit={e => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q)}`); onClose(); }}>`. Add Enter-key affordance copy ('PRESS RETURN').
**Why:** `/search` already exists with a `SearchClient`; the shell just needs to deliver the query to it.

### [apps/web/components/shell/MegaNav.tsx:233-235] [SEVERITY: P3] [Hardcoded "v0.1 · BETA" version badge in nav]
**What's broken:** Version string is a literal in JSX; updated only when an engineer remembers. Same string repeated in `Footer.tsx:164-166`.
**User-visible symptom:** Two surfaces will eventually disagree about the version.
**Fix:** Read from `package.json` at build via `process.env.NEXT_PUBLIC_APP_VERSION` populated in `next.config.mjs` (`env: { NEXT_PUBLIC_APP_VERSION: require('./package.json').version }`). Source the phase from `apps/web/lib/site-config.ts` so both surfaces stay in sync.
**Why:** A single source of truth means the badge becomes real metadata, not decorative paint.

### [apps/web/components/shell/RaceTickerBar.tsx:39-41] [SEVERITY: P2] [Empty-catch on Jolpica fetch swallows errors silently]
**What's broken:** `catch { races = []; }` swallows the error with no log, no Sentry, no telemetry. When Jolpica is down the user sees `RaceTickerEmpty` but devs cannot see why.
**User-visible symptom:** Permanently-empty ticker bar with no diagnostic — operator cannot tell if Jolpica is down or the mapping is broken.
**Fix:** `catch (err) { console.error('[RaceTickerBar] jolpica.getSchedule failed', err); }` and once PostHog is live, emit `posthog.capture('feed_failure', { source: 'jolpica', surface: 'ticker' })`. Same pattern needed at line 73 (`openmeteo`).
**Why:** Silent failures are worse than visible failures — operators can't fix what they can't see.

### [apps/web/components/shell/RaceTickerCountdown.tsx:11-17] [SEVERITY: P3] [Countdown ticks while tab is hidden]
**What's broken:** `setInterval(..., 1000)` runs even in background tabs and even after the race has started (delta clamped to 0 but timer keeps firing).
**User-visible symptom:** Wakes laptops from battery saver to do nothing.
**Fix:** Add `if (document.visibilityState !== 'visible') return;` inside the tick, listen on `visibilitychange`, and stop the interval once `delta === 0` for >1s.
**Why:** Free perf — countdown is the most-rendered timer in the shell.

### [apps/web/components/shell/Footer.tsx:166] [SEVERITY: P1] [Footer "ALL SYSTEMS OPERATIONAL" is hardcoded — does not reflect actual feed health]
**What's broken:** `<LiveStatusDot label="ALL SYSTEMS OPERATIONAL" />` always renders the same string. There is no health check.
**User-visible symptom:** Even when Jolpica / NewsAPI / YouTube are down (which the catch on RaceTickerBar:39 will swallow into an empty chip), the footer continues to claim everything is fine.
**Fix:** Add `app/api/health/feeds/route.ts` that pings Jolpica, OpenMeteo, NewsAPI and returns `{ jolpica: 'up', news: 'degraded', ... }`. Turn the footer dot into a client component that polls every 60s and switches label to `'X FEEDS DEGRADED'` or `'ALL SYSTEMS OPERATIONAL'` based on the result. Tie the dot color to overall status (red on full outage).
**Why:** A status indicator that cannot turn red is decoration, not telemetry.

### [apps/web/components/shell/Footer.tsx:107-114] [SEVERITY: P2] [Newsletter CTA in footer links to /newsletter but doesn't pass a referrer]
**What's broken:** "JOIN THE PIT WALL" button goes to `/newsletter` but doesn't tag the source. If `/newsletter` ever runs A/B tests or attribution, the footer signup is invisible.
**User-visible symptom:** Operators cannot tell which surface drives the signups they get.
**Fix:** `href="/newsletter?ref=footer-hero"`. Add the same `?ref=` pattern to the utility-bar Newsletter link (`?ref=utility-bar`), the mega-nav mobile takeover Newsletter (`?ref=mobile-takeover`), and the footer column Newsletter (`?ref=footer-col`).
**Why:** Attribution costs zero LOC and enables real growth decisions later.

### [apps/web/components/shell/Footer.tsx:42] [SEVERITY: P3] [Newsletter appears twice in the same footer]
**What's broken:** "Newsletter" is in both the `Coverage` column (line 33) and the `Apex` column (line 42).
**User-visible symptom:** Reads like a layout mistake.
**Fix:** Remove from `Apex` group; replace with something useful — e.g. `{ label: 'Status', href: '/status' }` once the health endpoint above ships, or `{ label: 'Changelog', href: '/changelog' }`.
**Why:** Duplicate nav reads as sloppy; this is a 1-line cleanup.

### [apps/web/components/shell/CookieConsent.tsx:32-46] [SEVERITY: P1] [Save Preferences persists to localStorage only — nothing reads it]
**What's broken:** Consent saves `{analytics, marketing, ts}` to `localStorage['apex.consent.v1']`. But `PosthogScript.tsx` does not read this key — it loads PostHog unconditionally whenever `NEXT_PUBLIC_POSTHOG_KEY` is set, ignoring the user's analytics opt-out. No GA/Plausible reads it either. Marketing toggle drives nothing.
**User-visible symptom:** User clicks "REJECT" and PostHog still tracks them. GDPR / CCPA violation in flight.
**Fix:** Two parts.
1. In `PosthogScript.tsx`, before rendering `<Script>`, read `window.localStorage.getItem('apex.consent.v1')` (must run after hydration via `useState`/`useEffect`), parse it, and only emit the script if `consent.analytics === true`.
2. Add a `consent-changed` `CustomEvent` dispatch inside `save()` in `CookieConsent.tsx`, and have `PosthogScript` listen for it so a user who flips analytics from off → on starts tracking without a page reload.
**Why:** Right now the cookie banner is theatre. This is the most legally-exposed dead thing in the shell.

### [apps/web/components/shell/CookieConsent.tsx:95-97] [SEVERITY: P3] [Privacy link is a raw `<a>` not a Next `Link`]
**What's broken:** `<a href="/legal/privacy">` causes a full page reload.
**User-visible symptom:** Privacy click hard-navigates, losing Lenis smooth-scroll state.
**Fix:** Replace with `<Link href="/legal/privacy">` from `next/link` (already imported elsewhere; need to add the import).
**Why:** Trivial perf + UX consistency fix.

### [apps/web/components/shell/PosthogScript.tsx:9-18] [SEVERITY: P1] [PostHog loads ignoring user consent]
**What's broken:** Script renders solely on `NEXT_PUBLIC_POSTHOG_KEY` presence; ignores `localStorage['apex.consent.v1'].analytics`. Pairs with the CookieConsent finding above.
**User-visible symptom:** Analytics fires on first paint, before the banner even mounts (banner has 800ms delay).
**Fix:** Make this a client component that (a) reads `apex.consent.v1`, (b) defaults to NOT loading on first paint, (c) loads only after the user explicitly opts in. If you want first-paint analytics, the consent banner needs to render server-side blocked content until consent is recorded.
**Why:** Compliance-grade fix that the founder's "real" mandate must include.

### [apps/web/app/layout.tsx:62-67] [SEVERITY: P3] [Skip-to-content link targets `#main` but `<main>` has no scroll-margin]
**What's broken:** Skip link works at the DOM level (focus moves to `<main id="main">`), but because Lenis takes over scrolling, the focus jump doesn't always trigger the scroll on Safari/iOS.
**User-visible symptom:** Keyboard user presses Tab on first load, sees the red Skip-to-content chip, hits Enter — viewport may not scroll on iOS Safari.
**Fix:** Add `tabIndex={-1}` and `scroll-mt-32` to `<main>`, and in the skip-link onClick call `lenisRef.current?.scrollTo('#main', { offset: -16 })`. Easiest plumbing: expose Lenis on `window.__apexLenis` from `LenisProvider`.
**Why:** This is the WCAG 2.1 SC 2.4.1 escape hatch — must work or accessibility audits fail.

### [apps/web/components/shell/TopUtilityBar.tsx:99-110] [SEVERITY: P2] [LiveStatusDot is decorative — not bound to anything real]
**What's broken:** `LiveStatusDot` is exported from TopUtilityBar but rendered only by Footer with a hardcoded label. It does not subscribe to `/api/live/stream` (the SSE endpoint the founder mentioned). It cannot turn red.
**User-visible symptom:** During an actual race, the dot says "ALL SYSTEMS OPERATIONAL" even if telemetry is degraded.
**Fix:** Convert `LiveStatusDot` into a client component that opens an `EventSource('/api/live/stream')` (or polls `/api/health/feeds`) and recolors itself + relabels itself based on the heartbeat. Add a tooltip on hover that lists the upstream feeds.
**Why:** Pairs with finding [Footer.tsx:166] — same root cause, same fix.

### [apps/web/components/shell/MegaNav.tsx:289-291] [SEVERITY: P3] [The "/" hint label next to search button does not actually open search]
**What's broken:** Visual cue says "/" but pressing the `/` key does not focus search. There is no global keydown listener.
**User-visible symptom:** Power user sees the hint, presses `/`, nothing happens. Reads as fake affordance.
**Fix:** Add a window-level `keydown` listener inside `MegaNav` that opens the search overlay when `e.key === '/' && document.activeElement?.tagName !== 'INPUT'`. Honor `e.metaKey` for `cmd+k` as well — users expect both.
**Why:** Showing a key-hint and not honoring it is precisely the kind of "looks alive, does nothing" the founder is hunting.

### [apps/web/components/shell/MegaNav.tsx:280] [SEVERITY: P3] [Search button does not announce its keyboard shortcut to screen readers]
**What's broken:** `aria-label="Open search"` does not include the `/` shortcut, and the visible "/" pill has no `aria-label` of its own.
**User-visible symptom:** Screen reader users do not know the shortcut exists.
**Fix:** `aria-label="Open search (press /)"` once the shortcut is wired.
**Why:** Tiny a11y polish; only relevant after the shortcut fix above.

### [apps/web/components/video/VideoPlayerModal.tsx:46] [SEVERITY: P3] [Right-click on a video trigger still falls through to YouTube]
**What's broken:** Modifier-click bypass is for meta/ctrl/shift and middle-click only; right-click context menu still hits whatever `<a>` the trigger sits inside, which may not have an `href`.
**User-visible symptom:** Right-click "Open in new tab" on a video card might land on an empty href.
**Fix:** Either guarantee every `[data-apex-video-id]` element is an `<a href="https://www.youtube.com/watch?v=..."` so the browser context menu opens YouTube in a new tab, or detect `ev.button === 2` and let it pass through with explicit URL.
**Why:** Reinforces the "every link must resolve somewhere real" rule for the video grid.

### [apps/web/components/shell/Toast.tsx:120-127] [SEVERITY: P3] [Toast remaining-time math drifts on second hover-pause]
**What's broken:** `remaining.current = remaining.current - (Date.now() - startedAt.current)` runs every time hover flips, but `startedAt.current` is only reset in the else branch. After several hover-in/hover-out cycles remaining can go negative.
**User-visible symptom:** A user who hovers a toast twice gets immediate dismiss on un-hover.
**Fix:** Set `startedAt.current = Date.now()` in the `if (hover)` branch too so the next "resume" subtracts only the un-hovered span.
**Why:** Edge-case bug that only bites careful users — but it bites.

### [apps/web/components/shell/EmptyState.tsx:80-82] [SEVERITY: P3] [EmptyState action uses raw `<a>` for hrefs — loses Next router]
**What's broken:** `ActionLink` renders a plain `<a href>` for href actions, forcing a full page reload.
**User-visible symptom:** "See 2025 standings" / "Browse video archive" buttons in empty states hard-navigate.
**Fix:** Replace with `<Link href={action.href}>` from `next/link`.
**Why:** Same UX consistency fix as cookie consent privacy link.

### [apps/web/components/shell/ApexMonogram.tsx:24] [SEVERITY: P3] [`.stroke-draw` class referenced but only one keyframe defined inline]
**What's broken:** `className=stroke-draw` is appended but the actual stroke-draw keyframes for the two diagonal strokes are not visible in this file or in `globals.css` excerpt — only `apex-fade-in` is inlined. Need to verify `.stroke-draw` is defined; if missing the comment "1.1s stroke-draw on first paint" is misleading.
**User-visible symptom:** The logo backplate fades in but the strokes don't actually draw — feature lies about itself.
**Fix:** Add to `apps/web/app/globals.css`:
`.stroke-draw path[stroke] { stroke-dasharray: 100; stroke-dashoffset: 100; animation: apex-stroke-draw 1.1s ease-out 0.1s forwards; } @keyframes apex-stroke-draw { to { stroke-dashoffset: 0; } }` — and verify visually on the next dev reload.
**Why:** Either deliver the animation the comment promises or remove the comment.

### [apps/web/components/motion/LenisProvider.tsx:17-19] [SEVERITY: P3] [Reduced-motion users get default browser scroll with no Lenis, no fallback class]
**What's broken:** When `prefers-reduced-motion: reduce`, Lenis never mounts and `lenis-smooth` class is never added. That's correct, but ScrollTrigger (mentioned in comment) is now reading native scroll without a proxy — and there's no signal anywhere in the app that "smooth-scroll-aware" code paths should be skipped.
**User-visible symptom:** Any GSAP pin/scrub built against Lenis will jitter for reduced-motion users.
**Fix:** Expose a `useLenisEnabled()` context hook so motion-heavy components (`useGsap`, the hero pins) can branch on it; OR add an explicit `data-motion="reduced"` attribute on `<html>` and read it in CSS.
**Why:** Cleaner contract for the rest of the app's motion system.

---

COUNT: P0=4 P1=5 P2=5 P3=11
TOP_FIVE_PRIORITY:
1. [TopUtilityBar.tsx:24] Sign-in / Create both 404 — most-visible dead button on every page
2. [TopUtilityBar.tsx:19 + MegaNav.tsx:108 + Footer.tsx:15] `/results/archive` 404 from three shell surfaces — single missing page
3. [MegaNav.tsx:60-64] Latest dropdown "Verstappen reacts to Singapore floor change" is hardcoded — most-seen synthetic string in the app
4. [CookieConsent.tsx + PosthogScript.tsx] Consent banner is theatre — PostHog tracks rejected users (GDPR exposure)
5. [Footer.tsx:166 + TopUtilityBar.tsx:99] "ALL SYSTEMS OPERATIONAL" is hardcoded — status dot cannot turn red

FIX_BUNDLE_SIZE: ~520 LOC total
- Auth/account stub or rewrite to `/newsletter?intent=*`: ~40 LOC
- `/results/archive` page (Jolpica seasons list): ~120 LOC
- `/drivers/champions` page: ~90 LOC
- `/drivers/hall-of-fame` (or delete links): ~60 LOC
- MegaNav previews wired to real feeds: ~60 LOC
- Search overlay onClick router + form submit + `/` keybinding: ~30 LOC
- CookieConsent → PosthogScript consent gate + custom event: ~25 LOC
- `/api/health/feeds` + live LiveStatusDot client component: ~50 LOC
- Misc polish (Toast math, Lenis flag, EmptyState Link, version badge, attribution refs, stroke-draw CSS): ~45 LOC

Files most-touched by this slice (absolute paths):
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/TopUtilityBar.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/MegaNav.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/Footer.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/CookieConsent.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/PosthogScript.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/RaceTickerBar.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/RaceTickerCountdown.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/Toast.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/EmptyState.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/shell/ApexMonogram.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/components/video/VideoPlayerModal.tsx
- /Users/shauryapunj/Desktop/F1_Claude/apps/web/app/layout.tsx
- New: /Users/shauryapunj/Desktop/F1_Claude/apps/web/app/account/page.tsx
- New: /Users/shauryapunj/Desktop/F1_Claude/apps/web/app/results/archive/page.tsx
- New: /Users/shauryapunj/Desktop/F1_Claude/apps/web/app/drivers/champions/page.tsx
- New: /Users/shauryapunj/Desktop/F1_Claude/apps/web/app/drivers/hall-of-fame/page.tsx (or remove the links)
- New: /Users/shauryapunj/Desktop/F1_Claude/apps/web/app/api/health/feeds/route.ts
