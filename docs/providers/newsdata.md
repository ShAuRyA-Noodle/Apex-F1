# NewsData.io integration with sentiment + multi-language

Clean. Here is the summary of work delivered.

---

## Files written / edited (absolute paths)

- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/newsdata/types.ts` (new) — Raw response types + ISO/NewsData language lookup tables.
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/newsdata/client.ts` (new) — Typed `getNewsDataF1News({ pageSize, languages, revalidate })` + `getNewsDataF1NewsByLanguage` helper. 600s revalidate floor, 5-language fan-out per call.
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/newsdata/mappers.ts` (new) — `mapNewsDataArticle` / `mapNewsDataArticles` returning `UiNewsItemExtended` (extends the existing `UiNewsItem` and adds `sentiment`, `sentimentStats`, `language`, `countries`, `articleId`).
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/newsdata/index.ts` (new) — Barrel.
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/aggregator.ts` (edited) — Adds NewsData branch to `getAggregatedF1News`, widens `AggregatedNewsOptions.providers.newsdata`, adds it to `NEWS_PROVIDERS`. Dedupe order: RSS > Guardian > NewsData > GNews.
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/rss/index.ts` (edited) — `RssItem` widened with optional `provider | sentiment | language | countries | articleId` so NewsData enrichment flows through the rail without breaking RSS-only consumers. Standalone aggregator `getF1NewsFeed` also fans NewsData in via dynamic import.
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/news/SentimentBadge.tsx` (new) — Glass-subtle chip. Emerald (positive), neutral grey (neutral), telemetry-red (negative). `compact` icon-only mode used inside filter pills.
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/latest/page.tsx` (rewritten) — Adds three pill rows: source (including a new `NewsData` pill matched by `provider === 'newsdata'`), language (`All / English / Italian / Spanish / German / French / Portuguese`), and sentiment (`All / Positive / Neutral / Negative`, only when ≥1 NewsData row landed). Cards now render the language label (non-EN only) + `SentimentBadge` next to the source line. Filter state lives in `?source=&lang=&sentiment=` so the page stays fully server-rendered.

The api-client `package.json` already had `./newsdata` exported; `apps/web/tsconfig.json` now path-maps `@apex/api-client/newsdata`.

## Rationale

### Why NewsData earns a dedicated slot in Apex's news stack

Apex already aggregates four RSS feeds, The Guardian, NewsAPI, and GNews. On paper, "yet another news API" sounds redundant. But NewsData.io has two attributes none of the other seven sources offer, and both map directly onto F1 fan behavior:

