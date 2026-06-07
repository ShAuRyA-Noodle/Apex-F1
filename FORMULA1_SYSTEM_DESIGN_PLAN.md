# Formula1.com System Design Teardown And Build Plan

Date: 2026-05-21

Scope: public/observable Formula1.com behavior, page structure, media/data loading patterns, and a lawful plan to build an equivalent F1-style product for this project. Do not copy Formula1.com source code, F1 trademarks, logos, paid video, protected articles, or CDN assets into our site. Replicate the product architecture and interaction model with our own brand, own editorial copy, licensed images, public APIs, and generated/owned visuals.

## 1. What Formula1.com Is Architecturally

Formula1.com is not a simple static news site. It is a modern server-rendered React/Next.js application with heavy editorial CMS data, a structured media asset pipeline, third-party video hosting, commerce/auth surfaces, and live timing/data integrations.

Observed stack signals:
- Rendering: Next.js App Router style pages, with `/assets/{surface}/_next/static/...` JS/CSS chunks and React Server Component payload embedded in HTML.
- Delivery: `nginx` origin/fronting plus AWS CloudFront CDN. Homepage headers show `x-cache: Hit from cloudfront`.
- Caching: homepage response uses `s-maxage=60`, `stale-while-revalidate=300`, `stale-if-error=86400`, meaning pages are edge-cached briefly, can serve stale for 5 minutes while refreshing, and can serve stale for a day on origin failure.
- Images: `media.formula1.com/image/upload/...` with transformation syntax like `c_fill`, `w_352`, `q_auto`, `f_auto`, `e_trim`, `t_16by9Centre`; this is effectively a Cloudinary-style responsive image pipeline.
- Video thumbnails: `d2n9h2wits23hf.cloudfront.net/image/v1/static/6057949432001/...` where `6057949432001` is a Brightcove account-style identifier. Player code references Brightcove player domains.
- Live timing: page/source references `livetiming.formula1.com/static/` and `livetiming.formula1.com/signalrcore`.
- Country/geo: source references `https://api.formula1.com/svc/v2/whereami`.
- Consent/auth/monetization: loads `consent.formula1.com`, `account.formula1.com`, `static.formula1.com/mk-sdk`, Google Tag Manager, Google Publisher Tag, New Relic, AB Tasty-like testing, and Storyteller story SDK.

## 2. Main Page System

### Global Shell

The shell is shared across home, latest/news, video, results, drivers, teams, racing schedule, timing, information pages.

Components:
- Skip-to-content accessibility link.
- Utility top bar:
  - Race Series label.
  - External links: Authentics, Store, Tickets, Hospitality, Experiences, F1 TV.
  - Auth actions: Sign In, Subscribe.
- Brand row:
  - F1 mark.
  - Main navigation groups: Schedule, Results, News, Drivers, Teams, Fantasy & Gaming.
  - Mobile menu equivalent.
- Race ticker:
  - Previous/current/next race cards.
  - Round number, location, dates.
  - Uses race card images from media CDN.
- Mega menus:
  - Schedule dropdown: upcoming race links plus full schedule.
  - Results dropdown: season, driver standings, team standings, archive, awards.
  - News dropdown: article tiles, video tiles, evergreen education pages.
  - Drivers dropdown: current driver list, all drivers, Hall of Fame.
  - Teams dropdown: current team list, all teams.
  - Fantasy/Gaming dropdown: links out to fantasy, games, member area.
- Footer:
  - Partner grid split into tier bands.
  - App download badges.
  - Social icons.
  - Footer navigation and legal/hygiene links.
  - Survey CTA.

Build equivalent:
- Create `AppShell` with `TopUtilityBar`, `RaceTicker`, `MegaNav`, `Footer`, `CookieConsentBridge`, `AnalyticsBridge`.
- Make navigation CMS-driven, not hardcoded in component files.
- Store all shell navigation as `NavigationGroup`, `NavigationLink`, `PromoTile`, `ExternalLink` records.

