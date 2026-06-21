# Mobile + Phase 3 deep technical + launch spec

# APEX MOBILE — Phase 3 Flutter Spec (Months 9-12)

> Companion to PID §22. Locks Flutter, Riverpod 2.x, GoRouter, Dio+Retrofit, Hive, Supabase, FCM/APNs.
> Web ↔ mobile contract = OpenAPI generated from Drizzle Zod.
> Founder: solo. Outsource: 1 contract Flutter dev M10-M11, 1 QA contractor M12.

---

## 1. FLUTTER ARCHITECTURE

### 1.1 Versions locked (M9 kickoff = month 9 of roadmap)

| Tool | Version | Why |
|------|---------|-----|
| Flutter | 3.27.x stable | Impeller default on iOS+Android, dropped legacy Skia warmup |
| Dart | 3.6.x | Pattern matching, records, sealed classes |
| Riverpod | `flutter_riverpod ^2.6.1` + `riverpod_generator ^2.6.3` | AsyncNotifier codegen, no more `StateNotifierProvider` boilerplate |
| GoRouter | `go_router ^14.6.x` | StatefulShellRoute for bottom-nav tabs with own back stacks |
| Dio | `dio ^5.7.x` | Retry + cache interceptors mature |
| Retrofit | `retrofit ^4.4.x` + `retrofit_generator ^9.1.x` | Typed REST from OpenAPI-derived Dart classes |
| Hive | `hive_ce ^2.x` (community fork) | `hive` original unmaintained; CE supports Dart 3 / Flutter 3.24+ |
| Supabase | `supabase_flutter ^2.8.x` | Auth + RLS read of user.follows / user.saved |
| FCM | `firebase_messaging ^15.x` + `firebase_core ^3.x` | iOS APNs token bridge built-in |
| Sentry | `sentry_flutter ^8.x` | Already wired on web in Phase C — shared DSN |
| PostHog | `posthog_flutter ^4.x` | Session replay on Android |
| Material 3 | built-in | Dark seeded scheme from web token `#E10600` |
| freezed | `freezed ^2.5.x` + `json_serializable ^6.8.x` | Unions for card types on Today screen |
| flutter_lints | `flutter_lints ^5.x` + `very_good_analysis ^7.x` | Stricter than default |

### 1.2 Project structure

```
F1_Claude/
├── apps/
│   ├── web/                          # existing Next.js
│   └── mobile/                       # NEW Flutter app
│       ├── android/
│       ├── ios/
│       ├── lib/
│       │   ├── main.dart
│       │   ├── bootstrap.dart                  # runZonedGuarded + Sentry init + Firebase init
│       │   ├── app/
│       │   │   ├── app.dart                    # MaterialApp.router root
│       │   │   ├── router.dart                 # GoRouter config (deep links, guards)
│       │   │   ├── theme.dart                  # M3 dark scheme from #E10600 seed
│       │   │   └── observers.dart              # ProviderObserver -> PostHog
│       │   ├── core/
│       │   │   ├── env/
│       │   │   │   ├── env.dart                # --dart-define wrapper
│       │   │   │   └── env.g.dart              # generated from envied
│       │   │   ├── network/
│       │   │   │   ├── dio_client.dart         # Dio + interceptors (auth, retry, cache, sentry breadcrumb)
│       │   │   │   ├── api_client.dart         # Retrofit-generated facade
│       │   │   │   └── error_mapper.dart       # ApiException sealed class
│       │   │   ├── storage/
│       │   │   │   ├── hive_boot.dart          # registerAdapters, open boxes
│       │   │   │   ├── boxes.dart              # constants: BOX_ARTICLES, BOX_RACES, ...
│       │   │   │   └── sync_cursor.dart        # last-since timestamp per box
│       │   │   ├── auth/
│       │   │   │   ├── auth_repository.dart    # Supabase wrapper
│       │   │   │   └── auth_notifier.dart      # Riverpod AsyncNotifier
│       │   │   ├── push/
│       │   │   │   ├── push_service.dart       # FCM init, token sync, channel registration
│       │   │   │   ├── channels.dart           # AndroidNotificationChannel definitions
│       │   │   │   └── deep_link_handler.dart  # payload -> GoRouter.go(path)
│       │   │   ├── analytics/
│       │   │   │   ├── analytics.dart          # PostHog + Firebase wrapper interface
│       │   │   │   └── events.dart             # typed event constants
│       │   │   ├── motion/
│       │   │   │   ├── haptics.dart            # selection / impact / success
│       │   │   │   ├── transitions.dart        # shared-axis, fade-through
│       │   │   │   └── curves.dart             # apexEase = Cubic(0.16, 1, 0.3, 1)
│       │   │   └── widgets/
│       │   │       ├── apex_scaffold.dart
│       │   │       ├── apex_app_bar.dart
│       │   │       ├── shimmer_skeleton.dart
│       │   │       ├── error_view.dart
│       │   │       └── empty_view.dart
│       │   ├── features/
│       │   │   ├── onboarding/
│       │   │   │   ├── data/
│       │   │   │   ├── domain/
│       │   │   │   ├── application/            # Riverpod notifiers
│       │   │   │   └── presentation/           # screens + widgets
│       │   │   ├── today/
│       │   │   ├── live/
│       │   │   ├── news/
│       │   │   ├── race_hub/
│       │   │   ├── standings/
│       │   │   ├── drivers/
│       │   │   ├── teams/
│       │   │   ├── search/
│       │   │   ├── saved/
│       │   │   ├── settings/
│       │   │   └── profile/
│       │   └── shared/
│       │       ├── models/                     # generated from openapi (read-only)
│       │       └── fixtures/                   # JSON fixtures mirroring packages/fixtures
│       ├── test/
│       ├── integration_test/
│       ├── pubspec.yaml
│       ├── analysis_options.yaml
│       ├── build.yaml                          # build_runner config
│       └── README.md
└── packages/
    ├── types/                                  # shared TS row types (Drizzle inferSelect)
    ├── api-contract/                           # NEW: zod schemas + openapi.json
    └── fixtures/                               # shared JSON; mobile copies at build time
```

Feature folders follow **clean-ish layered**: `data` (repositories + Dio calls + Hive readers), `domain` (entities + use-cases when non-trivial — usually skipped), `application` (Riverpod notifiers), `presentation` (screens + widgets). Skip use-case layer unless logic is reused across 2+ screens; founder is solo, ceremony is the enemy.

### 1.3 State management — Riverpod 2.x patterns

Three patterns only. Anything else gets rejected in review.

**A. Provider** — pure DI for singletons (Dio, ApiClient, HiveBoxes, AuthRepository):

```dart
@riverpod
ApiClient apiClient(ApiClientRef ref) {
  final dio = ref.watch(dioClientProvider);
  return ApiClient(dio, baseUrl: Env.apiBaseUrl);
}
```

**B. AsyncNotifier** — for screen state that talks to API + cache:

```dart
@riverpod
class TodayFeed extends _$TodayFeed {
  @override
  Future<List<TodayCard>> build() async {
    final cached = ref.read(hiveTodayCacheProvider).read();
    if (cached.isNotEmpty) {
      // stale-while-revalidate: emit cache, kick fetch
      Future.microtask(_refresh);
      return cached;
    }
    return _fetch();
  }

  Future<void> _refresh() async {
    final fresh = await _fetch();
    state = AsyncData(fresh);
  }

  Future<List<TodayCard>> _fetch() async {
    final api = ref.read(apiClientProvider);
    final res = await api.getTodayFeed();
    await ref.read(hiveTodayCacheProvider).write(res.cards);
    return res.cards;
  }
}
```

