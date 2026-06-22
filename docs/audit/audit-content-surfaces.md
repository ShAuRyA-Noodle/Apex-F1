# Content audit — /latest /video /predict /membership /newsletter /admin /about /legal/*

Confirmed: `PredictResult` is defined but is never imported anywhere — pure dead component. `/admin/runs` and `/account` both 404. Now I have full enough picture. Let me build the audit report.

### [apps/web/app/admin/page.tsx:51-60] [SEVERITY: P0] [Tile link "/admin/runs" → 404]
**What's broken:** The "Ingestion runs" tile on the admin dashboard `href`s to `/admin/runs`, but no route exists at `apps/web/app/admin/runs/*`.
**User-visible symptom:** Admin clicks "Open →" on the Ingestion runs tile → Next.js 404 page.
**Fix:** Either (a) create `apps/web/app/admin/runs/page.tsx` that reads from a real worker-run audit table, or (b) until Phase C ships, gate the tile behind a "comingSoon" badge and `aria-disabled` it. Concrete patch on `Tile`:
```tsx
<Tile href="/admin/runs" title="Ingestion runs" desc="..." comingSoon />
```
Then in `Tile` swap `<Link>` for a disabled `<div>` with a `SOON` chip when `comingSoon`.
**Why:** CORE RULE — "every link must resolve to a non-404 page". A dead tile on the operator console is the worst kind of dead link.

### [apps/web/app/legal/terms/page.tsx:44-45] [SEVERITY: P0] [Terms references non-existent /account page]
**What's broken:** Termination clause says "You may close your account at any time from the Account page." but `/account` is not in the route tree (only `/admin`, `/membership`, `/newsletter` exist).
**User-visible symptom:** Legal commits Apex to an account-closure UX that does not exist. Compliance + UX trap.
**Fix:** Remove the sentence until Supabase Auth + `/account` ship in Phase C. Patch:
```tsx
<p>
  We may suspend access for abuse, automated overload, or violation of these Terms. Account
  deletion will be available from the Account page once authenticated accounts launch in Phase C; in the interim, email{' '}
  <a href="mailto:privacy@apex.example" className="text-telemetry-red underline">privacy@apex.example</a> to request deletion.
</p>
```
**Why:** Terms must mirror shipped surfaces, not the roadmap.

### [apps/web/app/api/newsletter/route.ts:20-29] [SEVERITY: P1] [Newsletter capture is console.log only — synthetic persistence]
**What's broken:** `/api/newsletter` accepts the email, logs it with `console.log`, and returns `{ ok: true }`. Nothing is written to Supabase, Resend, or any persistent store. Captured emails disappear at next deploy/restart.
**User-visible symptom:** User sees "✓ Captured. First edition lands the next race week." but they will never receive an edition because no list exists.
**Fix:** Either (a) wire to Resend audience via `RESEND_API_KEY` + `RESEND_AUDIENCE_ID` (the keys list in the brief is missing these but the brief also says no fake fallback), or (b) downgrade the success copy to acknowledge the pre-launch state. Minimum patch at `apps/web/app/newsletter/form.tsx:73`:
```tsx
{state === 'success' && (
  <p className="mt-3 text-sm text-on-surface">
    ✓ Email queued. Mailing list goes live with Phase C — first edition ships once Resend is provisioned.
  </p>
)}
```
And persist captures to a Supabase `newsletter_signup` table now even without the sender wired, so no email is dropped on the floor.
**Why:** Promising "first edition next race week" while throwing the email into stderr is exactly the synthetic UX the mandate bans.

### [apps/web/app/api/articles/route.ts:42-46] [SEVERITY: P1] [Article save is console.log only — no DB write even when DATABASE_URL set]
**What's broken:** When `DATABASE_URL` is set, the editor calls `POST /api/articles`, the handler validates slug + title, then `console.log`s and returns `{ ok: true }`. No Drizzle insert, no row created. The "Saved ✓" pill is a lie even on a fully-provisioned environment.
**User-visible symptom:** Editor sees green "Saved ✓" but the article never appears in `/latest`, `/admin/articles` (no list view exists either), or any DB table.
**Fix:** Wire the Drizzle insert now. Patch `apps/web/app/api/articles/route.ts`:
```ts
import { db } from '@apex/db';
import { articles } from '@apex/db/schema';
// ...
const [row] = await db.insert(articles).values({
  slug, title, dek: body.dek ?? '', section: body.section ?? 'NEWS',
  bodyMd, status: 'draft', createdAt: new Date(),
}).returning({ id: articles.id });
return NextResponse.json({ ok: true, id: row.id });
```
If the `articles` table schema is not in `@apex/db/schema`, ship the migration in the same PR.
**Why:** A Save button that returns 200 without a write is worse than a 503 — it tells the editor their work is safe when it is not.