## 3. Homepage Component Model

Observed sections:
- Hero: one dominant article/image tile, with lock/unlocked badges when needed.
- Hero side rail: 4 to 5 secondary article links.
- Quick action buttons: schedule, standings, regulations, latest news.
- Featured video rail: horizontal cards with thumbnail, play icon, duration, title, view-all.
- Editor's Picks: dense editorial card grid.
- Season standings: top 3 visual cards plus compact table and "show all".
- Highlights rail: recent session/race video cards.
- Commercial cards: store, tickets, fantasy.
- Survey banner.
- Partner block.
- App promo/footer.

Build equivalent:
- `HomePage` is a composition of CMS-configured slots:
  - `RaceTickerSlot`
  - `HeroLeadStorySlot`
  - `ArticleRailSlot`
  - `QuickLinksSlot`
  - `VideoRailSlot(featured)`
  - `EditorialGridSlot`
  - `StandingsPreviewSlot`
  - `VideoRailSlot(highlights)`
  - `CommercePromoSlot`
  - `SurveySlot`
  - `PartnerGridSlot`
- Each slot should accept a typed content query, display rules, fallback behavior, and cache TTL.

## 4. Content And CMS Model

Formula1.com HTML exposes content records with fields like:
- `contentType`
- `id`
- `title`
- `altText`
- `caption`
- `webUrl`
- `image`
- `navigationLinkItem`
- `atomImage`
- `identifier`
- `openInNewTab`

This looks like a headless CMS/content graph feeding server-rendered pages. We should build the same concept, not the same vendor lock-in.

Recommended CMS models:
- `Article`
  - `id`, `slug`, `canonicalUrl`, `title`, `subtitle`, `dek`, `bodyRichText`, `excerpt`
  - `type`: news, feature, analysis, quiz, guide, press, gallery
  - `primaryTag`, `tags`, `teams`, `drivers`, `races`, `season`
  - `publishedAt`, `updatedAt`, `embargoUntil`, `isBreaking`, `isPinned`, `isPremium`
  - `heroImageId`, `thumbnailImageId`, `galleryIds`
  - `seoTitle`, `seoDescription`, `structuredData`
- `Video`
  - `id`, `provider`, `providerAssetId`, `title`, `description`, `duration`
  - `thumbnailSet`, `posterImageId`, `embedUrl`, `hlsUrl` if self-hosted/licensed
  - `publishedAt`, `tags`, `race`, `session`, `drivers`, `teams`
  - `availability`: public, members, geo-blocked, premium
- `Race`
  - `season`, `round`, `slug`, `name`, `officialName`, `country`, `city`
  - `circuitId`, `dateStart`, `dateEnd`, `timezone`
  - `sessions`: FP1, FP2, FP3, Sprint Qualifying, Sprint, Qualifying, Race
  - `raceCardImageId`, `trackMapImageId`, `ticketUrl`, `hospitalityUrl`
- `Driver`
  - `driverId`, `number`, `code`, `firstName`, `lastName`, `country`, `teamId`
  - `headshotImageId`, `helmetImageId`, `profileImageId`, `bio`, `stats`
- `Team`
  - `teamId`, `name`, `base`, `principal`, `powerUnit`, `color`, `logoImageId`, `carImageId`
- `Standing`
  - `season`, `type`, `position`, `entityId`, `points`, `wins`, `lastUpdated`
- `Partner`
  - `name`, `tier`, `logoImageId`, `url`, `trackingLabel`
- `Navigation`
  - `groups`, `links`, `dropdownTiles`, `externalFlags`, `order`

## 5. Media System

Formula1.com media behavior:
- Images are not stored as fixed files in page code. They are referenced through an image transformation CDN.
- Same source asset is transformed per context:
  - Article card: `w_352`, 16:9 crop.
  - Hero: `h_1200` or wide responsive fit.
  - Driver thumbnail: `w_64`.
  - Car/team art: `w_512`.
  - Sponsor logo: `e_trim`, `c_fit`, `w_160`, `h_90`.