**C. FamilyProvider** — for parametric reads (driver profile by slug, race by id):

```dart
@riverpod
Future<Driver> driverBySlug(DriverBySlugRef ref, String slug) async {
  final api = ref.read(apiClientProvider);
  return api.getDriver(slug);
}
```

`keepAlive` only for: standings (refreshed every 60s during race window), user profile, settings. Everything else auto-dispose to keep memory <250 MB.

### 1.4 Routing — GoRouter with StatefulShellRoute

Bottom nav = 4 tabs: Today / Live (or Race Hub off-race) / News / Saved. Settings via top-right gear on Today. Search via top-right magnifier on News.

```dart
final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: '/today',
    refreshListenable: GoRouterRefreshStream(ref.watch(authNotifierProvider.stream)),
    redirect: (ctx, state) {
      final loggedIn = auth.valueOrNull?.isAuthenticated ?? false;
      final loggingIn = state.matchedLocation.startsWith('/auth');
      final isOnboarding = state.matchedLocation.startsWith('/onboarding');
      // Onboarding is auth-optional; everything else gated only if route declares it.
      if (!loggedIn && state.matchedLocation == '/saved') return '/auth/login';
      if (loggedIn && loggingIn) return '/today';
      return null;
    },
    routes: [
      GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingFlow()),

      StatefulShellRoute.indexedStack(
        builder: (ctx, state, shell) => RootShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/today',
              pageBuilder: (_, __) => const NoTransitionPage(child: TodayScreen()),
              routes: [
                GoRoute(path: 'card/:id', builder: (_, s) => CardDetail(id: s.pathParameters['id']!)),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/race-hub', builder: (_, __) => const RaceHubScreen(), routes: [
              GoRoute(path: 'live', builder: (_, __) => const LiveModeScreen()),
              GoRoute(path: ':raceId', builder: (_, s) => RaceDetail(s.pathParameters['raceId']!)),
            ]),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/news', builder: (_, __) => const NewsScreen(), routes: [
              GoRoute(path: ':slug', builder: (_, s) => ArticleScreen(s.pathParameters['slug']!)),
            ]),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/saved', builder: (_, __) => const SavedScreen()),
          ]),
        ],
      ),

      GoRoute(path: '/standings', builder: (_, __) => const StandingsScreen()),
      GoRoute(path: '/drivers/:slug', builder: (_, s) => DriverProfile(s.pathParameters['slug']!)),
      GoRoute(path: '/teams/:slug', builder: (_, s) => TeamProfile(s.pathParameters['slug']!)),
      GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );
});
```

