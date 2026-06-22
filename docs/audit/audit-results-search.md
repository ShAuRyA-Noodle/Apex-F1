# Results + Search audit — /results/* + /search + sort/filter pills

No em-dashes. Good. Now I'll compile the findings.

---

### [apps/web/app/search/search-client.tsx:53] [SEVERITY: P0] [Kind filter pill renders literal "Alls"]
**What's broken:** The trailing `s` after the ternary's closing brace is rendered for every pill including `'all'`, producing the label `Alls` instead of `All`.
**User-visible symptom:** First filter pill shows `Alls` instead of `All`. Looks like a typo bug in the most visible interactive control on the page.
**Fix:** Wrap the whole label in the ternary:
```tsx
{k === 'all' ? 'All' : `${k.charAt(0).toUpperCase()}${k.slice(1)}s`}
```
**Why:** The `s` plural only applies to driver/team/race, not "all". Current placement is a JSX precedence bug.

### [apps/web/app/search/search-client.tsx:63-83] [SEVERITY: P0] [Empty-state missing when zero results]
**What's broken:** When `results.length === 0`, the component renders an empty `<ul>` with two divider lines and no message. User typing a nonsense query sees a blank gap.
**User-visible symptom:** Type "asdfg" — counter shows `0 of N results`, then nothing below. Looks broken.
**Fix:** After the `<p>` counter, before the `<ul>`:
```tsx
{results.length === 0 ? (
  <div className="mt-10 border border-outline-variant/40 px-6 py-12 text-center">
    <div className="text-data text-outline">NO MATCH</div>
    <div className="mt-2 font-headline text-xl text-on-background">
      Nothing in the {kindFilter === 'all' ? 'index' : KIND_LABEL[kindFilter].toLowerCase() + ' index'} matches "{q}"
    </div>
    <button onClick={() => { setQ(''); setKindFilter('all'); }} className="mt-4 text-xs uppercase tracking-[0.18em] text-telemetry-red">Reset</button>
  </div>
) : (<ul>...</ul>)}
```
**Why:** Every other surface in Apex shows a labeled empty state; search is the one place users most expect feedback.

### [apps/web/app/search/page.tsx:68-70] [SEVERITY: P0] ["Coming soon" stub without badge — bans Archive search]
**What's broken:** Hero copy reads "Archive search lands in Phase B Wave 4 (Meilisearch over the 1950 -> present DB)." This is exactly the "Coming soon stub without user-facing badge" the founder mandate bans.
**User-visible symptom:** User reads a roadmap reference inside production UI. Breaks the "every feature is alive" promise.
**Fix:** Either ship archive search now (wire Meilisearch index, or fall back to multi-season Jolpica fetches for `getDriverStandings('1950'..'current')` aggregated server-side), or replace the copy with a small UI chip:
```tsx
<div className="mt-4 inline-flex items-center gap-2 border border-outline-variant/60 px-3 py-1">
  <span className="size-1.5 rounded-full bg-telemetry-red" />
  <span className="text-data text-on-surface-variant">CURRENT SEASON · ARCHIVE INDEX BUILDING</span>
</div>
```
and drop the prose reference to "Phase B Wave 4".
**Why:** Phase/wave terminology leaks engineering process into user UI. A status pill communicates the same thing as a real product affordance.

### [apps/web/app/results/[season]/drivers/page.tsx:65-113] [SEVERITY: P1] [Driver row not fully clickable — only name + team cells link]
**What's broken:** The `<tr>` has `group` hover styling implying full-row click affordance, but only the driver-name `<td>` (line 77) and team `<td>` (line 88) are wrapped in `<Link>`. POS, color bar, WINS, and PTS cells swallow clicks.
**User-visible symptom:** User clicks the points number or wins count next to Verstappen — nothing happens. Row hover lights up the whole row but only part of it routes.
**Fix:** Refactor to make the row act as a single navigation target. Cleanest pattern:
```tsx
<tr key={s.driver.slug} className="group transition-colors hover:bg-surface-container-low">
  <td className="...">
    <Link href={`/drivers/${s.driver.slug}`} className="absolute inset-0" aria-label={`${s.driver.fullName} profile`} />
    {String(s.position).padStart(2, '0')}
  </td>
  ...
</tr>
```
with `tr` set to `relative`. Keep the inner team `<Link>` as a stop-propagation nested link.
Or simpler — convert the table to an `<ol>` of `<Link>` rows like the constructor page already does (apps/web/app/results/[season]/teams/page.tsx:53-85).
**Why:** Constructor standings already use the "whole row is a Link" pattern. Drivers should match for behavioral parity.