- Fallbacks are encoded in URLs, e.g. driver/car fallback paths.
- Video thumbnails are separate from article images and delivered via a Brightcove/CloudFront image endpoint.

Build equivalent:
- Use Cloudinary, Imgix, ImageKit, or self-hosted `sharp` pipeline behind CDN.
- Store only original asset metadata in DB; generate URLs at render time.
- Define transforms:
  - `hero_16x9`: 1584w, center/south crop depending focal point.
  - `card_16x9`: 352w, 704w, 1056w srcset.
  - `square_thumb`: 192x192, focal-center.
  - `driver_head`: 64w/128w transparent or webp.
  - `team_car`: 512w, transparent fallback.
  - `partner_logo`: trim, contain, 160x90.
  - `app_badge`: SVG passthrough.
- Add `focalPoint` to each image record: north, south, center, face, car.
- Add `altText` as required editorial field.

## 6. Video System

Observed behavior:
- Video cards display a thumbnail, play icon, duration, and title.
- Homepage has multiple rails: featured video, highlights.
- Thumbnails come from a video-image CDN with responsive sizes.
- JS references Brightcove player domains.

Build equivalent:
- If you have licensed video: use Mux, Cloudflare Stream, Vimeo OTT, or Brightcove.
- If you do not have licensed F1 video: use YouTube embeds from official channels where embedding is allowed, or produce original analysis videos.
- Video card model must include:
  - `durationSeconds`
  - `thumbnailSrcSet`
  - `providerAssetId`
  - `availability`
  - `trackingContext`
- Page components:
  - `VideoCard`
  - `VideoRail`
  - `VideoModalPlayer`
  - `VideoPage`
  - `AutoplayPreview` only if muted and performance-safe.

## 7. Data Sources For Our Version

Do not depend on private F1 endpoints unless you have rights. Use a source strategy:

### Official/Observed But Not Necessarily Reusable
- `formula1.com` pages and sitemaps: useful to understand IA, not for scraping/copying.
- `livetiming.formula1.com/static/`: public live timing files are visible and used by F1 ecosystem tools, but usage should respect terms and rate limits.
- `api.formula1.com/svc/v2/whereami`: geo utility, not needed for us unless implementing geo-gating.

### Practical Public Alternatives
- OpenF1:
  - Use for sessions, drivers, meetings, laps, intervals, car data, race control, stints, positions, weather.
  - Good for live-ish dashboards and session analytics.
- Jolpica:
  - Ergast-compatible successor for historical seasons, races, circuits, drivers, constructors, standings, qualifying, pit stops, laps.
  - Good for archive pages and canonical season statistics.
- FastF1:
  - Python analysis layer for F1 timing, telemetry, weather, event schedule, session results.
  - Good for backend ingestion jobs, not direct browser calls.
- News:
  - Own editorial CMS.
  - Licensed feeds if needed: Motorsport Network/AP/Reuters/etc.
  - RSS ingestion only where permitted.
- Images:
  - Licensed motorsport photo provider, your own generated assets, or manually uploaded editorial images.
- Partner logos:
  - Only use partners you actually have rights to display.

## 8. Page Inventory To Build

Phase 1 pages:
- `/` homepage.
- `/latest` news listing with filters, load more, article cards.
- `/latest/article/[slug]` article detail.
- `/video` video listing.
- `/racing/[season]` schedule overview.
- `/racing/[season]/[raceSlug]` race detail.
- `/results/[season]/drivers` driver standings.
- `/results/[season]/teams` constructor/team standings.
- `/drivers` current driver index.
- `/drivers/[slug]` driver profile.
- `/teams` team index.
- `/teams/[slug]` team profile.
- `/timing/live` live timing dashboard.
- `/information/partners` partner page.

Phase 2 pages:
- `/results/[season]/races`
- `/results/archive`
- `/results/awards`
- `/latest/tags/[tag]`
- `/quizzes/[slug]`
- `/gallery/[slug]`
- `/fantasy-and-gaming`
- `/membership`
- `/account`