**Deep links**: `apex://` scheme + `https://apexf1.app/*` universal links (Android App Links + iOS associated domains via `apple-app-site-association` served from the Next.js app's `/.well-known/`). Every push payload includes a `deep_link` field; `deep_link_handler.dart` parses and calls `router.go(path)`.

### 1.5 Network layer

Drizzle Zod → OpenAPI 3.1 → openapi-generator (`dart-dio`) → typed `ApiClient`. Wrap in Retrofit for the few endpoints not in OpenAPI (legacy fixtures during M9). Single Dio with these interceptors **in this order**:

1. `AuthInterceptor` — injects `Authorization: Bearer ${supabase.session.accessToken}`, refreshes on 401 once
2. `LocaleInterceptor` — `Accept-Language` + `X-Apex-Tz: ${tzdata.local.name}`
3. `CacheInterceptor` (`dio_cache_interceptor` + Hive backend) — GET-only, 60s default, overridden per call
4. `RetryInterceptor` — 3 retries on 5xx / network, exponential 200ms / 400ms / 800ms
5. `SentryDioInterceptor` — breadcrumbs + error capture
6. `LoggingInterceptor` — kDebugMode only

Errors mapped through a `sealed class ApiException` with `NetworkOffline`, `Unauthorized`, `RateLimited`, `ServerError`, `Unknown` variants so the UI layer pattern-matches with `switch`.

### 1.6 Offline DB — Hive boxes

Boxes opened on `bootstrap.dart` after `Hive.initFlutter()`:

| Box | Adapter type | Max size | TTL |
|-----|--------------|----------|-----|
| `articles` | `ArticleEntity` | 100 entries LRU | 7 days |
| `races` | `RaceEntity` | full season | season end |
| `drivers` | `DriverEntity` | full grid | until grid change |
| `teams` | `TeamEntity` | full grid | until grid change |
| `standings_drivers` | `DriverStandingRow` | 1 array | until next refresh |
| `standings_constructors` | `ConstructorStandingRow` | 1 array | until next refresh |
| `user_follows` | `Follow` | unbounded | session |
| `user_saved` | `SavedItem` | unbounded | session |
| `today_cards` | `TodayCard` (sealed union) | 30 entries | 6h |
| `sync_cursors` | `SyncCursor` | per-entity | persistent |
| `kv` | dynamic | settings, flags | persistent |

LRU enforced by a tiny `lru_eviction.dart` helper that runs on box open.

### 1.7 Auth, push, analytics, crash — see sections 6, App health, etc.

### 1.8 Theming — M3 dark from web tokens

```dart
final apexDark = ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFFE10600),    // telemetry-red
    brightness: Brightness.dark,
    surface: const Color(0xFF141313),
    surfaceContainerHighest: const Color(0xFF262626), // asphalt
  ),
  textTheme: GoogleFonts.hankenGroteskTextTheme(ThemeData.dark().textTheme).copyWith(
    displayLarge: GoogleFonts.anybody(fontWeight: FontWeight.w800),
    displayMedium: GoogleFonts.anybody(fontWeight: FontWeight.w800),
    headlineLarge: GoogleFonts.anybody(fontWeight: FontWeight.w700),
    labelSmall: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.w500), // telemetry
  ),
  splashFactory: NoSplash.splashFactory, // crisp, premium feel
  pageTransitionsTheme: const PageTransitionsTheme(builders: {
    TargetPlatform.android: ApexSharedAxisTransitionBuilder(),
    TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
  }),
);
```

`google_fonts` package loads at first use; we **pre-cache** Anybody-700 + Hanken-400 on splash via `GoogleFonts.pendingFonts([...])` to kill FOUT.

---

## 2. SHARED-TYPES PIPELINE WEB ↔ MOBILE

Single source of truth = Drizzle schema in `packages/db/schema.ts`.

```
Drizzle schema (TS)
   │
   ├──> packages/types     (drizzle.inferSelect rows)         <— web consumes directly
   │
   ├──> packages/api-contract
   │      ├── zod schemas         (drizzle-zod createSelectSchema)
   │      ├── tRPC routers        (web consumes directly)
   │      └── openapi.json        (trpc-to-openapi → fastify/express adapter)
   │
   └──> apps/mobile/lib/shared/models
           └── generated Dart     (openapi-generator dart-dio template)
```

**Pipeline command:**

```bash
pnpm turbo run codegen
  ├─ packages/types: tsc emit declaration only
  ├─ packages/api-contract: drizzle-zod + zod-to-openapi → openapi.json
  └─ apps/mobile: openapi-generator-cli generate -i ../../packages/api-contract/openapi.json \
                    -g dart-dio -o lib/shared/models \
                    --additional-properties=pubName=apex_api,nullableFields=true
```

Wired into Turborepo `turbo.json`:

```jsonc
{
  "tasks": {
    "codegen": {
      "inputs": ["packages/db/**/*.ts", "packages/api-contract/src/**"],
      "outputs": [
        "packages/types/dist/**",
        "packages/api-contract/dist/**",
        "apps/mobile/lib/shared/models/**"
      ]
    }
  }
}
```

CI gate: if Drizzle schema changes, both web build AND `flutter analyze` must pass with regenerated types. Drift = red.

**Build-time Dart codegen** then runs `build_runner build --delete-conflicting-outputs` to produce freezed unions, Retrofit clients, and Riverpod generated files. Pre-commit hook on mobile runs `dart format` + `dart fix --apply`.

**Mock fixtures**: `packages/fixtures/*.json` (already used by web) are copied into `apps/mobile/assets/fixtures/` via a `flutter_gen` asset map. Dev flag `--dart-define=APEX_MOCK=true` short-circuits API calls and serves fixtures with a 250ms artificial delay (matches our P75 latency budget).

---

## 3. SCREEN-BY-SCREEN UX SPECS (11 screens, PID §22.2)

> Format per screen: **Layout · Components · Gestures · Motion · Offline · Push trigger**

### 3.1 Onboarding (5 cards horizontal swipe)

- **Layout**: Full-bleed PageView. Card 1 brand intro (Anybody 800 type-set hero). Card 2 pick favorite driver (grid of 20 driver chips with team color border, multi-select max 5). Card 3 favorite team (10 tiles, single-select). Card 4 push permissions (clear: "Race-start, qualifying, breaking — never spam"). Card 5 notification time prefs (toggle quiet hours + timezone auto-detected).
- **Components**: `OnboardingPager`, `DriverChip`, `TeamTile`, `PushPrimerSheet`, `QuietHoursPicker`.
- **Gestures**: horizontal swipe, tap chips, long-press chip = preview profile overlay.
- **Motion**: shared-axis horizontal between cards (300ms `apexEase`). Chip selection = scale 0.96→1.04 with `Curves.elasticOut`. Brand intro card has a pinned-by-frame countdown morph using `AnimatedFlipCounter`.
- **Offline**: stores selections to `kv` box; flushes to Supabase on connectivity restore.
- **Push trigger**: card 4 triggers iOS provisional auth request first (`provisional: true`) then full request only after user opts in.

### 3.2 Today (deep-dive in §4)

Vertical Inshorts-style PageView, cards snap full-screen. Top status bar minimal: small Apex wordmark + gear icon. Bottom dot indicator + "swipe up" affordance on first run only.

### 3.3 Race Hub (off-race-day view)

- **Layout**: `CustomScrollView` with `SliverAppBar.large` showing next race hero image. Below: countdown ribbon (D:H:M:S), session schedule list (FP1/FP2/FP3/Q/Sprint/Race with local time + add-to-calendar), circuit info collapsible, weather forecast strip, last-5-years-here mini-leaderboard, related news rail.
- **Components**: `RaceHero`, `CountdownRibbon`, `SessionRow`, `CircuitInfoSheet`, `WeatherStrip`, `HistoricalMini`, `RelatedNewsRail`.
- **Gestures**: pull-to-refresh, tap session row → add to calendar (`add_2_calendar`), tap circuit info → modal sheet, long-press session → set custom reminder.
- **Motion**: `SliverAppBar` parallax. Countdown digits use `AnimatedSwitcher` with vertical slide. Weather icons cross-fade.
- **Offline**: full race object cached (`races` box). Weather marked stale if cursor >2h.
- **Push trigger**: T-24h reminder, T-1h reminder, T-5min "lights out soon" (configurable per session).

### 3.4 Live Mode — §5 deep dive

### 3.5 News

- **Layout**: Two tabs (`For You` / `Latest`). For You is editorial-curated + follows-personalized. List uses `SliverList` with article cards (16:9 thumbnail, kicker, headline, byline, reading time). Section dividers for editorial picks. Sticky filter chips at top (All / Race / Tech / Driver / Editorial).
- **Components**: `ArticleCard`, `ArticleCardFeatured` (2x height for top story), `KickerLabel`, `FilterChipRow`.
- **Gestures**: swipe-right on card = save (with snackbar undo). Long-press = share sheet. Pull-to-refresh.
- **Motion**: `Hero` transition on thumbnail to article screen. Kicker uses `AnimatedDefaultTextStyle` color shift on tap.
- **Offline**: last 100 articles cached. Images via `cached_network_image` with disk cache 100 MB.
- **Push trigger**: `breaking_news` channel = high-importance with sound; deep-links to article.

### 3.6 Standings

- **Layout**: Tabs (`Drivers` / `Constructors`). Each tab = sticky season picker → list rows. Row shows position chip, driver/team avatar, name, points, gap, last-race delta arrow.
- **Components**: `SeasonPicker`, `StandingRow`, `PositionChip`, `DeltaArrow`.
- **Gestures**: tap row → driver/team profile. Long-press season picker → years selection sheet.
- **Motion**: position changes animate via `AnimatedReorderableList` with 220ms transition; delta arrows pulse once on data refresh.
- **Offline**: current season cached, historical lazy-loaded.
- **Push trigger**: none direct; `race_start` push includes "view standings" CTA.

### 3.7 Drivers

- **Layout**: Grid (2-col on phone, 3-col tablet) of `DriverCard` (portrait, team-color bottom band, name + number). Top: filter (Active 2026 / Hall of Fame). Search affordance jumps to global search with `drivers` scope.
- **Components**: `DriverGrid`, `DriverCard`, `FilterPill`.
- **Gestures**: tap → profile (`/drivers/:slug`). Long-press = follow toggle (haptic success).
- **Motion**: `SliverGrid` with staggered fade-in via `flutter_staggered_animations` (60ms stagger, 300ms duration).
- **Offline**: full active-grid cached.
- **Push trigger**: `driver_news_<slug>` per follow (dynamic channels).

### 3.8 Teams

Mirrors Drivers screen, single col `TeamCard` (wider, livery photo + constructor logo + WCC position badge). Same gestures/motion. Push channel `team_news_<slug>`.

### 3.9 Search

- **Layout**: Full-screen sheet from News/etc top. Sticky search bar with mic icon. Empty state = "Trending searches" + "Recently viewed". Results in sections: Drivers / Teams / Races / Articles. Scope chips below search bar.
- **Components**: `ApexSearchBar`, `ScopeChipRow`, `SectionHeader`, result-type-specific tiles.
- **Gestures**: keyboard search action triggers, tap result navigates, swipe-down dismisses.
- **Motion**: results fade-in 180ms. Keystroke debounce 220ms → triggers Meilisearch via `/api/v1/search`.
- **Offline**: searches local cache first (Hive scan over `articles`, `drivers`, `teams`, `races` boxes by name field), then API. Offline banner if no network.
- **Push trigger**: n/a.

### 3.10 Saved

- **Layout**: Sectioned list (Articles / Races / Drivers / Teams). Edit mode reveals bulk-select. Empty state with illustration + CTA "Browse News".
- **Components**: `SavedSection`, `SwipeToDeleteRow`, `EditModeToolbar`.
- **Gestures**: swipe-left = unsave (undo snackbar 4s). Long-press = enter edit mode.
- **Motion**: implicit `AnimatedSize` on row dismiss.
- **Offline**: 100% offline-capable; reads from `user_saved` box. Sync on connectivity restore.
- **Push trigger**: n/a.

### 3.11 Settings

- **Layout**: Standard grouped list. Sections: Account / Notifications / Appearance / Data & Storage / Privacy / About. "Notifications" expands to per-channel toggles + quiet hours.
- **Components**: `SettingsTile`, `SettingsSwitch`, `QuietHoursTile`, `ChannelToggleList`, `LegalLinkTile`.
- **Gestures**: standard taps. Time-picker for quiet hours.
- **Motion**: `AnimatedSwitcher` on expandable sections.
- **Offline**: 100% local except account → Supabase.
- **Push trigger**: opens here from notification settings deep link `apex://settings/notifications`.

### 3.12 Profile

- **Layout**: Top avatar + display name + Apex+ badge if active. Tabs (`Activity` / `Follows` / `Apex+`). Activity = recent reads/saves. Follows = chip list of followed drivers/teams. Apex+ = subscription state, manage billing CTA (deep-link Stripe portal for web subs, App Store / Play Store for IAP).
- **Components**: `ProfileHeader`, `ActivityList`, `FollowsChips`, `ApexPlusCard`, `ManageBillingButton`.
- **Gestures**: tap chip = unfollow confirm. Tap manage = redirects per source (Stripe vs IAP).
- **Motion**: header collapses to small persistent header on scroll (`SliverAppBar` collapse).
- **Offline**: cached profile read; mutations queue.
- **Push trigger**: `apex_plus` channel announcements when subscribed.

---

## 4. TODAY SCREEN DEEP DIVE — Inshorts vertical card stream

### 4.1 Mechanics

`PageView.builder(scrollDirection: Axis.vertical, pageSnapping: true, physics: const ClampingScrollPhysics())`. Each card is one full-screen page (`SafeArea` respected). Snap is hard — no partial cards visible. Haptic `HapticFeedback.selectionClick()` fires on every page change (Riverpod listener on `PageController.page`).

```dart
PageController _ctrl = PageController();
@override
void initState() {
  super.initState();
  _ctrl.addListener(() {
    final p = _ctrl.page;
    if (p != null && (p - p.round()).abs() < 0.01 && p.round() != _lastPage) {
      _lastPage = p.round();
      HapticFeedback.selectionClick();
      ref.read(analyticsProvider).track('today_card_viewed', {'index': _lastPage, 'type': cards[_lastPage].kind});
    }
  });
}
```

Top-left: compact Apex wordmark. Top-right: gear → Settings. Bottom-right floating share button (changes target by card type). Bottom-left small dot rail (max 8 dots; collapses to "•••" beyond).

### 4.2 Card type model (freezed sealed union)

```dart
@freezed
sealed class TodayCard with _$TodayCard {
  const factory TodayCard.countdown({
    required String raceId,
    required DateTime sessionStart,
    required String label,    // "Lights out — Monaco GP"
    required String circuitImg,
  }) = TodayCardCountdown;

  const factory TodayCard.breakingNews({
    required String articleId,
    required String kicker,   // "BREAKING"
    required String headline,
    required String thumb,
    required DateTime publishedAt,
  }) = TodayCardBreakingNews;

  const factory TodayCard.standingsTile({
    required String season,
    required List<DriverStandingRow> top5,
  }) = TodayCardStandings;

  const factory TodayCard.featuredVideo({
    required String videoId,
    required String provider, // 'youtube' | 'r2'
    required String title,
    required Duration runtime,
    required String posterUrl,
  }) = TodayCardFeaturedVideo;

  const factory TodayCard.topReddit({
    required String url,
    required String subreddit,
    required String title,
    required int upvotes,
    required int comments,
  }) = TodayCardReddit;

  const factory TodayCard.topInstagram({
    required String permalink,
    required String handle,
    required String mediaUrl,
    required String caption,
  }) = TodayCardInstagram;

  const factory TodayCard.quizPrompt({
    required String quizId,
    required String question,
    required int questionCount,
  }) = TodayCardQuiz;

  const factory TodayCard.archiveDeepDive({
    required String articleId,
    required String pulledQuote,
    required String era,      // "1976" "Schumacher era"
    required String coverImg,
  }) = TodayCardArchive;
}
```

Each variant gets a dedicated widget (`CountdownCardWidget`, `BreakingNewsCardWidget`, etc.). Card switch uses Dart pattern matching:

```dart
Widget build(BuildContext ctx) => switch (card) {
  TodayCardCountdown(:final raceId, :final sessionStart, :final label, :final circuitImg) =>
    CountdownCardWidget(raceId: raceId, sessionStart: sessionStart, label: label, img: circuitImg),
  TodayCardBreakingNews(:final articleId, :final headline, :final thumb, :final kicker, :final publishedAt) =>
    BreakingNewsCardWidget(...),
  // ...
};
```

### 4.3 Ordering algorithm

Server-side `/api/v1/today/feed` returns ranked list. Ranking signal per card (weight in brackets, total normalized 0-1):

```
score =  0.30 * recency_decay
       + 0.20 * breaking_flag           (binary; 1 if `breaking=true`)
       + 0.15 * follow_match            (driver/team in user.follows)
       + 0.20 * race_day_boost          (1 if within race weekend window)
       + 0.05 * source_quality          (editorial > syndicated > social)
       + 0.10 * personalization         (engagement history: card kinds user interacts with)
```

`recency_decay = exp(-hours_old / 12)` — half-life 12h.

`race_day_boost` window: from Thursday 00:00 local circuit time → Monday 06:00. Within window, countdown cards always pinned to slot 0, live-status cards (if any session running) pinned to slot 1.

Force-order rules (override score):
1. If a live session is ongoing → `LiveStatusCard` at slot 0 (deep links to Live Mode).
2. Else if next session <6h away → `CountdownCard` at slot 0.
3. Else top-scored card at slot 0.
4. Dedupe: no two consecutive cards of same `kind` and no two cards referencing same `articleId/raceId/driverId`.
5. Diversity: at least 1 social card (`reddit`|`instagram`) every 6 cards if available.
6. Cap: max 25 cards per refresh. Pull-to-refresh appends if older content exists; daily reset at user-local 04:00.

Server computes ranking via Trigger.dev hourly job + on-demand refresh on breaking-news webhook. Mobile pulls feed on app open, refresh button (top-right next to gear), and silent push `today_feed_refresh` (data-only, see §6).

### 4.4 Per-card affordances

- **Countdown** → tap = open Race Hub. CTA "Set reminder" if not already set.
- **Breaking news** → tap = article. Swipe-right = save.
- **Standings** → tap = Standings screen.
- **Featured video** → tap = inline embed via `youtube_player_iframe` for YouTube; for R2-hosted, `chewie` over `video_player`. Autoplay muted ≤8s preview on dwell >1s if Wi-Fi.
- **Top Reddit** → tap = `url_launcher` external (we don't rehost reddit content). Card shows attribution.
- **Top IG** → tap = external. Shows oEmbed thumbnail only (we never proxy IG images — copyright).
- **Quiz prompt** → tap = Quiz flow (4-question multiple choice, leaderboard reveal).
- **Archive deep-dive** → tap = long-form article with EB Garamond pulled-quote treatment.

### 4.5 Analytics events

`today_card_viewed`, `today_card_tapped`, `today_card_saved`, `today_swipe_completed`, `today_session_length` (on app background).

---

## 5. LIVE MODE RACE-DAY

### 5.1 Entry triggers

1. `race_start` push tap (deep link `apex://race-hub/live`).
2. App open detects active session (server `/api/v1/sessions/active` returns non-null) → modal banner "Live now — tap to open".
3. Manual: Race Hub → "Watch live timing" CTA.
4. Background → foreground transition during active session → auto-route to Live Mode if user has it enabled in Settings (default: on).

### 5.2 Orientation

Rotate hint card on first open of session: "Rotate for full timing tower". User can dismiss (saved in `kv`). We do NOT force landscape — accessibility violation. Both orientations supported.

**Portrait**: stacked panels with swipeable tabs (`Timing` / `Track` / `Race Control` / `Radio`).
**Landscape**: 3-column — timing tower left (40%), track map center (40%), race control + weather + radio right (20%).

### 5.3 Components

- `TimingTowerWidget` — list of 20 rows. Pos chip, driver tag, last lap time (mono), gap to leader, gap to ahead, tyre compound chip, tyre age, pit-stop count, sector flags (purple/green/yellow). Row delta arrow animates 220ms `easeOutQuart` on position change.
- `TrackMapWidget` — SVG track outline + 20 driver dots colored by team. Dots interpolate via `Tween<Offset>` at 60fps from 1Hz position data (OpenF1 provides ~3-5Hz on premium; we'll see). Rendered via `CustomPaint` with `Path` for the track and `Canvas.drawCircle` for dots. Skia/Impeller handles the load.
- `RaceControlFeed` — chronological list of FIA messages (flags, SC, VSC, investigations). Newest top, color-coded chips.
- `WeatherPanel` — air temp, track temp, humidity, wind, rain probability, last update.
- `TeamRadioFeed` — list of recent transcribed radio with playback button (audio served by us as R2 cache of OpenF1 source). Each item attributed.

### 5.4 Connection model

- **Default (Wi-Fi or 4G+)**: WebSocket to our edge worker at `wss://live.apexf1.app/v1/session/:id`. Server fans out OpenF1 + our processed deltas. Heartbeat every 25s, reconnect with backoff 1s/2s/4s/8s/15s/30s capped.
- **Battery-save**: detected when `Battery.batteryState == BatteryState.discharging && level < 25%` OR user toggle in Settings. Switches to HTTPS polling every 5s of `/api/v1/session/:id/snapshot`. WebSocket closed.
- **Background**: WS closed entirely. Re-opened on foreground. Foreground service NOT used on Android (too much battery, can violate Play Store policy for non-essential live content).

### 5.5 Pull-to-refresh disabled

`physics: const NeverScrollableScrollPhysics()` on the outer panel (scroll occurs inside individual panels). Auto-update via WS or 5s poll. Top-right "wifi" icon shows connection state: solid green (WS live), pulsing yellow (reconnecting), gray (battery-save polling), red strike (offline — last update timestamp shown).

### 5.6 Offline

If WS down + polling fails: freeze last snapshot, show stale banner with last-update relative time. Timing tower greys out lap times older than 30s. Race control feed stays browsable (cached). No mutations.

### 5.7 Notifications during session

While Live Mode is foreground, suppress related push notifications (in-app already showing data). Server flags `session_active_user=true` via presence and skips. Other category pushes (e.g., breaking_news) still arrive normally.

---

## 6. PUSH CATEGORY ARCHITECTURE

### 6.1 Channels (Android 8+ NotificationChannels; iOS uses categories)

```dart
const channels = <AndroidNotificationChannel>[
  AndroidNotificationChannel(
    'race_start', 'Race start',
    description: 'Lights-out alerts for race sessions',
    importance: Importance.high,
    playSound: true,
    sound: RawResourceAndroidNotificationSound('apex_lights_out'),
    enableVibration: true,
    vibrationPattern: Int64List.fromList([0, 200, 100, 200]),
  ),
  AndroidNotificationChannel(
    'qualifying_start', 'Qualifying start',
    description: 'Q1/Q2/Q3 + Sprint Quali starts',
    importance: Importance.high,
    playSound: true,
  ),
  AndroidNotificationChannel(
    'breaking_news', 'Breaking news',
    importance: Importance.high,
    playSound: true,
  ),
  AndroidNotificationChannel(
    'editorial_picks', 'Editorial picks',
    importance: Importance.low,
    playSound: false,
  ),
  AndroidNotificationChannel(
    'apex_plus', 'Apex+ updates',
    description: 'Subscriber-only content alerts',
    importance: Importance.defaultImportance,
  ),
];
```

**Dynamic channels** for follow-driven (`driver_news_<slug>`, `team_news_<slug>`): created on first follow, deleted on unfollow. Android caps at ~100 channels per group — well within budget (20 active drivers + 10 teams = 30 max).

### 6.2 Payload format (FCM data + notification mix)

```json
{
  "notification": {
    "title": "BREAKING — Hamilton to Ferrari confirmed",
    "body": "Multi-year deal announced. Tap to read.",
    "android_channel_id": "breaking_news"
  },
  "data": {
    "deep_link": "apex://news/hamilton-ferrari-confirmed",
    "category": "breaking_news",
    "image_url": "https://r2.apexf1.app/push/hf2026.jpg",
    "send_id": "ulid_01HQ...",
    "sent_at_unix": "1735776000"
  },
  "android": {
    "priority": "HIGH",
    "ttl": "21600s",
    "collapse_key": "breaking:hamilton-ferrari"
  },
  "apns": {
    "headers": {"apns-priority": "10", "apns-collapse-id": "breaking:hamilton-ferrari"},
    "payload": {
      "aps": {
        "alert": {"title": "...", "body": "..."},
        "sound": "apex_breaking.caf",
        "category": "BREAKING_NEWS",
        "thread-id": "breaking",
        "mutable-content": 1
      }
    },
    "fcm_options": {"image": "https://r2.apexf1.app/push/hf2026.jpg"}
  }
}
```

Notification Service Extension on iOS (`apex_nse` target) downloads the `image_url` to attach as rich preview.

### 6.3 Quiet hours

Setting: per-user `quiet_start`, `quiet_end` (local tz). Stored Supabase + Hive. Server checks before sending — IF channel is NOT `race_start` (race_start always sends, opt-out only). Implementation: when scheduling, server computes whether `now()` at user's tz falls inside quiet window; if yes and channel is not exempt, queue for `quiet_end + 1 minute` or drop if event-stale.

### 6.4 Timezone-aware send

User's IANA tz auto-detected at app open (`flutter_timezone`) and synced to `user_preferences.tz`. Editorial picks scheduled for 08:00 local; race reminders use circuit-local time of session minus offset (T-24h, T-1h, T-5m); breaking_news ignores tz (real-time).

### 6.5 Frequency cap

`max 3 non-race-day pushes / 24h` enforced server-side via Redis sorted set keyed by `user_id`. Counter resets at user-local 04:00. Exemptions: `race_start`, `qualifying_start` (race-weekend channels never count). If cap hit, lower-importance pushes dropped silently; `breaking_news` still wins but bumps a low-importance push out (LRU-style).

### 6.6 iOS critical alerts

`race_start` requests **critical alert entitlement** — bypasses Do Not Disturb. Requires Apple approval; we apply Month 13. Until approved, race_start uses standard high-priority + custom long sound (~8s). User-facing toggle: "Allow lights-out alerts during Do Not Disturb" (off by default).

### 6.7 Token lifecycle

On login: write token to `user_devices` (Supabase) with platform, app_version, locale, tz, last_seen. On token refresh (FCM `onTokenRefresh`): upsert. On logout: delete by token. On uninstall detection (FCM returns `unregistered`): hard delete.

### 6.8 Data-only refresh pushes

`today_feed_refresh` is data-only (no `notification` field) — wakes app silently to refresh Today feed. iOS: `content-available: 1`. Android: high-priority data message (Doze respected; OK because not urgent).

---

## 7. OFFLINE / SYNC STRATEGY

### 7.1 Sync endpoint

```
GET /api/v1/sync?since={iso8601}&entity_kinds=articles,races,drivers,teams,standings,user.follows,user.saved
Authorization: Bearer <jwt>

200 {
  "server_time": "2026-09-15T12:30:00Z",
  "deltas": {
    "articles": [{"id": "...", "updated_at": "...", "deleted": false, "data": {...}}, ...],
    "races": [...],
    ...
  },
  "next_since": "2026-09-15T12:30:00Z"
}
```

Per-entity-kind cursor stored in `sync_cursors` box. Client sends cursor; server returns rows where `updated_at > cursor` (including soft-deletes with `deleted: true`). Page size 200 per kind; client paginates with `next_token` until empty.

### 7.2 Conflict resolution

**Last-write-wins by server timestamp**, period. Mobile-mutable entities (`user.follows`, `user.saved`, `user.preferences`) use **client-generated `updated_at` from device clock** + server validates with `Math.max(client_ts, server_ts)`. We accept ~clock drift on the order of seconds; nothing is collaborative.

For mutations made offline: queued in `mutation_queue` box, drained on connectivity restore via `/api/v1/mutations/batch`. Conflict (server has newer state): server wins, client mutation discarded, telemetry event `mutation_conflict` fires.

### 7.3 Cache size limits

| Box | Limit | Eviction |
|-----|-------|----------|
| articles | 100 entries | LRU by `lastReadAt` |
| images (cached_network_image) | 100 MB | LRU by access |
| videos | 0 (never cached) | n/a |
| races | current + previous season | hard cap 2 seasons |
| standings | current season | replace-on-refresh |
| drivers / teams | all active grid + followed historical | unbounded but small (~50 rows) |
| user.follows / user.saved | unbounded | server-backed |

Hive boxes manually trimmed on app start if over limit. Total app data target: <200 MB after 30 days of use.

### 7.4 Stale-while-revalidate UX

Every screen pattern:

1. Try Hive cache → emit immediately if present.
2. Show subtle "Updating…" pill in top-right if revalidation in flight.
3. On fresh data: silent replace (no layout jump).
4. On revalidation failure: keep cache, show "Last updated Xm ago" pill.

Standings, race details, drivers, teams, articles all follow this pattern via the `_$Notifier` template in §1.3.

### 7.5 Background fetch

- **iOS**: `BGTaskScheduler` with `BGAppRefreshTaskRequest` identifier `app.apexf1.refresh-today`. Earliest 15 min after last fetch. iOS decides actual cadence based on user habits; typically every 1-6h. Task does a `/sync` call + Today feed refresh.
- **Android**: `WorkManager` periodic work, 4h interval, requires Wi-Fi (configurable in Settings — let user pick). Constraint: device idle preferred.
- **Race-day boost**: from Friday 06:00 → Sunday 23:59 circuit-local, mobile schedules an `OneTimeWorkRequest` every 30 min for incremental session data. Battery permission required; explained in onboarding.

`workmanager` and `background_fetch` packages used.

### 7.6 Connectivity awareness

`connectivity_plus` exposes a Riverpod `StreamProvider<ConnectivityResult>`. UI shows persistent "Offline" snackbar (bottom) when offline; auto-dismiss on restore + flushes mutation queue.

---

## 8. PERFORMANCE BUDGETS

| Budget | Target | Measurement | Owner action if missed |
|--------|--------|-------------|------------------------|
| Cold start | <2.0s (Pixel 5a, Android 14) | Firebase Performance + `Trace` from `bootstrap.dart` start to first Today frame | Defer Hive box opening for non-essential boxes; lazy `precacheFonts` |
| Warm start | <600ms | Firebase Performance | Avoid `runApp` work; use `WidgetsBinding.instance.addPostFrameCallback` |
| Frame rate | 60 fps everywhere; 120 fps where device supports (`FlutterView.display.refreshRate >= 120`) | DevTools Performance overlay, Sentry slow-frames | `RepaintBoundary` aggressive on Live Mode track map; const constructors everywhere; avoid `setState` in scroll listeners |
| Skipped frames during race-day feed scroll | 0 (target), <2 per 1000 (acceptable) | Sentry slow-frames per route | Replace `BoxShadow` chains with `ColoredBox` + `Material elevation` (cheap path) |
| APK initial download (App Bundle, arm64 split) | <30 MB | Play Console size report | Trim google_fonts to subset; precompile assets webp; drop unused locales until 3.5 |
| App Store IPA | <50 MB (App Store metric is install size, more permissive) | App Store Connect | Same as above |
| First-open data | <5 MB | Charles proxy in dev; PostHog network bytes event | Defer non-critical fetches; bundle smaller fixtures; serve webp not png from R2 |
| Memory peak | <250 MB | Android Studio profiler; Xcode Instruments Allocations | Dispose `VideoPlayerController`; cap image cache; `PageView` `allowImplicitScrolling: false` to skip 1 page preload when intentional |
| Battery — 2h race session | <8% drain on Pixel 5a | Android Battery Historian + manual test | Battery-save mode (§5.4) automatic; reduce track-map FPS to 30 when level <30% |
| Network — race session | <30 MB | PostHog network bytes; manual mitmproxy | WS delta-only frames; gzip on; downsampled position frames 2Hz instead of 5Hz on cellular |
| Jank > 700ms | 0 ANRs / 1000 sessions | Play Console Vitals | Off-main-thread JSON via `compute()` for any payload >50 KB |

Performance regression gate in CI: `dart_code_metrics` + custom `flutter test --profile` smoke that asserts frame budget on key screens.

---

## 9. APP STORE LAUNCH STRATEGY

### 9.1 Soft launch (M12, weeks 1-3 of month)

- **Markets**: Australia, New Zealand, Brazil.
- **Why**: F1-heavy markets, English-speaking (AU/NZ) plus PT-BR for localization rehearsal, small enough that low-volume bugs surface as user feedback not viral roasts, time zones spread (test push timezone logic).
- **Play Console**: open beta in those 3 countries only.
- **App Store Connect**: TestFlight public link, geo-link via marketing site for those 3 countries.
- **Goal**: 500 installs / 100 weekly actives / crash-free ≥99% / NPS ≥ 30.

### 9.2 Hard launch (M12 weeks 3-4)

- **Markets**: US, UK, India, Germany, Italy, Netherlands, Mexico.
- **Justification**: top F1 markets by 2025 viewership + India (largest English-speaking mobile market, fast-growing F1 audience).
- **Defer**: France/Spain (need fr-FR + es-ES localization first — Phase 3.5).

### 9.3 ASO keyword research

Top 10 keywords per market (tools: AppTweak free tier, App Store Connect search ads keyword discovery):

- **US/UK/AU/NZ**: f1, formula 1, race news, motorsport, grand prix, lights out, paddock, standings, race calendar, formula one (lowercase variations matter on Play; identical on App Store with their normalization).
- **IN**: same as US + "f1 india", "lewis hamilton", "verstappen".
- **DE**: formel 1, motorsport nachrichten, vettel, schumacher, grand prix, rennsport, formel eins, qualifying, weltmeisterschaft, mick.
- **IT**: formula 1, motorsport, ferrari, gp, gran premio, qualifiche, mondiale, leclerc, scuderia, classifica.
- **NL**: formule 1, max verstappen, oranje, kwalificatie, grand prix, standen, race, motorsport, dutch gp, kampioenschap.
- **MX**: formula 1, checo perez, gran premio, escudería, calendario f1, motorsport, mundial, parrilla, vuelta, podio.

**Title**: "Apex — Formula 1 News & Live" (under 30 chars).
**Subtitle/short description**: "Lights-out push, live timing, deep archive. Unofficial."
**Long description**: 4000 chars, frontload top-3 keywords, include "Unofficial — not affiliated with FOM/FIA" line in para 2.

### 9.4 Screenshot strategy (5 screens, no F1 marks)

Per Apple/Google rules + our IP posture:
1. **Today feed** card-stack mockup. Headline = "Catch every story in seconds." No real-driver photos; use stylized illustrations with generic helmets/cars (we commission art).
2. **Live Mode landscape** with abstracted timing tower (anonymized driver tags like "DRV01") + track map. Headline: "Watch the race like you're trackside."
3. **Race Hub countdown** with circuit silhouette. Headline: "Never miss lights out."
4. **Driver/team grid** with original art. Headline: "Follow your favorites."
5. **Search/archive** with old-race illustration. Headline: "75 years of F1, instant search."

Every screenshot embeds tiny "Unofficial" badge bottom-left.

### 9.5 Preview video script (30s, vertical 9:16 + horizontal 16:9 variants)

```
0:00–0:03  Dark screen. Telemetry-red glow. Anybody-800 "APEX" types in.
0:03–0:08  Quick cuts of card swipes on Today feed (3 cards in 5s).
0:08–0:14  Live Mode timing tower scroll, position-change animation pulse.
0:14–0:18  Track map dots racing around circuit (custom illustration, abstracted).
0:18–0:22  Push notification overlay: "Lights out — Monaco".
0:22–0:27  Archive search bar typing "1976", results fanning in.
0:27–0:30  Apex wordmark + tagline "Independent. Telemetry-grade. Unofficial."
```

Audio: original synth track (we commission, 30s, looped). No real F1 broadcast audio.

### 9.6 Review prompt timing

`in_app_review` plugin (uses native iOS `SKStoreReviewController` and Android In-App Review). Triggers:

1. User has opened app ≥7 days.
2. Has been through ≥3 race weekends (using app during Sun race window).
3. Just completed a positive interaction (saved an article, finished a quiz with score >50%, viewed Live Mode for >10 min).
4. Has NOT been prompted in last 120 days (iOS hard-throttles to 3/year automatically; we track ourselves).
5. Has NOT just crashed (Sentry session flag checked).

### 9.7 Localization roadmap

**Phase 3 (M9-M12)**: en-US, en-GB.
**Phase 3.5 (M13-M14)**: es-ES, es-MX, pt-BR, de-DE, it-IT, nl-NL.

Tooling: `flutter_intl` + ARB files. Translators: Lokalise free tier (under 500 keys) or contract translators on Smartcat. Founder reviews technical terms (telemetry, undercut, parc fermé) personally.

---

## 10. CROSS-PLATFORM REVIEW — Why Flutter

### 10.1 Flutter wins for Apex

- **Skia/Impeller rendering** → custom track map at 60-120fps with hundreds of moving dots is trivial. RN Skia exists but adds binding overhead and an unmaintained ecosystem (Shopify Skia is the only serious one).
- **120fps native support** out of the box. RN on Android still has frame-pacing issues on 120fps panels (improving with New Architecture, still rough Q1 2026).
- **Hive offline** is best-in-class for embedded reactive cache; RN MMKV is excellent but reactive integration to React state means more glue. Hive + Riverpod = idiomatic.
- **Single binary delivery** — App Bundle splits without per-arch JS bundle headaches.
- **Live Mode track map** specifically is the strongest argument: GSAP/RN-Reanimated would push us to native module work. Flutter `CustomPaint` is plain Dart.
- **Strict typing end-to-end** — Dart 3 sealed classes for `TodayCard` union are cleaner than discriminated TS unions in RN, especially with codegen pipeline.
- **No JS-bridge variance** between iOS and Android — Apex+ paywall behavior, push handling, deep links all behave identically.

### 10.2 Where React Native Expo would have been better

- **Faster initial dev velocity** if we already had a JS/TS team (we do — web team = me).
- **Shared logic with web** — Riverpod doesn't share with Next.js; if we used Zustand on web + zustand on RN we'd share state stores. Marginal benefit — most of our "shared" logic lives behind the API anyway.
- **OTA updates** via EAS Update — useful for quick patches without store review. We mitigate by aggressive staged rollouts + Trigger.dev feature flags read by mobile.
- **Hiring pool** — RN devs outnumber Flutter devs ~3:1 in 2026 still, even with Flutter's growth.

### 10.3 Why not native Kotlin Compose first, then Swift

- **Two codebases, two test matrices, two store-review cycles.** Solo founder → 2x throughput is fatal.
- **Compose Multiplatform** is closer than ever but iOS story is still beta-ish — Apex+ in-app purchase + critical alerts demand mature platform plugins.
- **Hire-and-ship economics** — one Flutter contractor M10-M11 is cheaper than two natives.

### 10.4 Decision

**Flutter is locked. Phase 3.5 reconsider only if we hit a Flutter-specific blocker** (e.g., Apple kills CriticalAlerts for third-party apps and we need a native iOS extension for it).

---

## 11. DEV TIMELINE — Months 9-12

### M9 (weeks 1-4): Foundation + Today + News

| Week | Deliverable |
|------|-------------|
| W1 | Repo scaffold `apps/mobile`, Flutter 3.27 install, CI (GitHub Actions: `flutter test`, `flutter analyze`, build APK + IPA), `packages/api-contract` skeleton with Drizzle Zod, openapi.json emit, openapi-generator wired. |
| W2 | Theme (Material 3 dark), router (GoRouter with shell), Supabase auth flow (email magic link + Google + Apple Sign-In stub), bootstrap (Sentry/Firebase/PostHog/Hive init). |
| W3 | News screen MVP (fixtures + Hive cache), Article screen with reader mode, save/unsave flow. |
| W4 | Today screen — vertical PageView, 4 card kinds done (countdown, breaking news, standings, archive). Card ranking server endpoint stubbed. Internal dogfood: founder-only TestFlight build. |

**M9 exit gate**: 60fps Today scroll on Pixel 5a, News article opens <500ms from cache, cold start <2.5s (will tighten).

### M10 (weeks 5-8): Race Hub + Standings + Drivers/Teams + Search + Saved

| Week | Deliverable |
|------|-------------|
| W5 | Race Hub off-race-day view + countdown ribbon + circuit info sheet. |
| W6 | Standings tabs + season picker + reorder animations. Drivers grid + profile screen. |
| W7 | Teams grid + profile. Saved screen + edit mode. |
| W8 | Search screen + Meilisearch integration + scope chips. Contract dev onboards W6, owns Drivers/Teams + Search. |

**M10 exit gate**: 7 of 11 screens shippable. Cold start ≤2.2s.

### M11 (weeks 9-12): Live Mode + Push + Offline + Settings + Onboarding

| Week | Deliverable |
|------|-------------|
| W9 | Push channels Android + iOS, FCM token sync, payload deep links, quiet hours, frequency cap. |
| W10 | Offline sync endpoint contract, Hive cursors, mutation queue, background fetch (iOS+Android). |
| W11 | Live Mode — timing tower + race control + weather + radio. WS connection. Battery-save fallback. |
| W12 | Onboarding flow. Settings (all groups). Profile screen. Internal QA with TestFlight 25-person group. |

**M11 exit gate**: All 11 screens complete. Crash-free ≥98% (target 99% by M12 end). Battery test <8% / 2h.

### M12 (weeks 13-16): Polish + ASO + Soft launch + Open beta

| Week | Deliverable |
|------|-------------|
| W13 | Performance pass — frame budgets, memory profiling, APK size pass, image webp conversion, dead-code removal. |
| W14 | ASO assets (screenshots, preview video commission, descriptions in en-US/en-GB). Play Console + App Store Connect submissions. |
| W15 | Soft launch (AU, NZ, BR) — open beta on Play, TestFlight public link on iOS. Founder monitors PostHog daily, fixes top 3 issues. |
| W16 | Hard launch (US, UK, IN, DE, IT, NL, MX) — release on Play production track. iOS held to M13 (App Store review timing + critical alerts entitlement pending). |

**M12 exit gate**: 5k+ installs, crash-free ≥99.5%, App Store rating ≥4.4, App Store rejections = 0.

---

## 12. iOS PARITY TIMELINE — Months 13-14

Android-first ships M12. iOS launches M13-M14 with these deltas:

| Concern | Android (M12) | iOS (M13-14) |
|---------|---------------|--------------|
| Push | FCM direct | APNs token via Firebase, Notification Service Extension for rich images + critical alerts entitlement request |
| Auth | Google Sign-In via Firebase | Sign in with Apple **required** (Apple guideline 4.8 — if Google login offered, must offer Apple) |
| Tracking | n/a (Play uses Data Safety form) | App Tracking Transparency prompt before any third-party ID use; we use Sentry/PostHog with anonymous IDs only, so no ATT prompt needed — but **must declare** in privacy nutrition labels |
| Subscriptions | Google Play Billing (Apex+) | StoreKit 2 |
| Background tasks | WorkManager | BGTaskScheduler — iOS gives less control over cadence; document expectation in Settings |
| Universal links | App Links via `assetlinks.json` | `apple-app-site-association` JSON served from `https://apexf1.app/.well-known/` |
| Critical alerts (race_start DND bypass) | not applicable | requires Apple-approved entitlement; apply M12 W14, expect M14 |
| Privacy nutrition label | n/a | Data collected: anonymized usage, push tokens, account email, follow lists. NOT used for tracking |
| Store review | typically 2-7 days, can be 24h | typically 24-72h; rejection risk higher — pre-empted by including "Unofficial" disclaimer in metadata + screenshot |

iOS launch markets: same as Android hard-launch list except Mexico (defer to M14 W4 to focus en-US ASO).

---

## 13. APEX+ IN-APP PURCHASE STRATEGY

### 13.1 Reality check on platform cuts

- **Apple**: 30% standard, **15% for Small Business Program** (eligible if <$1M ARR — we qualify until ~year 3). Subscription renewal year 2+: 15% regardless.
- **Google**: same — 30% standard, 15% for first $1M and for subscription renewals year 2+.
- **Web (Stripe)**: 2.9% + 30¢ per txn. ~10x cheaper.

### 13.2 Apple's "reader app" rules

We are **not** a reader app (we are a news/sports app). We **cannot** link out from inside the app to web checkout per **Guideline 3.1.1** (in-app purchases of digital content must use Apple IAP). External link entitlement (post-Epic 2024) allows a single link to web checkout for certain regions (US, Netherlands, EU under DMA), but adds friction and Apple still takes a commission on those purchases — only 3-5% off the standard rate. Not worth the operational complexity.

### 13.3 Apex strategy

1. **App**: Apex+ subscription via IAP only. Tiers: monthly ($4.99) and annual ($39.99). Apple takes 15% (small biz), so net is $4.24 / $33.99. We model the 15% as cost-of-acquisition for app channel.
2. **Web**: Stripe subscription, same prices. Stripe net ≈ $4.55 / $38.55.
3. **Account linking**: Supabase user identity is unified. Web subscriber logs into app → sees Apex+ benefits via server check, no IAP needed. App subscriber logs into web → sees Apex+ via verifying Apple receipt validated by our `/api/v1/iap/verify` endpoint that writes `subscriptions` row.
4. **Never promote web in-app**: zero mentions of web pricing inside the app. Marketing site + email push web subs.
5. **Restore purchases** button in Settings (Apple requires it). Manage subscription button deep-links to Apple/Google subscription management URL (per platform) or Stripe customer portal for web subs.

### 13.4 Implementation

`in_app_purchase ^3.2.x` Flutter plugin. Server endpoints:

- `POST /api/v1/iap/verify` — accepts receipt blob, validates with Apple/Google, writes `subscriptions` row, returns entitlement.
- Webhook listeners — `App Store Server Notifications V2` for Apple, `Real-time Developer Notifications` for Google. Update `subscriptions.status` on `RENEWAL`, `EXPIRED`, `REFUND`.
- Grace period: 16 days for Apple, 30 days for Google — entitlement stays active.

### 13.5 Refunds

App: directed to Apple/Google (we have no control). Web: founder manually handles via Stripe dashboard. Documented in support page.

---

## 14. APP HEALTH METRICS

| Metric | Target (PID §24) | Tool | Alert threshold |
|--------|------------------|------|------------------|
| Crash-free sessions | ≥99.5% | Sentry + Firebase Crashlytics (cross-checked) | PagerDuty webhook if <99.0% over rolling 1h |
| Crash-free users | ≥99.0% | Sentry / Crashlytics | <98.5% over rolling 24h |
| Cold start | <2.0s P75 (Pixel 5a equivalent) | Firebase Performance custom trace `cold_start` | >2.5s P75 sustained 1h |
| Warm start | <600ms P75 | Firebase Performance | >1s P75 |
| Frame rate | 0 ANRs / 1000 sessions, <2 slow frames / 1000 frames | Play Console Android Vitals + Sentry slow-frames | ANR rate >0.1% Play Vitals threshold |
| Battery (2h race session) | <8% drain Pixel 5a, <10% iPhone 13 | Manual quarterly + telemetry from `battery_plus` reporting hourly during Live Mode | >12% reported in >5% of sessions |
| Memory peak | <250 MB | Firebase Performance custom + Android Studio profiler weekly | >350 MB in >1% sessions |
| Network usage (race session) | <30 MB | PostHog `network_bytes_session` event | >50 MB P75 |
| Push delivery rate | ≥97% | FCM/APNs delivery reports | <95% rolling 24h |
| Push open rate (breaking_news) | ≥25% | PostHog `push_opened` correlated to `send_id` | <15% rolling 7d → tune copy |
| Daily active users / weekly active users (DAU/WAU) | ≥30% | PostHog | <20% on race-day Mondays |
| Day-1 / Day-7 / Day-30 retention | 50% / 30% / 18% (PID §24 targets) | PostHog cohorts | -20% from target on any sustained 14d |
| Session length | ≥3 min median (off-race) / ≥12 min median (race-day) | PostHog | -25% from target |
| API error rate | <1% non-401, <0.1% 5xx | Sentry + server APM | >2% non-401 sustained 1h |

Telemetry dashboards:

- **Sentry** for crashes, slow frames, API errors, performance traces.
- **PostHog** for product analytics, funnels, retention, push performance.
- **Firebase** for Performance + Crashlytics (overlap with Sentry by design — cross-check, especially for early launch).
- **Play Console Vitals** + **App Store Connect Metrics** as source-of-truth for store-side health.

Weekly health review (Mondays) — founder reviews top 3 issues from each dashboard, files tickets in repo. SLO violation = immediate hotfix branch + staged rollout (Play Console 5% → 20% → 50% → 100% over 48h).

---

## CLOSE

This spec gives M9-M12 a non-negotiable backbone. Three things to lock before M9 W1 starts:

1. **PID D-decision needed** — Apex+ pricing ($4.99 / $39.99 or different?). Currently assumed.
2. **PID D-decision needed** — does brand allow custom illustrated mascots for screenshots, or strictly photographic? Affects M12 W14 asset cost.
3. **PID D-decision needed** — soft-launch start date triggers Apple critical-alerts application submission (60+ day expected approval) — must apply by M12 W2.

Once those land, M9 ships clean.

Spec file would live at `/Users/shauryapunj/Desktop/F1_Claude/APEX_MOBILE_PHASE3_SPEC.md` when you want it persisted to repo.