### [apps/web/app/search/search-client.tsx:31-83] [SEVERITY: P1] [No keyboard navigation through results]
**What's broken:** Spec calls for arrow + enter keyboard nav. The component only has a vanilla `<input>` and a static result list — no `onKeyDown` handler, no focused-index state, no `aria-activedescendant`, no `role="listbox"`.
**User-visible symptom:** Power user tabs into the input, types, hits arrow down expecting to highlight the first result — nothing happens. Has to mouse to click.
**Fix:** Add `const [active, setActive] = useState(0);` and on the input `onKeyDown`:
```tsx
onKeyDown={(e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
  if (e.key === 'Enter' && results[active]) { router.push(results[active].href); }
}}
```
Add `role="listbox"` to `<ul>`, `role="option"` + `aria-selected={i===active}` + a `bg-surface-container` ring on the active row. Import `useRouter` from `next/navigation`.
**Why:** Modern command palettes (Linear, Vercel, Raycast) all expose this — F1 fans navigating standings during a race want speed.

### [apps/web/app/search/page.tsx:25-58] [SEVERITY: P1] [Search index excludes circuits, sessions, past seasons]
**What's broken:** Index is built from `'current'` standings + `'current'` schedule only. Searching for a circuit name ("Silverstone"), a past champion ("Senna"), a past team ("Lotus"), or a non-current driver returns zero hits even though those pages exist (`/drivers/[slug]/history`, `/teams/[slug]/history` are routed).
**User-visible symptom:** Typing "Senna" produces `0 of N results` — search appears broken since the app clearly has historical pages.
**Fix:** Until Meilisearch lands, broaden the index server-side. At minimum:
```tsx
const seasons = ['current', '2024', '2023', '2022', '2021'];
const driverSets = await Promise.all(seasons.map((s) => jolpica.getDriverStandings(s, { revalidate: 3600 })));
const teamSets   = await Promise.all(seasons.map((s) => jolpica.getConstructorStandings(s, { revalidate: 3600 })));
// dedupe by slug
const drivers = Array.from(new Map(driverSets.flat().map(mapDriverStanding).map((d) => [d.driver.slug, d])).values());
```
Also add circuits as a `kind` and surface them as `/schedule/${season}/${circuitId}`.
**Why:** A search bar over only the current season is a teaser, not a feature — and the data is already trivially accessible from Jolpica with one extra round-trip.