## 9. Feature Components

Core UI components:
- `RaceTicker`: previous/current/next cards, schedule awareness, timezone display.
- `MegaNav`: keyboard-accessible dropdowns, mobile drawer, promo cards.
- `ArticleCard`: variants lead, compact, list, square, editorial pick.
- `VideoCard`: duration badge, play overlay, provider thumbnail.
- `LockedBadge` / `UnlockedBadge`: rights/membership marker.
- `StandingsTable`: sortable, responsive, condensed and full variants.
- `DriverMiniCard`: image, flag, team, points.
- `TeamCard`: logo, car, drivers, color strip.
- `SessionSchedule`: timezone-aware sessions.
- `LiveTimingTable`: position, interval, gap, tyre, pit, sector status.
- `TrackMap`: SVG/canvas map with mini-sector overlays.
- `PartnerGrid`: tiered grid with analytics click metadata.
- `CommercePromoCard`: store/tickets/fantasy style link cards.
- `ConsentBanner`: cookie categories and script gating.
- `AdSlot`: GPT/house ad placeholder, disabled in dev.
- `SurveyBanner`: optional feature flag.

## 10. Backend Architecture

Recommended stack:
- Next.js App Router frontend.
- PostgreSQL for content/data.
- Prisma or Drizzle ORM.
- Redis for hot caches and live timing snapshots.
- Object storage for originals: S3/R2.
- Image CDN: Cloudinary/Imgix/ImageKit or `sharp` + CDN.
- Search: Meilisearch/Typesense/Postgres full-text for articles/videos.
- Queue: BullMQ or Trigger.dev for ingestion jobs.
- Analytics: PostHog/Plausible plus server-side event logs.
- Auth: Clerk/Auth.js/Supabase Auth depending product requirements.

Services:
- `web`: Next.js SSR/ISR app.
- `cms`: admin UI or headless CMS.
- `ingest-f1-data`: OpenF1/Jolpica/FastF1 scheduled importer.
- `ingest-news`: licensed/RSS/manual editorial importer.
- `media-worker`: image metadata, blurhash, focal point, variants.
- `live-timing-worker`: race-week websocket/polling collector.
- `search-indexer`: article/video indexing.
- `revalidate-worker`: page/path revalidation after content update.

## 11. Caching Strategy

Match Formula1.com behavior conceptually:
- Homepage: CDN/ISR 60 seconds; stale while revalidate 5 minutes.
- News listing: 60 to 180 seconds.
- Article detail: revalidate on publish/update; otherwise 10 minutes.
- Standings: 60 seconds during race weekends, 1 hour otherwise.
- Schedule: 1 hour normally, 5 minutes during race week.
- Driver/team profile: 1 hour to 24 hours.
- Live timing: websocket or polling, no static cache; Redis snapshot TTL 5 to 30 seconds.
- Assets: immutable hashed originals, transformed CDN URLs with long cache.

## 12. Live Timing Plan

Data model:
- `Meeting`
- `Session`
- `TimingState`
- `DriverTiming`
- `Lap`
- `Sector`
- `Stint`
- `RaceControlMessage`
- `WeatherSample`
- `PositionSample`
- `CarTelemetrySample`

Pipeline:
- Pre-session: import meeting/session metadata.
- During session: collect interval/timing/position/race-control/weather streams.
- Normalize driver numbers to internal driver IDs.
- Save raw event frames for replay.
- Save compact current snapshot in Redis for UI.
- After session: materialize lap tables, stint tables, strategy summaries, result pages.

UI:
- Timing tower.
- Gap/interval table.
- Sector colors.
- Tyre/stint age.
- Race control feed.
- Weather strip.
- Track map.
- Replay scrubber for archived sessions.

## 13. Editorial Workflows