### [apps/web/app/admin/articles/editor.tsx:128-135] [SEVERITY: P2] [Publish button is permanently disabled w/ no roadmap path]
**What's broken:** "Publish" button is `disabled` with only a `title` tooltip. There is no enabled state anywhere in the flow — even with DB provisioned, the button stays cold.
**User-visible symptom:** Editor finishes a draft and has no way to ship it. No "Save Draft → review → Publish" loop closes.
**Fix:** Either remove the button until Phase C, or wire it to `POST /api/articles` with `status: 'published'` and `publishedAt: new Date()` (gated on auth role check). At minimum add a `SOON` chip:
```tsx
<span className="ml-2 rounded-sm bg-outline-variant/40 px-1.5 text-[10px] tracking-normal text-outline">PHASE C</span>
```
**Why:** A permanently dead button violates the "every button must have a real onClick" rule.

### [apps/web/components/predict/PredictResult.tsx:1-217] [SEVERITY: P2] [PredictResult component is never mounted anywhere]
**What's broken:** `grep -r PredictResult apps/web/app apps/web/components` shows it is defined but imported zero times. The entire score-vs-result Giphy reaction overlay is dead code.
**User-visible symptom:** User saves their picks at /predict, the race runs, they reload — no scoring happens, no overlay shows, the picks just sit in localStorage forever.
**Fix:** Add a server-side scorer that, when the race is past, reads `picks` from localStorage on `/predict` client mount, fetches the official race result via `jolpica.getRaceResult`, computes the score, and renders `<PredictResult gif={...} score={...} maxScore={13} raceName={next.name} />`. Drop it into `predict-form.tsx` behind a `useEffect` that triggers when `isLocked && raceHasResults`. The Giphy fetch lives in `@apex/api-client/giphy`.
**Why:** The "score on Sunday" promise in the How-It-Works grid (line 79-92 of predict/page.tsx) is never fulfilled. Picks save, results never arrive, overlay never shows.

### [apps/web/app/predict/predict-form.tsx:13-43] [SEVERITY: P1] [Driver options hardcoded — synthetic roster]
**What's broken:** `QUESTIONS` hardcodes `['Verstappen', 'Norris', 'Piastri', 'Leclerc', 'Hamilton', 'Russell', 'Antonelli', 'Other']`. No call to `jolpica.getDrivers(currentSeason)`. Hardcoded "Antonelli" is also a 2026 assumption baked into a client component — when the season rotates the picker is wrong.
**User-visible symptom:** User picking the pole on a 2027 race sees the 2026 driver list. "Other" is a non-answer hatch that lets the user mark anyone but never scores.
**Fix:** Lift driver options server-side in `predict/page.tsx`:
```tsx
const drivers = await jolpica.getDrivers(next.season);
<PredictForm drivers={drivers.slice(0,7).map(d => d.surname)} ... />
```
Then in `predict-form.tsx` accept `drivers: string[]` and build `QUESTIONS` from it.
**Why:** CORE RULE — "every stat must come from a real source". A pick list is a stat.

### [apps/web/app/legal/disclaimer/page.tsx:62-66] [SEVERITY: P2] [legal@apex.example mailto goes nowhere]
**What's broken:** `mailto:legal@apex.example` uses the IANA-reserved `.example` TLD that cannot accept mail. Same applies to `privacy@apex.example` in `apps/web/app/legal/privacy/page.tsx:52`.
**User-visible symptom:** User clicks "report a copyright concern" → mail client opens → message bounces.
**Fix:** Either reserve `legal@apex.gg` / `privacy@apex.gg` to match the DMCA page (line 48 of `apps/web/app/legal/dmca/page.tsx` already uses `dmca@apex.gg`), or use a single `contact@apex.gg` inbox until the domain ships email. Patch both files:
```tsx
<a href="mailto:legal@apex.gg" className="text-telemetry-red underline">legal@apex.gg</a>
<a href="mailto:privacy@apex.gg" className="text-telemetry-red underline">privacy@apex.gg</a>
```
**Why:** Three legal pages, three different fake/placeholder addresses, one real one (`dmca@apex.gg`). Pick one, register it, ship.