1. **Per-article sentiment labelling.** NewsData runs a classifier server-side and ships a `sentiment: "positive" | "neutral" | "negative"` field with every article. F1 discourse is unusually emotional (parc-fermé penalty rage, championship-clinching elation, mid-season Ferrari strategy meltdowns), and the platform's existing rails treat every story as tonally identical. Wiring sentiment into the rail unlocks a "negative-only" filter that surfaces the controversies a fan actually wants to read about, and it lets the design system speak in color (telemetry-red dot for negative, emerald for positive) without LLM cost. Even when NewsData returns `null` on the free tier, the badge gracefully renders nothing — there's no broken UI state.
2. **Multi-language coverage.** RSS, Guardian, NewsAPI, and GNews are English-dominant. NewsData explicitly accepts a comma-separated language whitelist and serves Italian, Spanish, German, French, Portuguese with native publishers (Gazzetta dello Sport for Ferrari, AS for Alonso, Auto Motor und Sport for Mercedes, L'Équipe for Gasly, Globo for Bortoleto). For a fan platform whose driver lineup is intrinsically global, this is the difference between "another English news rail" and "the only product that surfaces what Ferrari's home country is saying about a strategy call."

These two angles are why I cared about a clean architectural fit rather than a generic provider drop-in. The whole point is that sentiment + language survive intact from API response all the way to the rendered `/latest` card.

### Type design (`types.ts`)

NewsData's response has three traps the typing system must absorb without leaking complexity to callers:

- **`pubDate` is `"YYYY-MM-DD HH:MM:SS"` UTC with no `Z`.** The mapper normalizes it before constructing the JS `Date`, otherwise V8 silently treats the value as local time and the "newest-first" sort goes weird at midnight UTC. I deliberately kept the raw shape as a string in `types.ts` and did the parse in the mapper so the raw types stay a faithful mirror of the wire format.
- **`language` is a full English word, not an ISO code.** The API responds with `"italian"` even though it accepts `"it"` on input. I exposed both `NEWSDATA_LANG_TOKEN` (ISO → request token) and `NEWSDATA_LANG_FROM_LABEL` (response label → ISO) so the client side keeps the response asymmetry isolated. The Ui side only ever sees ISO 639-1, matching the convention everywhere else in `@apex/types`.
- **`sentiment` is optional and `sentiment_stats` only exists on paid tiers.** I typed both as `?: ... | null` so the mapper handles "key missing", "key present but `null`", and "key present with a value" uniformly. The `UiNewsItemExtended.sentiment` field is `NewsDataSentiment | null` rather than `... | undefined` so downstream UI can branch with a single `if (it.sentiment)` check.

The `NewsDataArticleRaw` shape also carries `duplicate?: boolean` because NewsData runs its own internal dedup pass and flags re-syndicated wire stories. The client filters those out before the aggregator's title-fingerprint dedup runs, which is cheaper than asking our own dedup to catch them.

### Client design (`client.ts`)

The hard constraint here is the 200 req/day free-tier ceiling. With a naive 5-min ISR cache, two pages of traffic per minute would burn through the quota by mid-afternoon. The defaults are tuned to keep this safe under realistic load:

- **`revalidate: 600` by default.** Ten-minute caching plus the multi-language fan-out gives roughly 144 worst-case calls/day, which leaves headroom for one focused per-language fetch (used by future driver-profile rails) without blowing the budget. The aggregator floors revalidate to `max(revalidate, 600)` even if a caller passes a smaller value, so a misconfigured upstream rail cannot blow the quota.
- **One request per page, not one per language.** NewsData accepts comma-separated languages on the `language` query param. The client clamps the list to 5 (free-tier ceiling) and concatenates them, so a `/latest` render burns one quota credit rather than six. This is the single most important design choice in the file.
- **`category=sports`, `q="formula 1"`.** F1 is small enough that a phrase query within the sports category gives high precision without paying the "premium category" upcharge.
- **Returns `[]` on every failure path.** Missing key, network error, non-OK status, `status !== "success"` payload — all map to `[]`. This is CORE RULE #1: the calling UI must degrade to an empty state, never throw. The aggregator's `mergeAndDedupe` is fully tolerant of any branch returning `[]`, so the rail's worst-case behavior is "looks identical to the pre-NewsData state."
- **`getNewsDataF1NewsByLanguage` helper.** Single-language entry point for future surfaces like a Ferrari-focused Italian-news rail on the driver profile page, or a Spanish rail on Alonso's profile. Same client, same cache key namespacing via the language token, no double-counting against the quota.

`apiKey` and `fetchImpl` are overridable for tests. Strict TS with `noUncheckedIndexedAccess` is honored everywhere.

### Mapper design (`mappers.ts`)

The trick here is that the platform's canonical news shape lives in `newsapi/mappers.ts` (it was the first paid news provider wired in), and its `provider` discriminant already lists `"newsdata"`. So `UiNewsItemExtended extends UiNewsItem` with the provider hard-pinned to `"newsdata"` and the NewsData-only fields layered on. This means:

- Every aggregator that already iterates `UiNewsItem[]` keeps working unchanged.
- Code that wants the extra fields imports `UiNewsItemExtended` from `@apex/api-client/newsdata` directly. The aggregator's `RssItem` is wide enough to carry the optional fields too, so the unified rail does not need a discriminated-union switch at every render site.
- `mapNewsDataArticles` drops empty rows server-side. NewsData occasionally ships placeholders with empty titles when an upstream scraper fails.

I deliberately did NOT lowercase the sentiment label. NewsData ships it in the exact form the type expects (`"positive" | "neutral" | "negative"`), and assuming lowercase invariants without verifying them is the kind of bug that bites only in production.

### Aggregator integration

NewsData lands fourth in the dedupe order: RSS > Guardian > NewsData > GNews. The reasoning:

- RSS feeds win on collisions because they are first-party from the dedicated F1 publishers and carry the fullest hero imagery / editorial framing.
- Guardian wins second because its byline and editing standards are the strongest of the news-API tier.
- **NewsData wins over GNews** because NewsData articles carry sentiment + language enrichment that GNews lacks, and we want that enrichment to survive the dedup. If a wire story is in both, the NewsData copy is the one we keep, so its `sentiment` and `language` fields flow into the rail.
- GNews lands last because its 12h+ free-tier delay makes its copies the stalest.

The aggregator's `Promise.all` keeps every provider isolated — a NewsData 429 cannot poison the RSS branch — and the per-provider `.catch(() => [])` plus the client's own error-swallowing give us two layers of defense in depth.

### `RssItem` widening

I widened the legacy `RssItem` interface with five optional fields (`provider`, `sentiment`, `language`, `countries`, `articleId`) rather than introducing a new union type. Reasoning:

- Every existing consumer of `RssItem` keeps compiling without touching a single call site.
- The optional fields are erased to `undefined` on every non-NewsData provider, so the UI's `if (it.sentiment)` check is the single source of conditional rendering.
- A discriminated union would have forced every news-rail render to switch on `provider`, which is exactly the structural coupling the platform's existing design avoids.

### `SentimentBadge` design

The chip is intentionally tiny — 24px tall when full, 20px square when `compact`. The visual language matches the existing telemetry-grade dark UI:

- **Brand-red for negative.** Reuses `telemetry-red` (`#E10600`) so the page stays tonally consistent with the rest of Apex. A negative-sentiment chip reads as "controversy / penalty / DNF" at a glance, which is the right semantic fit.
- **Emerald for positive.** Tailwind's `emerald-400` against the dark surface lands as a clean racing-green analog without veering into highlighter-green AI-aesthetic territory.
- **Glass-subtle treatment.** `bg-{color}/8` + `ring-1 ring-{color}/25` + `backdrop-blur-sm` gives a faint tinted glass surface rather than a solid pill, which keeps the chip from competing with the headline typography. The colored dot does the heavy lifting; the label is `font-mono text-[10px]` so it reads as telemetry data, not as button copy.
- **`title` + `aria-label`.** Both expose the sentiment + confidence percent (when stats are present) for screen readers and tooltip-fluent users.
- **No client-side state.** Pure server component, importable into any RSC tree.

### `/latest` filter UX

Three pill rows stack vertically below the header, each in its own outline-variant tray to keep the visual hierarchy obvious:

1. **Source row.** Adds a `NewsData` pill. Matching uses the `provider` discriminator rather than the source name, because NewsData ships per-publisher names ("Gazzetta dello Sport", "Auto Motor und Sport") and any name-based match would miss most of the rows.
2. **Language row.** Always rendered. `All / English / Italian / Spanish / German / French / Portuguese`. When the user picks English, non-NewsData rows (which carry no `language` field) are treated as English by default. When they pick anything else, the filter restricts to NewsData rows with that ISO code, which is the desired behavior — Italian readers don't want Motorsport.com English copy.
3. **Sentiment row.** Only rendered when `hasNewsData === true`, satisfying CORE RULE #1 (never show controls that match nothing). The pills inline the `SentimentBadge compact` so the chip color reinforces the filter semantics.

Filter state lives entirely in the querystring (`?source=&lang=&sentiment=`), the page stays a pure RSC, and combining filters is `AND` — picking "Italian" + "Negative" surfaces only Italian-language negative-sentiment NewsData rows, which is exactly the angle a Ferrari fan wants during a bad weekend.

Cards now also render an inline language label (only for non-English rows, to avoid noise) and the `SentimentBadge` next to the timestamp. The badge is `null`-safe so RSS / Guardian / NewsAPI / GNews rows render with the badge slot collapsed.

### Quota math summary

- Free tier: 200 req/day.
- Default ISR window: 600s.
- One language-fanned request per `/latest` render = 1 quota credit.
- 600s revalidate caps `/latest` at 144 credits/day.
- That leaves 56 credits/day of headroom for per-language helpers (`getNewsDataF1NewsByLanguage`) on driver-profile rails, with the revalidate floor protecting against accidental overuse.

### What I deliberately did not touch

- The pre-existing `giphy/client.ts` TS error. Out of scope and unrelated.
- The aggregator's title-fingerprint algorithm. NewsData's `duplicate` flag is already honored in the client; piling on a third dedup layer at the aggregator would just hide bugs in the upstream classifiers.
- A NewsData-specific cache wrapper in Redis. Phase C wires Redis explicitly; this implementation lives entirely inside Next's `fetch` cache as per the convention.