Admin workflows:
- Create article.
- Attach hero image and card image.
- Tag by race, driver, team, topic.
- Preview all card variants before publish.
- Schedule publish/embargo.
- Mark as breaking/pinned.
- Add related articles/videos.
- Trigger revalidation.

Homepage curation:
- Slots are editorially controlled.
- Each slot can use manual picks or dynamic query fallback.
- Example: `homepage.hero` manual article; if unavailable, latest featured article.

## 14. Tracking And Analytics

Formula1.com embeds click context in `data-f1rd-a7s-*` attributes. We should use the same concept with our own naming:
- `data-analytics-click`
- `data-analytics-context`
- `data-commerce-context`

Events:
- `nav_click`
- `article_card_click`
- `video_play`
- `video_complete`
- `race_ticker_click`
- `standings_view_all`
- `partner_click`
- `commerce_promo_click`
- `load_more`
- `search`
- `filter_change`

## 15. Legal And Brand Boundary

Allowed:
- Build a motorsport news/statistics website with similar UX patterns.
- Use public/open APIs according to their terms.
- Use your own visual language inspired by racing.
- Use factual race/driver data with proper attribution where required.

Avoid:
- Copying Formula1.com code, CSS, logos, F1 marks, official image/video assets, article text, or paid content.
- Hotlinking F1 media assets.
- Presenting the site as official Formula 1.
- Using official partner logos unless authorized.

Recommended footer disclaimer:
This is an unofficial motorsport project and is not affiliated with Formula 1, FIA, Formula One Management, or any team/driver unless explicitly stated.

## 16. Implementation Order

1. Data foundation:
   - Build DB schema for seasons, races, sessions, drivers, teams, standings, articles, videos, assets, partners, nav.
   - Create seed importer for current season from OpenF1/Jolpica.
2. Media foundation:
   - Set up asset upload/storage.
   - Build image URL helper and transform presets.
   - Generate placeholder racing visuals for development.
3. Shell:
   - App shell, top utility bar, race ticker, mega nav, footer.
4. Homepage:
   - Hero, news rail, video rail, standings preview, editor picks, partner grid.
5. News system:
   - Latest page, article detail, tags, related articles.
6. Results/schedule:
   - Schedule page, race detail, standings pages.
7. Drivers/teams:
   - Index pages and profile pages.
8. Video:
   - Video listing, player modal/page, external provider integration.
9. Live timing:
   - Redis snapshot worker, timing UI, race control feed.
10. Admin/editorial:
   - CMS screens, preview, publishing, homepage curation.
11. Performance/accessibility:
   - Lighthouse pass, keyboard nav, alt text enforcement, structured data.

## 17. Minimum Viable F1-Style Site

MVP pages:
- Homepage
- Latest
- Article detail
- Schedule
- Driver standings
- Team standings
- Drivers
- Teams

MVP data:
- Jolpica/OpenF1 imports for schedule, drivers, teams, standings.
- Manual CMS articles.
- Manual/generated images.
- Optional YouTube embeds for videos.

MVP quality bar:
- Server-rendered.
- CDN-cacheable.
- Mobile-first.
- Keyboard accessible nav.
- Responsive images.
- No layout shift.
- Typed content models.
- Own brand assets.

## 18. Sources Inspected

- Formula1.com homepage: https://www.formula1.com/
- Formula1.com latest/news page: https://www.formula1.com/en/latest
- Formula1.com results page: https://www.formula1.com/en/results.html/2026/drivers.html
- Formula1.com robots and sitemap: https://www.formula1.com/robots.txt and https://www.formula1.com/sitemap.xml
- Formula1.com public pages sitemap: https://static.formula1.com/sitemap/pages-sitemap.xml
- Formula1.com articles sitemap index: https://www.formula1.com/en/latest/article/sitemap.xml
- F1 live timing static index observed: https://livetiming.formula1.com/static/2026/Index.json
- OpenF1 docs: https://openf1.org/docs/
- Jolpica F1 docs: https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md
- FastF1 docs: https://docs.fastf1.dev/