### [apps/web/app/about/page.tsx:51-67] [SEVERITY: P3] [About data-sources list missing live providers shown elsewhere]
**What's broken:** About page lists only Jolpica, OpenF1, Wikidata, OpenWeatherMap. But `/latest` is built on RSS aggregator + Guardian + GNews + NewsData, `/video` is built on YouTube Data API, predict reactions use Giphy. None of these appear on About.
**User-visible symptom:** A fan checking "what data does Apex use" gets an incomplete answer, undermining the "honest" pillar (line 41-46).
**Fix:** Append to the `<ul>`:
```tsx
<li><strong>RSS</strong> · Motorsport.com, Autosport, RaceFans, The Race.</li>
<li><strong>The Guardian</strong> · sport/motorsports section via official API.</li>
<li><strong>GNews + NewsData.io</strong> · multi-language F1 coverage + sentiment.</li>
<li><strong>YouTube Data API</strong> · curated F1 channel video metadata.</li>
<li><strong>Giphy</strong> · reaction images on the prediction surface.</li>
```
**Why:** The About page is the trust anchor — leaving five live providers off it makes the page synthetic.

### [apps/web/app/membership/page.tsx:55-72] [SEVERITY: P3] [Founding-member button has tooltip but no visible badge]
**What's broken:** The "Founding member · launches with Apex+" button is disabled with a `title` hover tooltip. The tooltip is fine on desktop, invisible on mobile/touch.
**User-visible symptom:** Mobile user taps the headline CTA, nothing happens, no explanation.
**Fix:** Add a visible `SOON` chip and a paragraph under the button:
```tsx
<button ... className="...">
  Founding member · launches with Apex+
  <span className="ml-2 rounded-sm bg-outline-variant/40 px-1.5 text-[10px] tracking-normal text-outline">PHASE C</span>
</button>
<p className="mt-3 text-xs text-outline">Checkout opens once Stripe is provisioned. Get notified below to be first in line.</p>
```
**Why:** "Coming soon stubs without explicit user-facing badge" is explicitly banned by the CORE RULES.

### [apps/web/app/predict/predict-form.tsx:74-82] [SEVERITY: P3] [Save button gives no toast on storage write failure]
**What's broken:** `localStorage.setItem` is wrapped in try/catch that swallows quota-exceeded / Safari-private-mode errors silently. The user sees "Saved ✓" even on failure.
**User-visible symptom:** Quota-exceeded user thinks their picks persisted; reload wipes them.
**Fix:**
```tsx
function save() {
  try {
    window.localStorage.setItem(storageKey(raceSlug, season), JSON.stringify(picks));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  } catch {
    setSaved(false);
    setError('Storage blocked. Picks held in memory only — disable private mode.');
  }
}
```
Add an `error` state alongside `saved`.
**Why:** "Saved ✓" must be true. Silent fallback to memory-only is synthetic UX.

### [apps/web/app/video/page.tsx:170-175] [SEVERITY: P3] [Video card has data-apex-video-id but no embed modal listener]
**What's broken:** Each `<a>` carries `data-apex-video-id`, `data-apex-video-title`, `data-apex-video-channel` props (line 172-174) clearly intended to be picked up by a click-intercepting modal opener. No modal mount, no handler exists anywhere in the tree to read those attributes — confirmed by grepping `data-apex-video-id` and finding only the writer side. Click always falls through to a new YouTube tab.
**User-visible symptom:** Brief promised "Modal opens for embeddable, redirects for non-embeddable" — nothing opens. Always full-page leaves to YouTube.
**Fix:** Add a `<VideoEmbedModal>` client component at the page level that listens to clicks bubbled up from `[data-apex-video-id]`, prevents default when present, and mounts a YouTube `iframe` with the standard `https://www.youtube.com/embed/${id}` URL. Non-embeddable videos (no `data-apex-video-id`) keep the redirect path.
**Why:** Every link should land somewhere real — and a card that pretends to support inline play but never does is dead UX dressed as live UX.

---

COUNT: P0=2 P1=3 P2=3 P3=5

TOP_FIVE_PRIORITY:
1. `apps/web/app/admin/page.tsx:51` — `/admin/runs` tile 404s. Either build the route or chip-disable it.
2. `apps/web/app/api/articles/route.ts:42` — Article Save returns 200 without writing to DB. Wire Drizzle insert immediately or surface 503.
3. `apps/web/app/api/newsletter/route.ts:24` — Newsletter capture is console.log only. Persist to a Supabase table now even before Resend ships.
4. `apps/web/components/predict/PredictResult.tsx` — Entire scoring + Giphy reaction overlay is dead code; never imported. Mount it in `predict-form.tsx` and wire to a real Jolpica race-result fetch.
5. `apps/web/app/predict/predict-form.tsx:13-43` — Driver options hardcoded; replace with `jolpica.getDrivers(season)` server-side and pass as prop.

FIX_BUNDLE_SIZE: approx 320 LOC across 10 files (largest chunks: PredictResult wiring + scorer ~120 LOC, articles Drizzle insert + schema migration ~80 LOC, newsletter Supabase insert ~30 LOC, admin/runs page or chip-disable ~30 LOC, driver-options refactor ~25 LOC, remaining polish ~35 LOC).