### [apps/web/app/search/search-client.tsx:14-15] [SEVERITY: P2] [Query state not synced to URL — search results not shareable / not bookmarkable / breaks back button]
**What's broken:** `q` and `kindFilter` live in `useState`, never reflected to the URL. Refresh wipes the search. Sharing a link to "Verstappen" search results is impossible. Back button after clicking a result loses the query.
**User-visible symptom:** User searches "Spain", clicks the Spanish GP, hits back — input is empty, all filters reset.
**Fix:** Use `useSearchParams` + `router.replace`:
```tsx
const params = useSearchParams();
const router = useRouter();
const [q, setQ] = useState(params.get('q') ?? '');
const [kindFilter, setKindFilter] = useState<...>((params.get('kind') as any) ?? 'all');
useEffect(() => {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (kindFilter !== 'all') sp.set('kind', kindFilter);
  router.replace(`/search${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
}, [q, kindFilter, router]);
```
**Why:** Every premium search surface (Vercel, Linear, GitHub) reflects state in URL. Sharing a search result is table-stakes.

### [apps/web/app/search/search-client.tsx:33-41] [SEVERITY: P2] [No debounce + no result cap — full-list filter on every keystroke]
**What's broken:** `useMemo` re-filters the entire items array on every keystroke. With ~24 drivers + ~10 teams + ~24 races it's fine today, but P1 fix above expands this 5x and the future archive index ships 75 seasons (~1500 driver rows). No debounce, no virtualization, no cap.
**User-visible symptom:** Will manifest as input jank once archive index lands.
**Fix:** Cap rendered results to 50 with a "Show all N matches" affordance and add a 120ms debounce:
```tsx
const [debouncedQ, setDebouncedQ] = useState(q);
useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 120); return () => clearTimeout(t); }, [q]);
// use debouncedQ in the filter
const capped = results.slice(0, 50);
```
**Why:** Cheap to add now, free correctness once archive lands. Avoids a rewrite under pressure.

### [apps/web/app/results/[season]/drivers/page.tsx:60] [SEVERITY: P2] [No empty / no-data fallback for invalid season]
**What's broken:** If a user types `/results/1949/drivers` (pre-F1) or any season with no Jolpica data, `Math.max(...[], 1)` returns 1 but `<tbody>` renders empty. No friendly fallback, no 404.
**User-visible symptom:** Blank table under the headline. Looks like a load failure.
**Fix:** After `const standings = ...`:
```tsx
if (standings.length === 0) {
  return notFound(); // import { notFound } from 'next/navigation';
}
```
Or render an explicit `<div>No driver standings recorded for {season}</div>` block.
**Why:** Same one-liner closes the bug for both `/results/[season]/drivers` and `/results/[season]/teams`. Cheap.

### [apps/web/app/results/[season]/teams/page.tsx:27] [SEVERITY: P2] [Same empty-data fallback missing on constructors page]
**What's broken:** Identical issue to the drivers page above — `standings.length === 0` renders an empty `<ol>` with divider borders. Pre-1958 there were no constructors championship.
**User-visible symptom:** `/results/1955/teams` renders headline + blank list. No 404, no "constructors championship started 1958" message.
**Fix:** Same `notFound()` pattern as above, or an explicit fallback block referencing the 1958 origin.
**Why:** Constructors title was only created in 1958. Real fact + tiny UX fix.

### [apps/web/app/results/[season]/drivers/page.tsx:99-110] [SEVERITY: P3] [Points bar accuracy edge case — leader's bar is full but visual weight isn't anchored]
**What's broken:** `pct = (s.points / max) * 100` is mathematically correct, but for the championship leader the bar is 100% width while their actual gap to P2 isn't communicated. A leader on 400 pts vs P2 on 100 pts and a leader on 405 vs P2 on 400 both render with leader-bar=full-width.
**User-visible symptom:** Visualization implies dominance is identical in a runaway championship and a tight title fight.
**Fix:** Normalize against the leader so the visual encodes the relative gap to P1, not absolute points-vs-max:
```tsx
const leader = standings[0]?.points ?? 1;
const pct = (s.points / leader) * 100;
```
Mathematically identical for the leader row, but the *gap-to-leader* meaning is correct.
**Why:** Standings bars in F1 broadcasts always reference the leader, not an abstract max. Same trivial fix applies to teams page line 51.

### [apps/web/app/results/[season]/teams/page.tsx:74-80] [SEVERITY: P3] [Constructor points bar shares the same leader-vs-max framing issue]
**What's broken:** Same `pct = (s.points / max) * 100` pattern; same misleading semantic in tight title fights.
**User-visible symptom:** Same as P3 above for constructor row.
**Fix:** `const leader = standings[0]?.points ?? 1; const pct = (s.points / leader) * 100;` on apps/web/app/results/[season]/teams/page.tsx:27 and 51.
**Why:** Pair-fix with the drivers page so both standings pages render the same semantic.

### [apps/web/app/search/search-client.tsx:42-56] [SEVERITY: P3] [Filter pill counts not surfaced — user doesn't know how many drivers vs teams vs races match]
**What's broken:** The filter pills just toggle the kind. They don't tell the user how many results each kind would yield for the current query. Standard premium-search affordance.
**User-visible symptom:** Searching "red" — user doesn't know if there are 3 drivers, 1 team, or 0 races matching until they click each pill in turn.
**Fix:** Pre-compute the per-kind counts for the current query and render them next to each label:
```tsx
const counts = useMemo(() => {
  const needle = q.trim().toLowerCase();
  const match = (it: SearchItem) => !needle || it.title.toLowerCase().includes(needle) || it.meta.toLowerCase().includes(needle);
  return {
    all: items.filter(match).length,
    driver: items.filter((it) => it.kind === 'driver' && match(it)).length,
    team: items.filter((it) => it.kind === 'team' && match(it)).length,
    race: items.filter((it) => it.kind === 'race' && match(it)).length,
  };
}, [items, q]);
// in the button: {label} <span className="ml-1 font-data text-[10px] opacity-60">{counts[k]}</span>
```
**Why:** Tiny addition that turns the filter pills into a result-count overview — the same affordance Linear and GitHub use.

### [apps/web/app/results/[season]/drivers/page.tsx:38-44] [SEVERITY: P3] [Cross-link button missing focus-visible ring for keyboard users]
**What's broken:** The "Constructor standings" / "Driver standings" cross-link buttons (drivers:38, teams:38) use `transition-colors hover:border-telemetry-red` only. No `focus-visible:` state. Keyboard users see no focus indication.
**User-visible symptom:** Tabbing reveals no focus ring on the navigation button.
**Fix:** Add `focus-visible:border-telemetry-red focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-telemetry-red` to both cross-link button classNames.
**Why:** Tiny, project-wide pattern (already used on other nav surfaces). Closes a keyboard-accessibility hole without redesign.

---

- COUNT: P0=3 P1=3 P2=4 P3=4
- TOP_FIVE_PRIORITY:
  1. apps/web/app/search/search-client.tsx:53 — `Alls` typo on the All-pill (P0, visible to every search user).
  2. apps/web/app/search/page.tsx:68-70 — kill the "Phase B Wave 4" coming-soon stub (P0, founder-mandate violation).
  3. apps/web/app/search/search-client.tsx:63-83 — add empty-state UI for zero results (P0, dead surface).
  4. apps/web/app/results/[season]/drivers/page.tsx:65-113 — make the entire driver row clickable like the constructor row (P1, every-row-routable mandate).
  5. apps/web/app/search/page.tsx:25-58 — broaden index past current season; add keyboard nav (P1, search is currently a current-season teaser).
- FIX_BUNDLE_SIZE: ~180 LOC total. Breakdown: search-client.tsx rewrite (~90 LOC for empty state + keyboard nav + URL sync + debounce + per-kind counts), search/page.tsx index broadening (~30 LOC), drivers/page.tsx row refactor (~30 LOC), teams/page.tsx parity tweaks (~15 LOC), shared focus-visible + leader-normalized-pct edits (~15 LOC).
