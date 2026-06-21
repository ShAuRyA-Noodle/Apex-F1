# Phase B/C technical deep-spec with concrete code

# APEX — Phase B + Phase C Technical Execution Plan

Principal engineering blueprint. Every decision concrete. No handwaves. Code is real, versions are pinned, patterns are battle-tested.

---

## 1. DRIZZLE SCHEMA — FULL SQL

### 1.1 Conventions

- **Engine**: Postgres 15 (Supabase default).
- **Driver**: `postgres` (postgres.js) + `drizzle-orm@^0.36`, `drizzle-kit@^0.28`.
- **IDs**: stable string slugs from Jolpica/OpenF1 where they exist (e.g. `driver.id = "max_verstappen"`, `circuit.id = "monza"`). Surrogate UUIDs for derived rows (article, video, image, event_log).
- **Timestamps**: `timestamptz`, default `now()`. Every table gets `created_at`, `updated_at`.
- **Money**: `numeric(12,2)`. Time deltas: `interval` for race time gaps, `integer` ms for laps.
- **Enums**: Postgres native enums. Drizzle `pgEnum`.

### 1.2 Directory layout

```
packages/db/
├── drizzle.config.ts
├── package.json
├── src/
│   ├── index.ts                 # export db client + schema
│   ├── client.ts                # postgres.js + drizzle()
│   ├── schema/
│   │   ├── index.ts             # re-export everything
│   │   ├── enums.ts
│   │   ├── core.ts              # season, race, circuit, session
│   │   ├── people.ts            # driver, team, driver_team_history, author
│   │   ├── results.ts           # result, qualifying, sprint_result, pit_stop, lap
│   │   ├── standings.ts         # standings_driver, standings_team
│   │   ├── editorial.ts         # article, tag, article_*, video, image, embed_record
│   │   ├── navigation.ts        # nav_group, nav_link, partner
│   │   ├── identity.ts          # user, follow, saved, notification_pref
│   │   └── ops.ts               # event_log, ingestion_run
│   └── views.sql                # materialized views + GIN indexes (run as migration 0002)
└── drizzle/
    ├── 0000_init_enums.sql
    ├── 0001_core_tables.sql
    ├── 0002_results_and_standings.sql
    ├── 0003_editorial.sql
    ├── 0004_identity.sql
    ├── 0005_ops_and_views.sql
    └── meta/
```

### 1.3 Enums

```ts
// packages/db/src/schema/enums.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const sessionTypeEnum = pgEnum("session_type", [
  "fp1", "fp2", "fp3", "qualifying", "sprint_qualifying", "sprint", "race",
]);

export const tyreCompoundEnum = pgEnum("tyre_compound", [
  "soft", "medium", "hard", "intermediate", "wet", "unknown",
]);

export const articleStatusEnum = pgEnum("article_status", [
  "draft", "scheduled", "published", "archived",
]);

export const videoSourceEnum = pgEnum("video_source", [
  "youtube", "vimeo", "internal",
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "running", "succeeded", "failed", "partial",
]);

export const followTargetEnum = pgEnum("follow_target", [
  "driver", "team", "race",
]);
```

### 1.4 Core (season / circuit / race / session)

```ts
// packages/db/src/schema/core.ts
import {
  pgTable, integer, text, varchar, boolean, timestamp, doublePrecision,
  uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";
import { sessionTypeEnum } from "./enums";

export const season = pgTable("season", {
  year: integer("year").primaryKey(),
  wikipediaUrl: text("wikipedia_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const circuit = pgTable("circuit", {
  id: varchar("id", { length: 64 }).primaryKey(),               // jolpica circuitId
  name: text("name").notNull(),
  locality: text("locality"),
  country: text("country").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  altitude: integer("altitude_m"),
  lengthKm: doublePrecision("length_km"),
  corners: integer("corners"),
  drsZones: integer("drs_zones"),
  wikipediaUrl: text("wikipedia_url"),
  wikidataQid: varchar("wikidata_qid", { length: 16 }),
  heroImageId: varchar("hero_image_id", { length: 36 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  countryIdx: index("circuit_country_idx").on(t.country),
}));

export const race = pgTable("race", {
  id: varchar("id", { length: 32 }).primaryKey(),               // {year}-{round} e.g. "2026-08"
  season: integer("season").notNull().references(() => season.year, { onDelete: "restrict" }),
  round: integer("round").notNull(),
  circuitId: varchar("circuit_id", { length: 64 }).notNull().references(() => circuit.id),
  name: text("name").notNull(),
  officialName: text("official_name"),                          // unofficial label — no FIA marks
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  isSprintWeekend: boolean("is_sprint_weekend").default(false).notNull(),
  status: text("status").default("scheduled").notNull(),        // scheduled|live|completed|cancelled
  wikipediaUrl: text("wikipedia_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  seasonRoundIdx: uniqueIndex("race_season_round_uq").on(t.season, t.round),
  startsAtIdx: index("race_starts_at_idx").on(t.startsAt),
  statusIdx: index("race_status_idx").on(t.status),
}));

export const session = pgTable("session", {
  id: varchar("id", { length: 48 }).primaryKey(),               // {race.id}-{type} e.g. "2026-08-race"
  raceId: varchar("race_id", { length: 32 }).notNull().references(() => race.id, { onDelete: "cascade" }),
  type: sessionTypeEnum("type").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min"),
  openf1SessionKey: integer("openf1_session_key"),              // join key for live worker
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  raceTypeUq: uniqueIndex("session_race_type_uq").on(t.raceId, t.type),
  openf1Idx: uniqueIndex("session_openf1_key_uq").on(t.openf1SessionKey),
}));
```

### 1.5 People (driver / team / history / author)

```ts
// packages/db/src/schema/people.ts
import {
  pgTable, integer, text, varchar, timestamp, date, uniqueIndex, index,
} from "drizzle-orm/pg-core";

export const team = pgTable("team", {
  id: varchar("id", { length: 64 }).primaryKey(),               // jolpica constructorId
  name: text("name").notNull(),
  nationality: text("nationality"),
  base: text("base"),
  firstSeason: integer("first_season"),
  colorHex: varchar("color_hex", { length: 7 }),                // editorial colour, not livery
  wikipediaUrl: text("wikipedia_url"),
  wikidataQid: varchar("wikidata_qid", { length: 16 }),
  logoImageId: varchar("logo_image_id", { length: 36 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const driver = pgTable("driver", {
  id: varchar("id", { length: 64 }).primaryKey(),               // jolpica driverId
  givenName: text("given_name").notNull(),
  familyName: text("family_name").notNull(),
  code: varchar("code", { length: 3 }),                         // VER
  permanentNumber: integer("permanent_number"),
  dob: date("dob"),
  nationality: text("nationality"),
  wikipediaUrl: text("wikipedia_url"),
  wikidataQid: varchar("wikidata_qid", { length: 16 }),
  heroImageId: varchar("hero_image_id", { length: 36 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  codeIdx: index("driver_code_idx").on(t.code),
  numberIdx: index("driver_number_idx").on(t.permanentNumber),
  nameIdx: index("driver_name_idx").on(t.familyName, t.givenName),
}));

export const driverTeamHistory = pgTable("driver_team_history", {
  driverId: varchar("driver_id", { length: 64 }).notNull().references(() => driver.id, { onDelete: "cascade" }),
  teamId: varchar("team_id", { length: 64 }).notNull().references(() => team.id, { onDelete: "cascade" }),
  season: integer("season").notNull(),
  startRound: integer("start_round"),
  endRound: integer("end_round"),
  role: text("role"),                                           // race|reserve|test
}, (t) => ({
  pk: uniqueIndex("dth_pk").on(t.driverId, t.teamId, t.season),
  bySeason: index("dth_season_idx").on(t.season),
  byTeamSeason: index("dth_team_season_idx").on(t.teamId, t.season),
}));

export const author = pgTable("author", {
  id: varchar("id", { length: 36 }).primaryKey(),               // uuid
  slug: varchar("slug", { length: 80 }).notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarImageId: varchar("avatar_image_id", { length: 36 }),
  twitter: text("twitter"),
  bluesky: text("bluesky"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  slugUq: uniqueIndex("author_slug_uq").on(t.slug),
}));
```

### 1.6 Results / qualifying / sprint / pit / lap

```ts
// packages/db/src/schema/results.ts
import {
  pgTable, integer, text, varchar, timestamp, doublePrecision,
  uniqueIndex, index, numeric,
} from "drizzle-orm/pg-core";
import { tyreCompoundEnum } from "./enums";
import { race, session } from "./core";
import { driver, team } from "./people";

export const result = pgTable("result", {
  id: varchar("id", { length: 64 }).primaryKey(),               // {raceId}-{driverId}
  raceId: varchar("race_id", { length: 32 }).notNull().references(() => race.id, { onDelete: "cascade" }),
  driverId: varchar("driver_id", { length: 64 }).notNull().references(() => driver.id),
  teamId: varchar("team_id", { length: 64 }).notNull().references(() => team.id),
  gridPos: integer("grid_pos"),
  finishPos: integer("finish_pos"),
  classified: integer("classified"),                            // 1 = classified, 0 = DNF, etc.
  status: text("status"),                                       // "Finished" | "+1 Lap" | "DNF: Engine"
  pointsAwarded: numeric("points_awarded", { precision: 5, scale: 2 }).default("0").notNull(),
  fastestLapMs: integer("fastest_lap_ms"),
  fastestLapRank: integer("fastest_lap_rank"),
  totalRaceTimeMs: integer("total_race_time_ms"),
  laps: integer("laps"),
}, (t) => ({
  raceIdx: index("result_race_idx").on(t.raceId),
  driverIdx: index("result_driver_idx").on(t.driverId),
  teamIdx: index("result_team_idx").on(t.teamId),
  raceFinishIdx: index("result_race_finish_idx").on(t.raceId, t.finishPos),
}));

export const qualifying = pgTable("qualifying", {
  id: varchar("id", { length: 64 }).primaryKey(),
  raceId: varchar("race_id", { length: 32 }).notNull().references(() => race.id, { onDelete: "cascade" }),
  driverId: varchar("driver_id", { length: 64 }).notNull().references(() => driver.id),
  teamId: varchar("team_id", { length: 64 }).notNull().references(() => team.id),
  position: integer("position"),
  q1Ms: integer("q1_ms"),
  q2Ms: integer("q2_ms"),
  q3Ms: integer("q3_ms"),
}, (t) => ({
  raceDriverUq: uniqueIndex("qual_race_driver_uq").on(t.raceId, t.driverId),
  raceIdx: index("qual_race_idx").on(t.raceId),
}));

export const sprintResult = pgTable("sprint_result", {
  id: varchar("id", { length: 64 }).primaryKey(),
  raceId: varchar("race_id", { length: 32 }).notNull().references(() => race.id, { onDelete: "cascade" }),
  driverId: varchar("driver_id", { length: 64 }).notNull().references(() => driver.id),
  teamId: varchar("team_id", { length: 64 }).notNull().references(() => team.id),
  gridPos: integer("grid_pos"),
  finishPos: integer("finish_pos"),
  pointsAwarded: numeric("points_awarded", { precision: 5, scale: 2 }).default("0").notNull(),
  status: text("status"),
}, (t) => ({
  raceDriverUq: uniqueIndex("sprint_race_driver_uq").on(t.raceId, t.driverId),
}));

export const pitStop = pgTable("pit_stop", {
  id: varchar("id", { length: 80 }).primaryKey(),               // {raceId}-{driverId}-{stop}
  raceId: varchar("race_id", { length: 32 }).notNull().references(() => race.id, { onDelete: "cascade" }),
  driverId: varchar("driver_id", { length: 64 }).notNull().references(() => driver.id),
  stop: integer("stop").notNull(),
  lap: integer("lap"),
  timeOfDay: timestamp("time_of_day", { withTimezone: true }),
  durationMs: integer("duration_ms"),
}, (t) => ({
  raceIdx: index("pit_race_idx").on(t.raceId),
  raceDriverStopUq: uniqueIndex("pit_race_driver_stop_uq").on(t.raceId, t.driverId, t.stop),
}));

export const lap = pgTable("lap", {
  id: varchar("id", { length: 80 }).primaryKey(),               // {raceId}-{driverId}-{lap}
  raceId: varchar("race_id", { length: 32 }).notNull().references(() => race.id, { onDelete: "cascade" }),
  driverId: varchar("driver_id", { length: 64 }).notNull().references(() => driver.id),
  lapNo: integer("lap_no").notNull(),
  position: integer("position"),
  timeMs: integer("time_ms"),
  sector1Ms: integer("sector1_ms"),
  sector2Ms: integer("sector2_ms"),
  sector3Ms: integer("sector3_ms"),
  tyreCompound: tyreCompoundEnum("tyre_compound").default("unknown"),
  isPitOut: integer("is_pit_out").default(0).notNull(),
  isPitIn: integer("is_pit_in").default(0).notNull(),
}, (t) => ({
  raceDriverLapUq: uniqueIndex("lap_race_driver_lap_uq").on(t.raceId, t.driverId, t.lapNo),
  raceIdx: index("lap_race_idx").on(t.raceId),
  raceLapNoIdx: index("lap_race_lapno_idx").on(t.raceId, t.lapNo),
}));
```

`lap` is the big table — about 800k rows post-historical seed. Indexed `(race_id, lap_no)` is the hot path for "all positions at lap N".

### 1.7 Standings

```ts
// packages/db/src/schema/standings.ts
import {
  pgTable, integer, varchar, timestamp, uniqueIndex, index, numeric,
} from "drizzle-orm/pg-core";
import { driver, team } from "./people";
import { race } from "./core";

export const standingsDriver = pgTable("standings_driver", {
  id: varchar("id", { length: 96 }).primaryKey(),               // {season}-{round}-{driverId}
  season: integer("season").notNull(),
  round: integer("round").notNull(),
  afterRaceId: varchar("after_race_id", { length: 32 }).references(() => race.id),
  driverId: varchar("driver_id", { length: 64 }).notNull().references(() => driver.id),
  teamId: varchar("team_id", { length: 64 }).notNull(),
  position: integer("position").notNull(),
  points: numeric("points", { precision: 6, scale: 2 }).notNull(),
  wins: integer("wins").default(0).notNull(),
}, (t) => ({
  byRound: uniqueIndex("std_drv_season_round_driver_uq").on(t.season, t.round, t.driverId),
  bySeason: index("std_drv_season_idx").on(t.season, t.round),
}));

export const standingsTeam = pgTable("standings_team", {
  id: varchar("id", { length: 96 }).primaryKey(),
  season: integer("season").notNull(),
  round: integer("round").notNull(),
  afterRaceId: varchar("after_race_id", { length: 32 }).references(() => race.id),
  teamId: varchar("team_id", { length: 64 }).notNull().references(() => team.id),
  position: integer("position").notNull(),
  points: numeric("points", { precision: 6, scale: 2 }).notNull(),
  wins: integer("wins").default(0).notNull(),
}, (t) => ({
  byRound: uniqueIndex("std_tm_season_round_team_uq").on(t.season, t.round, t.teamId),
  bySeason: index("std_tm_season_idx").on(t.season, t.round),
}));
```

### 1.8 Editorial (article, tag, joins, video, image, embed_record)

```ts
// packages/db/src/schema/editorial.ts
import {
  pgTable, integer, text, varchar, timestamp, uniqueIndex, index, jsonb, boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { articleStatusEnum, videoSourceEnum } from "./enums";
import { author } from "./people";
import { driver, team } from "./people";
import { race } from "./core";

export const image = pgTable("image", {
  id: varchar("id", { length: 36 }).primaryKey(),
  r2Key: text("r2_key").notNull(),                              // R2 object key
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  format: varchar("format", { length: 8 }).notNull(),           // webp|avif|jpg|png
  alt: text("alt").notNull(),                                   // a11y mandatory
  credit: text("credit"),                                       // photo credit
  blurhash: varchar("blurhash", { length: 36 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  r2KeyUq: uniqueIndex("image_r2_uq").on(t.r2Key),
}));

export const tag = pgTable("tag", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull(),
  label: text("label").notNull(),
  group: varchar("group", { length: 32 }),                      // topic|series|workflow
}, (t) => ({
  slugUq: uniqueIndex("tag_slug_uq").on(t.slug),
}));

export const article = pgTable("article", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 200 }).notNull(),
  title: text("title").notNull(),
  dek: text("dek"),                                             // standfirst
  body: jsonb("body").notNull(),                                // portable text / tiptap JSON
  status: articleStatusEnum("status").default("draft").notNull(),
  authorId: varchar("author_id", { length: 36 }).notNull().references(() => author.id),
  heroImageId: varchar("hero_image_id", { length: 36 }).references(() => image.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  readingTimeMin: integer("reading_time_min"),
  isPremium: boolean("is_premium").default(false).notNull(),    // Apex+ gate
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  slugUq: uniqueIndex("article_slug_uq").on(t.slug),
  statusPublishedIdx: index("article_status_pub_idx").on(t.status, t.publishedAt),
  authorIdx: index("article_author_idx").on(t.authorId),
}));

export const articleTag = pgTable("article_tag", {
  articleId: varchar("article_id", { length: 36 }).notNull().references(() => article.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id", { length: 36 }).notNull().references(() => tag.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.articleId, t.tagId] }),
  tagIdx: index("article_tag_tag_idx").on(t.tagId),
}));

export const articleDriver = pgTable("article_driver", {
  articleId: varchar("article_id", { length: 36 }).notNull().references(() => article.id, { onDelete: "cascade" }),
  driverId: varchar("driver_id", { length: 64 }).notNull().references(() => driver.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.articleId, t.driverId] }),
  driverIdx: index("article_driver_driver_idx").on(t.driverId),
}));

export const articleTeam = pgTable("article_team", {
  articleId: varchar("article_id", { length: 36 }).notNull().references(() => article.id, { onDelete: "cascade" }),
  teamId: varchar("team_id", { length: 64 }).notNull().references(() => team.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.articleId, t.teamId] }),
  teamIdx: index("article_team_team_idx").on(t.teamId),
}));

export const articleRace = pgTable("article_race", {
  articleId: varchar("article_id", { length: 36 }).notNull().references(() => article.id, { onDelete: "cascade" }),
  raceId: varchar("race_id", { length: 32 }).notNull().references(() => race.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.articleId, t.raceId] }),
  raceIdx: index("article_race_race_idx").on(t.raceId),
}));

export const video = pgTable("video", {
  id: varchar("id", { length: 36 }).primaryKey(),
  source: videoSourceEnum("source").notNull(),
  externalId: text("external_id").notNull(),                    // youtube videoId
  channelId: text("channel_id"),
  channelName: text("channel_name"),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  durationSec: integer("duration_sec"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  curated: boolean("curated").default(false).notNull(),         // editorially approved
  embedAllowed: boolean("embed_allowed").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  sourceExtUq: uniqueIndex("video_source_ext_uq").on(t.source, t.externalId),
  publishedIdx: index("video_published_idx").on(t.publishedAt),
}));

export const embedRecord = pgTable("embed_record", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerType: varchar("owner_type", { length: 16 }).notNull(),   // "article" | "video"
  ownerId: varchar("owner_id", { length: 36 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),      // youtube|twitter|instagram|tiktok
  url: text("url").notNull(),
  html: text("html"),                                           // oEmbed cache
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  ownerIdx: index("embed_owner_idx").on(t.ownerType, t.ownerId),
}));
```

### 1.9 Navigation & partners

```ts
// packages/db/src/schema/navigation.ts
import { pgTable, integer, text, varchar, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const navGroup = pgTable("nav_group", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull(),
  label: text("label").notNull(),
  order: integer("order").default(0).notNull(),
}, (t) => ({
  slugUq: uniqueIndex("nav_group_slug_uq").on(t.slug),
}));

export const navLink = pgTable("nav_link", {
  id: varchar("id", { length: 36 }).primaryKey(),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => navGroup.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  href: text("href").notNull(),
  order: integer("order").default(0).notNull(),
  description: text("description"),
  iconKey: varchar("icon_key", { length: 64 }),
}, (t) => ({
  groupIdx: index("nav_link_group_idx").on(t.groupId, t.order),
}));

export const partner = pgTable("partner", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  logoImageId: varchar("logo_image_id", { length: 36 }),
  tier: varchar("tier", { length: 16 }),                        // diamond|gold|silver|partner
  active: integer("active").default(1).notNull(),
}, (t) => ({
  slugUq: uniqueIndex("partner_slug_uq").on(t.slug),
}));
```

### 1.10 Identity (user, follow, saved, notification_pref)

```ts
// packages/db/src/schema/identity.ts
import {
  pgTable, integer, text, varchar, timestamp, uniqueIndex, index, jsonb, boolean,
  primaryKey, uuid,
} from "drizzle-orm/pg-core";
import { followTargetEnum } from "./enums";

// `user` shadows auth.users in Supabase via 1:1 PK = auth.uid()
export const user = pgTable("user", {
  id: uuid("id").primaryKey(),                                  // = auth.users.id
  handle: varchar("handle", { length: 32 }),
  displayName: text("display_name"),
  avatarImageId: varchar("avatar_image_id", { length: 36 }),
  isApexPlus: boolean("is_apex_plus").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => ({
  handleUq: uniqueIndex("user_handle_uq").on(t.handle),
}));

export const follow = pgTable("follow", {
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  targetType: followTargetEnum("target_type").notNull(),
  targetId: varchar("target_id", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.targetType, t.targetId] }),
  targetIdx: index("follow_target_idx").on(t.targetType, t.targetId),
}));

export const saved = pgTable("saved", {
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  ownerType: varchar("owner_type", { length: 16 }).notNull(),   // article|video
  ownerId: varchar("owner_id", { length: 36 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.ownerType, t.ownerId] }),
}));

export const notificationPref = pgTable("notification_pref", {
  userId: uuid("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  emailRaceReminders: boolean("email_race_reminders").default(true).notNull(),
  emailWeeklyDigest: boolean("email_weekly_digest").default(true).notNull(),
  pushBreaking: boolean("push_breaking").default(false).notNull(),
  pushFollowedDriver: boolean("push_followed_driver").default(false).notNull(),
  marketing: boolean("marketing").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 1.11 Ops (event_log, ingestion_run)

```ts
// packages/db/src/schema/ops.ts
import {
  pgTable, integer, text, varchar, timestamp, jsonb, index, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { ingestionStatusEnum } from "./enums";

export const eventLog = pgTable("event_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  userId: uuid("user_id"),                                      // nullable for anon
  sessionId: varchar("session_id", { length: 64 }),
  type: varchar("type", { length: 64 }).notNull(),              // "page_view" | "follow_driver" | ...
  surface: varchar("surface", { length: 64 }),
  refUrl: text("ref_url"),
  payload: jsonb("payload"),
}, (t) => ({
  occurredIdx: index("event_log_occurred_idx").on(t.occurredAt),
  typeIdx: index("event_log_type_idx").on(t.type),
  userIdx: index("event_log_user_idx").on(t.userId),
}));

export const ingestionRun = pgTable("ingestion_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  worker: varchar("worker", { length: 64 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: ingestionStatusEnum("status").default("running").notNull(),
  recordsRead: integer("records_read").default(0).notNull(),
  recordsUpserted: integer("records_upserted").default(0).notNull(),
  errors: jsonb("errors"),
  cursor: text("cursor"),
}, (t) => ({
  workerIdx: index("ingestion_run_worker_idx").on(t.worker, t.startedAt),
  statusIdx: index("ingestion_run_status_idx").on(t.status),
}));
```

### 1.12 Materialized views + GIN

Run as a hand-rolled SQL migration `0005_ops_and_views.sql` (drizzle-kit doesn't yet model mat views well):

```sql
-- Latest standings per season (driver)
CREATE MATERIALIZED VIEW mv_standings_driver_latest AS
SELECT DISTINCT ON (season, driver_id)
  season, driver_id, team_id, position, points, wins, round, after_race_id
FROM standings_driver
ORDER BY season, driver_id, round DESC;

CREATE UNIQUE INDEX mv_std_drv_latest_uq
  ON mv_standings_driver_latest (season, driver_id);

-- Same for teams
CREATE MATERIALIZED VIEW mv_standings_team_latest AS
SELECT DISTINCT ON (season, team_id)
  season, team_id, position, points, wins, round, after_race_id
FROM standings_team
ORDER BY season, team_id, round DESC;

CREATE UNIQUE INDEX mv_std_tm_latest_uq
  ON mv_standings_team_latest (season, team_id);

-- Driver career totals (pre-aggregated for /drivers/:slug headline)
CREATE MATERIALIZED VIEW mv_driver_career AS
SELECT
  d.id AS driver_id,
  COUNT(r.id) FILTER (WHERE r.classified = 1) AS races,
  COUNT(r.id) FILTER (WHERE r.finish_pos = 1) AS wins,
  COUNT(r.id) FILTER (WHERE r.finish_pos BETWEEN 1 AND 3) AS podiums,
  COUNT(q.id) FILTER (WHERE q.position = 1) AS poles,
  COUNT(r.id) FILTER (WHERE r.fastest_lap_rank = 1) AS fastest_laps,
  COALESCE(SUM(r.points_awarded), 0) AS points
FROM driver d
LEFT JOIN result r ON r.driver_id = d.id
LEFT JOIN qualifying q ON q.driver_id = d.id
GROUP BY d.id;

CREATE UNIQUE INDEX mv_driver_career_uq ON mv_driver_career (driver_id);

-- Full-text search on articles
ALTER TABLE article
  ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(dek, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(seo_description, '')), 'C')
  ) STORED;

CREATE INDEX article_tsv_gin ON article USING GIN (tsv);

-- Trigram index on driver family_name for autocomplete fallback
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX driver_family_name_trgm ON driver USING GIN (family_name gin_trgm_ops);
CREATE INDEX team_name_trgm ON team USING GIN (name gin_trgm_ops);

-- Refresh helper
CREATE OR REPLACE FUNCTION refresh_apex_mvs() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_standings_driver_latest;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_standings_team_latest;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_driver_career;
END;
$$;
```

Trigger.dev calls `select refresh_apex_mvs();` at the end of each ingest worker.

### 1.13 Drizzle config + migration runner

```ts
// packages/db/drizzle.config.ts
import type { Config } from "drizzle-kit";
import { config } from "dotenv";
config({ path: "../../.env" });

export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
} satisfies Config;
```

```ts
// packages/db/src/client.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, {
  max: 10,
  prepare: false,        // Supabase pgbouncer transaction mode
  idle_timeout: 20,
});
export const db = drizzle(client, { schema, logger: process.env.DRIZZLE_LOG === "1" });
export type DB = typeof db;
```

Migration 0001 is the union of enums + core + people + standings + results (`drizzle-kit generate`); 0005 adds the SQL above.

---

## 2. INGEST WORKERS

All workers live in `apps/workers/` and run on **Trigger.dev v3** (Hobby tier) except `ingest-openf1-live` which runs on **Fly.io** as a long-running process.

### 2.1 `ingest-jolpica-historical` — one-shot 1950→present

Jolpica is a drop-in for Ergast. Rate limit: **4 req/sec, 500/hr** (hard cap). Strategy: token bucket + parallel by-year batches with explicit pacing.

```ts
// apps/workers/src/jolpica/historical.ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { db } from "@apex/db";
import {
  season, circuit, race, session, driver, team, driverTeamHistory,
  result, qualifying, sprintResult, pitStop, lap, standingsDriver, standingsTeam,
  ingestionRun,
} from "@apex/db/schema";
import { eq, sql } from "drizzle-orm";
import { jolpicaFetch, TokenBucket } from "./client";

const bucket = new TokenBucket({ ratePerSec: 3.5, burst: 4 });   // stay under 4/s

export const ingestJolpicaHistorical = task({
  id: "ingest-jolpica-historical",
  maxDuration: 6 * 60 * 60,                                       // 6h budget
  run: async ({ fromYear = 1950, toYear = 2026 }: { fromYear?: number; toYear?: number }) => {
    const run = await db.insert(ingestionRun).values({ worker: "jolpica-historical" }).returning();
    const runId = run[0].id;

    try {
      for (let year = fromYear; year <= toYear; year++) {
        logger.info("year start", { year });
        await db.insert(season).values({ year }).onConflictDoNothing();

        const schedule = await bucket.use(() => jolpicaFetch(`/${year}.json`));
        const races = schedule.MRData.RaceTable.Races as JolpicaRace[];

        for (const r of races) {
          await upsertCircuit(r.Circuit);
          const raceId = `${year}-${String(r.round).padStart(2, "0")}`;
          await db.insert(race).values({
            id: raceId,
            season: year,
            round: Number(r.round),
            circuitId: r.Circuit.circuitId,
            name: r.raceName,
            startsAt: new Date(`${r.date}T${r.time ?? "13:00:00Z"}`),
            wikipediaUrl: r.url,
          }).onConflictDoUpdate({
            target: race.id,
            set: { startsAt: sql`excluded.starts_at`, name: sql`excluded.name`, updatedAt: sql`now()` },
          });

          // Results
          const resJson = await bucket.use(() => jolpicaFetch(`/${year}/${r.round}/results.json?limit=100`));
          await upsertResults(raceId, resJson.MRData.RaceTable.Races?.[0]?.Results ?? []);

          // Qualifying
          const qJson = await bucket.use(() => jolpicaFetch(`/${year}/${r.round}/qualifying.json?limit=100`));
          await upsertQualifying(raceId, qJson.MRData.RaceTable.Races?.[0]?.QualifyingResults ?? []);

          // Sprint (2021+ only)
          if (year >= 2021) {
            const sJson = await bucket.use(() => jolpicaFetch(`/${year}/${r.round}/sprint.json?limit=100`));
            const sprints = sJson.MRData.RaceTable.Races?.[0]?.SprintResults ?? [];
            if (sprints.length) await upsertSprintResults(raceId, sprints);
          }

          // Pit stops (2011+)
          if (year >= 2011) {
            const pJson = await bucket.use(() => jolpicaFetch(`/${year}/${r.round}/pitstops.json?limit=500`));
            await upsertPitStops(raceId, pJson.MRData.RaceTable.Races?.[0]?.PitStops ?? []);
          }

          // Laps (1996+) — paginated, 500 rows/page
          if (year >= 1996) {
            let offset = 0; let totalLaps = 0;
            while (true) {
              const lJson = await bucket.use(() =>
                jolpicaFetch(`/${year}/${r.round}/laps.json?limit=500&offset=${offset}`)
              );
              const lapsRows = lJson.MRData.RaceTable.Races?.[0]?.Laps ?? [];
              if (!lapsRows.length) break;
              await upsertLaps(raceId, lapsRows);
              totalLaps += lapsRows.length;
              offset += 500;
              if (offset >= Number(lJson.MRData.total)) break;
            }
            logger.info("laps", { raceId, totalLaps });
          }

          // Standings after this round
          const sdJson = await bucket.use(() => jolpicaFetch(`/${year}/${r.round}/driverStandings.json`));
          const stJson = await bucket.use(() => jolpicaFetch(`/${year}/${r.round}/constructorStandings.json`));
          await upsertStandings(year, Number(r.round), raceId, sdJson, stJson);
        }

        await db.execute(sql`SELECT refresh_apex_mvs()`);
      }

      await db.update(ingestionRun)
        .set({ status: "succeeded", finishedAt: new Date() })
        .where(eq(ingestionRun.id, runId));
    } catch (e) {
      await db.update(ingestionRun)
        .set({ status: "failed", finishedAt: new Date(), errors: { message: String(e) } })
        .where(eq(ingestionRun.id, runId));
      throw e;
    }
  },
});
```

```ts
// apps/workers/src/jolpica/client.ts
const BASE = "https://api.jolpi.ca/ergast/f1";

export class TokenBucket {
  private tokens: number; private last = Date.now();
  constructor(private opts: { ratePerSec: number; burst: number }) {
    this.tokens = opts.burst;
  }
  async use<T>(fn: () => Promise<T>): Promise<T> {
    while (true) {
      const now = Date.now();
      this.tokens = Math.min(this.opts.burst, this.tokens + ((now - this.last) / 1000) * this.opts.ratePerSec);
      this.last = now;
      if (this.tokens >= 1) { this.tokens -= 1; return fn(); }
      await new Promise(r => setTimeout(r, 250));
    }
  }
}

export async function jolpicaFetch(path: string, attempt = 0): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": "ApexF1Bot/0.1 (contact: shauryapunj404@gmail.com)" },
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? "8");
    if (attempt > 4) throw new Error("Jolpica 429 exhausted");
    await new Promise(r => setTimeout(r, retry * 1000));
    return jolpicaFetch(path, attempt + 1);
  }
  if (!res.ok) throw new Error(`jolpica ${res.status} ${path}`);
  return res.json();
}
```

**Upsert pattern** (idempotent — re-runs are safe):

```ts
async function upsertResults(raceId: string, rows: JolpicaResult[]) {
  if (!rows.length) return;
  await db.insert(result).values(rows.map(row => ({
    id: `${raceId}-${row.Driver.driverId}`,
    raceId,
    driverId: row.Driver.driverId,
    teamId: row.Constructor.constructorId,
    gridPos: Number(row.grid),
    finishPos: row.position ? Number(row.position) : null,
    classified: row.positionText === "R" || row.positionText === "D" ? 0 : 1,
    status: row.status,
    pointsAwarded: row.points,
    fastestLapMs: row.FastestLap ? parseClock(row.FastestLap.Time.time) : null,
    fastestLapRank: row.FastestLap?.rank ? Number(row.FastestLap.rank) : null,
    totalRaceTimeMs: row.Time?.millis ? Number(row.Time.millis) : null,
    laps: row.laps ? Number(row.laps) : null,
  }))).onConflictDoUpdate({
    target: result.id,
    set: {
      finishPos: sql`excluded.finish_pos`,
      status: sql`excluded.status`,
      pointsAwarded: sql`excluded.points_awarded`,
    },
  });
}
```

**Runtime math**: ~1100 races × ~8 API hits + laps pagination = ~13k requests at 3.5 req/s = **~62 minutes of API time**. With DB writes and back-off jitter, realistic wall clock **3.5–5h**. Run from a Fly.io one-shot machine (Trigger.dev v3 max single-run is 6h on paid; on Hobby tier we split by decade and chain).

### 2.2 `ingest-jolpica-nightly`

```ts
// apps/workers/src/jolpica/nightly.ts
import { schedules } from "@trigger.dev/sdk/v3";
import { ingestJolpicaHistorical } from "./historical";

export const nightlyJolpica = schedules.task({
  id: "ingest-jolpica-nightly",
  cron: "0 3 * * *",                                              // 03:00 UTC
  run: async () => {
    const year = new Date().getUTCFullYear();
    await ingestJolpicaHistorical.triggerAndWait({ fromYear: year, toYear: year });
  },
});
```

Single-year delta = ~24 races × ~7 hits = 168 requests = **under a minute** wall.

### 2.3 `ingest-openf1-live` — race-weekend live worker (Fly.io)

OpenF1 is REST polling with **no rate limit documented but ~5 req/s soft**. We poll race weekends only (Fri–Sun + Thu evening for some events).

```ts
// apps/workers/src/openf1/live.ts — runs as a Fly.io process, NOT Trigger.dev
import { Redis } from "@upstash/redis";
import { db } from "@apex/db";
import { session } from "@apex/db/schema";
import { eq } from "drizzle-orm";

const redis = Redis.fromEnv();

interface Poller { sessionKey: number; abort: AbortController; }
const active = new Map<number, Poller>();

async function discoverActiveSessions() {
  // OpenF1 sessions for the current weekend
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 60_000).toISOString();
  const to = new Date(now.getTime() + 4 * 60 * 60_000).toISOString();
  const r = await fetch(`https://api.openf1.org/v1/sessions?date_start>=${from}&date_end<=${to}`);
  const sessions: Array<{ session_key: number; session_name: string; meeting_key: number }> = await r.json();
  return sessions;
}

async function pollSession(sessionKey: number, signal: AbortSignal) {
  const tower = await fetch(`https://api.openf1.org/v1/intervals?session_key=${sessionKey}`, { signal });
  const rc    = await fetch(`https://api.openf1.org/v1/race_control?session_key=${sessionKey}`, { signal });
  const pos   = await fetch(`https://api.openf1.org/v1/position?session_key=${sessionKey}`, { signal });
  const wx    = await fetch(`https://api.openf1.org/v1/weather?session_key=${sessionKey}`, { signal });

  if (![tower, rc, pos, wx].every(r => r.ok)) return;
  const [towerJ, rcJ, posJ, wxJ] = await Promise.all([tower.json(), rc.json(), pos.json(), wx.json()]);

  // Compact + write snapshot
  const towerSnap = compactTower(towerJ, posJ);                   // top-20 ordered, with intervals + gap-to-leader
  await redis.pipeline()
    .set(`lt:${sessionKey}:tower`, JSON.stringify(towerSnap), { ex: 10 })
    .set(`lt:${sessionKey}:positions`, JSON.stringify(posJ.slice(-20)), { ex: 10 })
    .set(`lt:${sessionKey}:rc`, JSON.stringify(rcJ.slice(-50)), { ex: 30 })
    .set(`lt:${sessionKey}:weather`, JSON.stringify(wxJ.at(-1) ?? null), { ex: 30 })
    .set(`lt:${sessionKey}:updated_at`, Date.now(), { ex: 10 })
    .exec();
}

async function loop() {
  for (;;) {
    const sessions = await discoverActiveSessions();
    const wantedKeys = new Set(sessions.map(s => s.session_key));

    // Spin up missing
    for (const s of sessions) {
      if (!active.has(s.session_key)) {
        const ctrl = new AbortController();
        active.set(s.session_key, { sessionKey: s.session_key, abort: ctrl });
        runForever(s.session_key, ctrl.signal);
        // ensure DB session row knows the openf1 key
        await db.update(session)
          .set({ openf1SessionKey: s.session_key })
          .where(eq(session.openf1SessionKey, s.session_key));
      }
    }
    // Stop poller for finished sessions
    for (const [k, p] of active) {
      if (!wantedKeys.has(k)) { p.abort.abort(); active.delete(k); }
    }
    await sleep(30_000);                                          // re-discover every 30s
  }
}

async function runForever(key: number, signal: AbortSignal) {
  while (!signal.aborted) {
    try { await pollSession(key, signal); } catch (e) { console.error("poll err", key, e); }
    await sleep(1500);                                            // 1.5s base — matches PID §11 1–3s budget
  }
}

loop().catch(e => { console.error(e); process.exit(1); });
```

Fly.io setup:

```toml
# apps/workers/fly.openf1.toml
app = "apex-openf1-live"
primary_region = "fra"
[build]
  dockerfile = "Dockerfile.openf1"

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"

[env]
  NODE_ENV = "production"
```

Single shared-cpu-1x machine. Costs ~$2/month if always-on, or scale-to-zero on race-week schedule.

### 2.4 `ingest-youtube` — curated channels nightly

```ts
// apps/workers/src/youtube/nightly.ts
import { schedules, logger } from "@trigger.dev/sdk/v3";
import { db } from "@apex/db";
import { video } from "@apex/db/schema";
import { sql } from "drizzle-orm";

const CURATED_CHANNELS = {
  "UCB_qr75-ydFVKSF9Dmo6izg": "Formula 1",
  "UC8L4Iz2vQjqRu3qXOQTk6XQ": "Chain Bear",
  "UCfPnD16xZKEEPpFb04T4f5g": "WTF1",
  "UCwRKt_raV3N5KZgxcFyC1vw": "Tommo",
  "UCB_qr75-ydFVKSF9Dmo6izg-bttg": "F1 Beyond the Grid",        // illustrative; channels confirmed at runtime
  "UCFSHkqYV2NlbY9LZl3i4w3w": "Driver61",
  "UCwK4f1pXkF-V9vJ09rN0n_w": "P1 with Matt Gallagher",
} as const;

const API = "https://www.googleapis.com/youtube/v3";

export const nightlyYoutube = schedules.task({
  id: "ingest-youtube",
  cron: "30 4 * * *",                                             // 04:30 UTC
  run: async () => {
    const key = process.env.YOUTUBE_API_KEY!;
    for (const [channelId, channelName] of Object.entries(CURATED_CHANNELS)) {
      // 1 quota — channels.list
      const ch = await fetch(`${API}/channels?part=contentDetails&id=${channelId}&key=${key}`).then(r => r.json());
      const uploadsPlaylist = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylist) continue;

      // 1 quota — playlistItems.list (last 50)
      const pl = await fetch(
        `${API}/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylist}&key=${key}`,
      ).then(r => r.json());

      const ids = pl.items.map((it: any) => it.snippet.resourceId.videoId).join(",");
      // 1 quota — videos.list contentDetails for durations
      const meta = await fetch(`${API}/videos?part=contentDetails,snippet&id=${ids}&key=${key}`).then(r => r.json());

      const rows = meta.items.map((v: any) => ({
        id: cryptoUuid(),
        source: "youtube" as const,
        externalId: v.id,
        channelId,
        channelName,
        title: v.snippet.title,
        description: v.snippet.description?.slice(0, 4000) ?? null,
        thumbnailUrl: v.snippet.thumbnails?.maxres?.url ?? v.snippet.thumbnails?.high?.url ?? null,
        durationSec: iso8601ToSec(v.contentDetails.duration),
        publishedAt: new Date(v.snippet.publishedAt),
        curated: true,
        embedAllowed: true,
      }));

      if (rows.length) {
        await db.insert(video).values(rows).onConflictDoUpdate({
          target: [video.source, video.externalId],
          set: { title: sql`excluded.title`, thumbnailUrl: sql`excluded.thumbnail_url` },
        });
      }
      logger.info("youtube channel done", { channelName, rows: rows.length });
    }
  },
});
```

**Quota math**: YouTube Data API free = **10,000 units/day**. Per channel: `channels.list` (1) + `playlistItems.list` (1) + `videos.list` (1) = **3 units**. 10 channels = **30 units/day**. We have ~333× headroom — leaves room for ad-hoc search and admin previews.

### 2.5 `ingest-wikidata` — driver/team metadata seed

One-shot SPARQL pull. We use Wikidata's public SPARQL endpoint with `User-Agent` header (required) and 60s timeout.

```ts
// apps/workers/src/wikidata/seed.ts
const SPARQL = "https://query.wikidata.org/sparql";

const DRIVER_QUERY = `
SELECT ?driver ?driverLabel ?dob ?nationalityLabel ?image ?wiki WHERE {
  ?driver wdt:P106 wd:Q10841764 .                                    # occupation: F1 driver
  OPTIONAL { ?driver wdt:P569 ?dob }
  OPTIONAL { ?driver wdt:P27  ?nationality }
  OPTIONAL { ?driver wdt:P18  ?image }
  OPTIONAL { ?wiki schema:about ?driver ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

export async function seedDriversFromWikidata() {
  const r = await fetch(`${SPARQL}?query=${encodeURIComponent(DRIVER_QUERY)}&format=json`, {
    headers: { "User-Agent": "ApexF1Bot/0.1 (contact: shauryapunj404@gmail.com)", "Accept": "application/sparql-results+json" },
  });
  const json = await r.json();
  // Match by name + dob against driver table; update wikidata_qid, wikipedia_url
  for (const row of json.results.bindings) {
    const qid = row.driver.value.split("/").pop();
    const wiki = row.wiki?.value ?? null;
    const dob = row.dob?.value?.slice(0,10) ?? null;
    const name = row.driverLabel.value;
    await matchAndUpdateDriver(name, dob, qid, wiki);
  }
}
```

Run once, idempotent. Re-run quarterly for new drivers.

### 2.6 `ingest-weather` — hourly during race week

```ts
// apps/workers/src/weather/race-week.ts
import { schedules } from "@trigger.dev/sdk/v3";
import { db } from "@apex/db";
import { race, circuit } from "@apex/db/schema";
import { Redis } from "@upstash/redis";
import { gte, lte, and, eq } from "drizzle-orm";

const redis = Redis.fromEnv();

export const hourlyWeather = schedules.task({
  id: "ingest-weather",
  cron: "0 * * * *",
  run: async () => {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 86400_000);
    const upcoming = await db.select().from(race)
      .innerJoin(circuit, eq(race.circuitId, circuit.id))
      .where(and(gte(race.startsAt, now), lte(race.startsAt, in7d)));

    for (const row of upcoming) {
      const c = row.circuit;
      if (!c.lat || !c.lng) continue;
      const w = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${c.lat}&lon=${c.lng}&exclude=minutely&units=metric&appid=${process.env.OWM_API_KEY}`,
      ).then(r => r.json());
      await redis.set(`wx:${row.race.id}`, JSON.stringify(w), { ex: 3600 });
    }
  },
});
```

OWM free tier = 1000 calls/day, One Call 3.0 free 1000/day. With ≤4 upcoming races at any time × 24 = **96 calls/day**. Comfortable.

### 2.7 `revalidate-paths` — CMS publish hook

```ts
// apps/web/app/api/internal/revalidate/route.ts
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const secret = req.headers.get("x-apex-revalidate");
  if (secret !== process.env.REVALIDATE_SECRET) return new NextResponse("nope", { status: 401 });
  const { paths = [], tags = [] } = await req.json();
  for (const p of paths) revalidatePath(p);
  for (const t of tags) revalidateTag(t);
  return NextResponse.json({ ok: true, paths, tags });
}
```

Trigger.dev tasks `POST` to this after ingest with `paths: ["/", "/standings", "/race/2026-08", `/driver/${slug}`]`.

---

## 3. REDIS CACHE STRATEGY

Upstash Redis (REST + native). Single EU region (Frankfurt) to minimise round-trip vs Vercel `fra1`.

### 3.1 Namespace

| Prefix | Surface | TTL | Notes |
|--------|---------|-----|-------|
| `lt:{sessionKey}:tower` | Live timing tower | 10s | overwritten by poller |
| `lt:{sessionKey}:positions` | Position history | 10s | last 20 records |
| `lt:{sessionKey}:rc` | Race control msgs | 30s | last 50 |
| `lt:{sessionKey}:weather` | Live weather | 30s | latest only |
| `wx:{raceId}` | Race-week weather | 1h | OWM cached |
| `standings:{season}:driver` | Driver standings | 5m (race week 60s) | jsonified |
| `standings:{season}:team` | Team standings | 5m (race week 60s) | jsonified |
| `schedule:{season}` | Full season schedule | 1h race week / 24h otherwise | |
| `next-race` | Next race summary | 5m | computed |
| `home:hero` | Homepage hero data | 60s | |
| `home:strip` | Home news strip | 60s | |
| `driver:{slug}:hero` | Driver page hero | 1h | |
| `team:{slug}:hero` | Team page hero | 1h | |
| `race:{raceId}:summary` | Race detail page | 24h post-race | |
| `nav:tree` | Nav tree from DB | 5m | mostly static |
| `idem:{worker}:{key}` | Ingestion idempotency | 24h | prevents double-run |
| `lock:{name}` | Distributed lock | 30s | SET NX EX |

### 3.2 Wrapper

```ts
// packages/cache/src/index.ts
import { Redis } from "@upstash/redis";
const r = Redis.fromEnv();

export async function cached<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>,
  opts: { swr?: number } = {},
): Promise<T> {
  const hit = await r.get<{ v: T; exp: number }>(key);
  const now = Math.floor(Date.now() / 1000);
  if (hit && hit.exp > now) return hit.v;

  // Stampede prevention — single-flight via SET NX EX
  const lockKey = `lock:${key}`;
  const got = await r.set(lockKey, "1", { nx: true, ex: 15 });
  if (got !== "OK") {
    // someone else is computing; if we had a stale value, serve it
    if (hit) return hit.v;
    // else back off briefly and re-read
    await new Promise(res => setTimeout(res, 150));
    const refresh = await r.get<{ v: T; exp: number }>(key);
    if (refresh) return refresh.v;
  }

  try {
    const v = await loader();
    await r.set(key, { v, exp: now + ttlSec + (opts.swr ?? 30) }, { ex: ttlSec + (opts.swr ?? 30) });
    return v;
  } finally {
    await r.del(lockKey);
  }
}

export const cache = r;
```

`cached()` is the only entry-point in app code. Stampede-safe: any concurrent N callers fan in to a single loader.

### 3.3 Invalidation pattern

- **CMS publish** → `revalidate-paths` route → Next.js. Redis is not touched directly (its TTL is short).
- **Live poller** writes its own keys; no invalidation.
- **Ingest worker finish** → explicit `DEL standings:{season}:*` via SCAN + pipeline.

---

## 4. ISR + EDGE STRATEGY

Per-route table:

| Route | `revalidate` | `dynamicParams` | Notes |
|-------|--------------|-----------------|-------|
| `/` | `60` (race-week) / `300` (otherwise) | n/a | server-cached strip + hero |
| `/schedule` | `60` race-week / `3600` otherwise | n/a | gates on `race.status` |
| `/standings/driver` | `60` race-week / `1800` otherwise | n/a | reads mat view |
| `/standings/team` | `60` race-week / `1800` otherwise | n/a | |
| `/race/[raceId]` | `60` while live / `86400` post-race | `true` | `generateStaticParams` returns past 5 races |
| `/driver/[slug]` | `3600` | `true` | top 30 prebuilt |
| `/team/[slug]` | `3600` | `true` | all 10 prebuilt |
| `/articles/[slug]` | `false` + tag-based | `true` | `revalidateTag('article:<id>')` on publish |
| `/live/[sessionKey]` | force-dynamic | `true` | reads Redis snapshot only |
| `/videos` | `300` | n/a | nightly ingest drives revalidate |
| `/search` | force-dynamic | n/a | Meili API |

### 4.1 Dynamic revalidate

```tsx
// apps/web/app/schedule/page.tsx
export const revalidate = 3600;          // default
import { unstable_cache } from "next/cache";
import { isRaceWeek } from "@/lib/calendar";

const getSchedule = unstable_cache(
  async (season: number) => fetchScheduleFromDb(season),
  ["schedule"],
  { tags: ["schedule"], revalidate: isRaceWeek() ? 60 : 3600 },
);
```

### 4.2 generateStaticParams

```tsx
// apps/web/app/driver/[slug]/page.tsx
export async function generateStaticParams() {
  const top = await db.select({ id: driver.id }).from(driver).orderBy(/* by recent activity */).limit(30);
  return top.map(d => ({ slug: d.id }));
}
export const dynamicParams = true;
export const revalidate = 3600;
```

### 4.3 Article tag-based revalidation

CMS publishes → API route `revalidateTag('article:abc')`. Page reads via `unstable_cache(fn, key, { tags: ['article:abc'] })`.

### 4.4 Edge vs Node runtime

- Default: Node runtime — Drizzle/`postgres` is not edge-safe.
- Edge: `/api/live/snapshot`, `/api/og/[type]/[id]` (OG image), `/api/health`.
- Middleware: edge for geolocation + cookie consent gate.

---

## 5. LIVE TIMING PIPELINE

### 5.1 Architecture

```
                 ┌──────────────────────┐
                 │   OpenF1 REST API    │
                 └──────────┬───────────┘
                            │ 1.5s poll
                            ▼
              ┌──────────────────────────────┐
              │ Fly.io: openf1-live worker   │
              │ Node 22, single shared-cpu   │
              │  - discovers sessions        │
              │  - parallel pollers          │
              │  - compacts payloads         │
              └──────────┬───────────────────┘
                         │ pipeline write
                         ▼
              ┌──────────────────────────────┐
              │ Upstash Redis (fra1)         │
              │   lt:{key}:tower             │
              │   lt:{key}:positions         │
              │   lt:{key}:rc                │
              │   lt:{key}:weather           │
              └──────────┬───────────────────┘
                         │ pub/sub on
                         │ channel `lt:{key}`
                         ▼
              ┌──────────────────────────────┐
              │ Fly.io: apex-live-ws         │
              │   ws lib (Node 22)           │
              │   - subscribes Redis pub/sub │
              │   - fanouts to all clients   │
              │   wss://live.apex.tld        │
              └──────────┬───────────────────┘
                         │ WSS
                         ▼
              ┌──────────────────────────────┐
              │ Browser client               │
              │   useLiveSession(sessionKey) │
              │   fallback poll /api/live/snapshot every 5s │
              └──────────────────────────────┘
```

### 5.2 WS server choice

**`ws` (npm `ws@^8`)** — not Socket.IO. We control the protocol, latency is tighter, no polyfill weight. Bun WS rejected because we already pay for Node tooling and `ioredis`/`postgres` are battle-tested on Node.

```ts
// apps/live-ws/src/server.ts
import { WebSocketServer } from "ws";
import Redis from "ioredis";

const sub = new Redis(process.env.REDIS_PUBSUB_URL!);            // separate plain TCP Redis on Fly for pub/sub
const wss = new WebSocketServer({ port: Number(process.env.PORT ?? 8080), perMessageDeflate: true });

interface Client { ws: import("ws").WebSocket; sessionKey: number; lastPong: number; }
const rooms = new Map<number, Set<Client>>();

wss.on("connection", (ws, req) => {
  const url = new URL(req.url!, "http://x");
  const sessionKey = Number(url.searchParams.get("s"));
  if (!Number.isFinite(sessionKey)) { ws.close(4000, "no session"); return; }

  const client: Client = { ws, sessionKey, lastPong: Date.now() };
  if (!rooms.has(sessionKey)) {
    rooms.set(sessionKey, new Set());
    sub.subscribe(`lt:${sessionKey}`);
  }
  rooms.get(sessionKey)!.add(client);

  ws.on("pong", () => client.lastPong = Date.now());
  ws.on("close", () => {
    const room = rooms.get(sessionKey)!;
    room.delete(client);
    if (room.size === 0) { rooms.delete(sessionKey); sub.unsubscribe(`lt:${sessionKey}`); }
  });
});

sub.on("message", (channel, payload) => {
  const sessionKey = Number(channel.split(":")[1]);
  const room = rooms.get(sessionKey);
  if (!room) return;
  for (const c of room) {
    if (c.ws.readyState !== c.ws.OPEN) continue;
    if (c.ws.bufferedAmount > 1_000_000) continue;              // backpressure: skip
    c.ws.send(payload);
  }
});

// Heartbeat — drop dead clients every 30s
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const room of rooms.values()) {
    for (const c of room) {
      if (c.lastPong < cutoff) { c.ws.terminate(); continue; }
      c.ws.ping();
    }
  }
}, 30_000);
```

The OpenF1 poller does a `PUBLISH lt:{sessionKey} <payload>` after every write so the WS server fans out in <50ms.

### 5.3 Client hook

```tsx
// apps/web/lib/live/useLiveSession.ts
"use client";
import { useEffect, useRef, useState } from "react";

export function useLiveSession(sessionKey: number) {
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const attempt = useRef(0);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const startPoll = () => {
      if (pollRef.current) return;
      pollRef.current = window.setInterval(async () => {
        const r = await fetch(`/api/live/snapshot?s=${sessionKey}`);
        if (r.ok) setSnap(await r.json());
      }, 5000);
    };
    const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_LIVE_WSS}?s=${sessionKey}`);
      wsRef.current = ws;
      ws.onopen  = () => { attempt.current = 0; stopPoll(); };
      ws.onmessage = e => setSnap(JSON.parse(e.data));
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        startPoll();
        const delay = Math.min(30_000, 500 * 2 ** attempt.current++);
        setTimeout(connect, delay);
      };
    };
    connect();
    return () => { cancelled = true; wsRef.current?.close(); stopPoll(); };
  }, [sessionKey]);

  return snap;
}
```

### 5.4 Concurrent connection cap

`ws` on a shared-cpu-1x Fly machine handles ~10–15k concurrent clients on idle keepalive, sending one ~4KB frame/1.5s = ~8 Mbps egress at 1k clients. Phase B/C target = **5k peak**. Bumps to a `performance-1x` ($30/mo) when MAU > 25k. Sharding via Redis pub/sub: spawn N WS machines, each subscribes to all `lt:*`, idempotent.

---

## 6. TELEMETRY REPLAYS (PHASE 2)

Marked Phase 2 in PID. Pipeline:

### 6.1 Worker

```python
# apps/workers-py/fastf1_export.py
import fastf1
import pyarrow as pa, pyarrow.parquet as pq
import boto3, os, sys

fastf1.Cache.enable_cache("/data/fastf1")
s3 = boto3.client("s3", endpoint_url=os.environ["R2_ENDPOINT"],
                  aws_access_key_id=os.environ["R2_KEY"], aws_secret_access_key=os.environ["R2_SECRET"])

def export(season: int, rnd: int, driver: str):
    s = fastf1.get_session(season, rnd, "R"); s.load(telemetry=True, laps=True)
    laps = s.laps.pick_driver(driver)
    tel = laps.get_telemetry().reset_index()
    table = pa.Table.from_pandas(tel[["Time","Speed","RPM","nGear","Throttle","Brake","DRS","X","Y","Distance"]])
    buf = pa.BufferOutputStream(); pq.write_table(table, buf, compression="zstd")
    key = f"telemetry/{season}/{rnd:02d}/{driver}.parquet"
    s3.put_object(Bucket=os.environ["R2_BUCKET"], Key=key, Body=buf.getvalue().to_pybytes(),
                  ContentType="application/octet-stream", CacheControl="public, max-age=31536000, immutable")
```

### 6.2 Parquet schema

```
time_ms (int32)
speed_kph (float32)
rpm (int16)
gear (int8)
throttle_pct (float32)
brake_pct (float32)
drs (uint8)            -- 0|1
x_m (float32)
y_m (float32)
distance_m (float32)
```

### 6.3 Client (DuckDB-WASM + Arrow JS)

```ts
import * as duckdb from "@duckdb/duckdb-wasm";
const JSDELIVR = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
const worker = new Worker(JSDELIVR.mainWorker!);
const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
await db.instantiate(JSDELIVR.mainModule, JSDELIVR.pthreadWorker);
const c = await db.connect();
await c.query(`CREATE VIEW telem AS SELECT * FROM read_parquet('https://cdn.apex.tld/telemetry/2026/08/max_verstappen.parquet');`);
const result = await c.query(`SELECT distance_m, speed_kph FROM telem ORDER BY time_ms`);
// Render with @observablehq/plot
```

### 6.4 Charts

| Chart | Source | Library |
|-------|--------|---------|
| Position chart (lap × pos) | `lap` table | Plot (server-rendered SVG) |
| Sector deltas | `lap` sectors | Plot |
| Tyre stints | derived from `pit_stop` + `lap.tyre_compound` | Plot |
| Speed trace overlay | telemetry parquet | DuckDB-WASM + Plot |

### 6.5 Storage cost

Telemetry per driver per race ≈ 1MB compressed (zstd). 24 races × 22 drivers × ~5 seasons = **~2.6 GB**. R2 storage = **$0.015/GB-mo = ~$0.04/mo**. Egress free. Negligible.

---

## 7. MEILISEARCH INDEX PIPELINE

Self-hosted Meili 1.10 on Fly.io (`shared-cpu-1x` + 1GB volume). Single instance, master key in Fly secrets.

### 7.1 Indexes

```ts
const INDEXES = {
  articles: {
    primaryKey: "id",
    searchableAttributes: ["title", "dek", "body_text", "author_name", "tag_labels"],
    filterableAttributes: ["status", "published_at", "tag_slugs", "driver_ids", "team_ids", "race_id", "is_premium"],
    sortableAttributes: ["published_at"],
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
    typoTolerance: { minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } },
  },
  videos: {
    primaryKey: "id",
    searchableAttributes: ["title", "description", "channel_name"],
    filterableAttributes: ["channel_id", "published_at", "curated"],
    sortableAttributes: ["published_at"],
  },
  drivers: {
    primaryKey: "id",
    searchableAttributes: ["given_name", "family_name", "code", "permanent_number", "nationality"],
    filterableAttributes: ["nationality", "active_season"],
    sortableAttributes: ["family_name"],
  },
  teams: {
    primaryKey: "id",
    searchableAttributes: ["name", "nationality", "base"],
    filterableAttributes: ["nationality", "active_season"],
  },
  races: {
    primaryKey: "id",
    searchableAttributes: ["name", "circuit_name", "country"],
    filterableAttributes: ["season", "status"],
    sortableAttributes: ["starts_at"],
  },
} as const;
```

### 7.2 Pipeline

```ts
// apps/workers/src/search/reindex.ts
import { MeiliSearch } from "meilisearch";
import { db } from "@apex/db";
import { article, articleTag, articleDriver, articleTeam, tag } from "@apex/db/schema";
import { eq, and } from "drizzle-orm";

const meili = new MeiliSearch({ host: process.env.MEILI_HOST!, apiKey: process.env.MEILI_MASTER_KEY! });

export async function reindexArticles(ids?: string[]) {
  const rows = await db.query.article.findMany({
    where: ids ? (a, { inArray }) => inArray(a.id, ids) : eq(article.status, "published"),
    with: { author: true, articleTags: { with: { tag: true } }, articleDrivers: true, articleTeams: true },
  });
  const docs = rows.map(r => ({
    id: r.id,
    title: r.title,
    dek: r.dek,
    body_text: portableTextToString(r.body),                    // strip JSON to plain text
    author_name: r.author.name,
    published_at: r.publishedAt ? Math.floor(r.publishedAt.getTime() / 1000) : null,
    tag_slugs: r.articleTags.map(x => x.tag.slug),
    tag_labels: r.articleTags.map(x => x.tag.label),
    driver_ids: r.articleDrivers.map(x => x.driverId),
    team_ids: r.articleTeams.map(x => x.teamId),
    is_premium: r.isPremium,
    url: `/articles/${r.slug}`,
  }));
  await meili.index("articles").updateDocuments(docs);
}
```

### 7.3 Triggers

- **CMS publish**: webhook to `/api/internal/search/index` → reindex single doc (≤200ms).
- **Ingest run finish** (Jolpica nightly): reindex `drivers`, `teams`, `races` if any updated.
- **Nightly full reindex** at 05:00 UTC as a safety net.

### 7.4 Frontend instant-search

`react-instantsearch@^7` + `@meilisearch/instant-meilisearch`. Search-only API key (read-only, no filters bypass). Latency budget: **<150ms** P95 from EU.

```tsx
// apps/web/app/search/SearchClient.tsx
"use client";
import { InstantSearch, SearchBox, Hits, Index, Configure } from "react-instantsearch";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";

const { searchClient } = instantMeiliSearch(process.env.NEXT_PUBLIC_MEILI_HOST!, process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY!);

export default function SearchClient() {
  return (
    <InstantSearch indexName="articles" searchClient={searchClient} routing>
      <SearchBox /* autoFocus */ />
      <Index indexName="drivers"><Configure hitsPerPage={4} /><Hits hitComponent={DriverHit} /></Index>
      <Index indexName="articles"><Configure hitsPerPage={8} /><Hits hitComponent={ArticleHit} /></Index>
      <Index indexName="races"><Configure hitsPerPage={4} /><Hits hitComponent={RaceHit} /></Index>
    </InstantSearch>
  );
}
```

---

## 8. AUTH (SUPABASE)

`@supabase/ssr@^0.5`. Providers: email magic link + Google + Apple + X (Twitter).

### 8.1 Providers config (Supabase dashboard)

- **Email**: magic link only — no passwords. Custom template, branded.
- **Google**: OAuth via Google Cloud project. Scopes: `openid email profile`.
- **Apple**: Sign in with Apple. Service ID required.
- **Twitter/X**: OAuth 2.0.

### 8.2 Session management

```ts
// apps/web/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const supabaseServer = () => {
  const c = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        getAll: () => c.getAll(),
        setAll: (all) => all.forEach(({name, value, options}) => c.set(name, value, options)),
      },
    },
  );
};
```

Middleware refreshes the session on every request that hits a protected route.

### 8.3 user mirror trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public."user" (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email));
  INSERT INTO public.notification_pref (user_id) VALUES (new.id);
  RETURN new;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

### 8.4 RLS

```sql
ALTER TABLE public."user"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_pref  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_self_read"   ON public."user"      FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_self_update" ON public."user"      FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "follow_self_all"  ON public.follow      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_self_all"   ON public.saved       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "np_self_all"      ON public.notification_pref FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

Editorial tables (article, video) stay open `SELECT` for `anon` where `status='published'`.

### 8.5 Account deletion (GDPR DSAR)

```ts
// apps/web/app/api/account/delete/route.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";          // service_role
import { db } from "@apex/db";
import { user, follow, saved, notificationPref } from "@apex/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const sb = supabaseServer();
  const { data: { user: u } } = await sb.auth.getUser();
  if (!u) return new Response("unauth", { status: 401 });

  await db.transaction(async tx => {
    await tx.delete(follow).where(eq(follow.userId, u.id));
    await tx.delete(saved).where(eq(saved.userId, u.id));
    await tx.delete(notificationPref).where(eq(notificationPref.userId, u.id));
    // event_log: anonymise rather than delete (retain analytics)
    await tx.execute(sql`UPDATE event_log SET user_id = NULL WHERE user_id = ${u.id}`);
    await tx.update(user).set({ deletedAt: new Date(), handle: null, displayName: "Deleted" }).where(eq(user.id, u.id));
  });

  // Hard-delete auth row last — service role
  await supabaseAdmin.auth.admin.deleteUser(u.id);
  return Response.json({ ok: true });
}
```

Email confirmation + 7-day grace period via Resend (link contains signed JWT, deletion finalised on click).

---

## 9. STRIPE (APEX+)

### 9.1 Products

| Product | Price | Lookup key |
|---------|-------|-----------|
| Apex+ Monthly | $4.99/mo | `apex_plus_monthly` |
| Apex+ Annual | $39/yr | `apex_plus_annual` |
| Apex+ Founder (lifetime, first 1k) | $99 one-time | `apex_plus_founder` |

Set up via Stripe Dashboard. **Stripe Tax** = on. **Customer Portal** = on, allow cancel, allow plan switch.

### 9.2 Webhook

```ts
// apps/web/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { db } from "@apex/db"; import { user } from "@apex/db/schema"; import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-09-30.acacia" });

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch { return new Response("bad sig", { status: 400 }); }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.type === "checkout.session.completed"
        ? await stripe.subscriptions.retrieve((event.data.object as Stripe.Checkout.Session).subscription as string)
        : event.data.object as Stripe.Subscription;
      const active = ["active", "trialing", "past_due"].includes(sub.status);
      const customerId = sub.customer as string;
      await db.update(user).set({ isApexPlus: active, stripeCustomerId: customerId })
        .where(eq(user.stripeCustomerId, customerId));
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(user).set({ isApexPlus: false })
        .where(eq(user.stripeCustomerId, sub.customer as string));
      break;
    }
    case "invoice.payment_failed": {
      // dunning handled by Stripe Smart Retries + branded emails (Resend template)
      break;
    }
  }
  return new Response("ok");
}
```

### 9.3 Checkout & portal

```ts
// apps/web/app/api/stripe/checkout/route.ts
export async function POST(req: Request) {
  const { lookupKey } = await req.json();
  const u = await getCurrentUser();
  const price = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true })).data[0];
  const sess = await stripe.checkout.sessions.create({
    mode: lookupKey === "apex_plus_founder" ? "payment" : "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    customer_email: u.email,
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?welcome=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/apex-plus`,
  });
  return Response.json({ url: sess.url });
}
```

---

## 10. OBSERVABILITY

### 10.1 Sentry tunnel

```ts
// apps/web/sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN!,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  tunnel: "/monitoring",
});
```

```ts
// apps/web/app/monitoring/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const piece = body.split("\n")[0];
  const dsn = JSON.parse(piece).dsn as string;
  const u = new URL(dsn);
  const project = u.pathname.slice(1);
  const upstream = `https://${u.hostname}/api/${project}/envelope/`;
  return fetch(upstream, { method: "POST", body, headers: { "Content-Type": "application/x-sentry-envelope" } });
}
```

Adblockers block `*.sentry.io` but not `/monitoring` on our origin.

### 10.2 PostHog

Client SDK + server mirror to `event_log`:

```ts
// apps/web/lib/analytics.ts
import { PostHog } from "posthog-node";
const ph = new PostHog(process.env.POSTHOG_KEY!, { host: "https://eu.i.posthog.com" });
export async function track(userId: string | null, type: string, payload: any, ctx: { surface?: string; sessionId?: string }) {
  ph.capture({ distinctId: userId ?? ctx.sessionId ?? "anon", event: type, properties: { ...payload, surface: ctx.surface } });
  await db.insert(eventLog).values({ userId, sessionId: ctx.sessionId, type, surface: ctx.surface, payload });
}
```

### 10.3 Better Stack uptime

Monitors: `/`, `/standings`, `/api/live/snapshot?s=…`, `wss://live.apex.tld?s=…` (ping every 60s). Heartbeat checks for `ingest-jolpica-nightly`, `ingest-youtube`.

### 10.4 Sentry alert rules

| Alert | Threshold |
|-------|-----------|
| LCP > 2.5s on `/` P75 | 5min window |
| 5xx rate > 1% any route | 5min window |
| Issue volume spike > 5× baseline | 15min window |
| Live snapshot age > 30s | dedicated route |

### 10.5 PostHog dashboards

`Engagement`, `Funnels: home→article`, `Subscription funnel`, `Live timing concurrency`, `Search CTR`.

---

## 11. DEPLOY TOPOLOGY

| Service | Provider | Region | Why |
|---------|----------|--------|-----|
| `apps/web` | Vercel | `iad1` + `fra1` | Auto edge for static |
| `apps/live-ws` | Fly.io | `fra` | EU race start times |
| `apps/workers/openf1-live` | Fly.io | `fra` | Same region as Redis |
| Meilisearch | Fly.io | `fra` | Self-host, free |
| Postgres | Supabase | `eu-central-1` | EU primary |
| Redis | Upstash | `fra1` global | Read replicas us-east |
| Object storage | Cloudflare R2 | global | Egress-free CDN |
| Trigger.dev | Trigger.dev cloud | `us-east` | OK — workers are EU-side via fetch |

**EU residency**: PII (user, follow, saved, notification_pref) lives in Supabase EU. PostHog EU region. Sentry EU region. Stripe = US but GDPR-DPA signed.

**DNS**: Cloudflare. Apex: `apex.tld`. Live WS: `live.apex.tld`. Meili: internal `meili.flycast` only — frontend hits via search proxy.

---

## 12. k6 LOAD TEST

```js
// apps/load/k6/scenarios.js
import http from "k6/http";
import ws from "k6/ws";
import { check, sleep, group } from "k6";

const BASE = __ENV.BASE_URL || "https://stage.apex.tld";
const WSS  = __ENV.WSS_URL  || "wss://live-stage.apex.tld";

export const options = {
  scenarios: {
    smoke:  { executor: "constant-vus", exec: "browse", vus: 5,    duration: "1m", tags: { profile: "smoke" } },
    spike:  { executor: "ramping-arrival-rate", exec: "browse",
              startRate: 50, timeUnit: "1s",
              preAllocatedVUs: 500, maxVUs: 2000,
              stages: [{ target: 1000, duration: "1m" }, { target: 1000, duration: "3m" }, { target: 0, duration: "1m" }],
              tags: { profile: "spike" } },
    soak:   { executor: "constant-arrival-rate", exec: "browse",
              rate: 200, timeUnit: "1s",
              duration: "30m", preAllocatedVUs: 400, maxVUs: 800,
              tags: { profile: "soak" } },
    livews: { executor: "ramping-vus", exec: "live",
              stages: [{ duration: "2m", target: 1000 }, { duration: "10m", target: 1000 }, { duration: "1m", target: 0 }],
              tags: { profile: "livews" } },
  },
  thresholds: {
    "http_req_duration{profile:smoke}": ["p(95)<800"],
    "http_req_duration{profile:spike}": ["p(95)<1500"],
    "http_req_duration{profile:soak}":  ["p(95)<1000", "p(99)<2000"],
    "http_req_failed":                  ["rate<0.01"],
    "ws_session_duration":              ["p(95)>50000"],
  },
};

export function browse() {
  group("home", () => {
    const r = http.get(`${BASE}/`);
    check(r, { "home 200": x => x.status === 200, "home <1s": x => x.timings.duration < 1000 });
  });
  group("standings", () => {
    const r = http.get(`${BASE}/standings/driver`);
    check(r, { "std 200": x => x.status === 200 });
  });
  group("race detail", () => {
    const r = http.get(`${BASE}/race/2026-08`);
    check(r, { "race 200": x => x.status === 200 });
  });
  sleep(Math.random() * 2 + 1);
}

export function live() {
  const url = `${WSS}?s=9999`;
  ws.connect(url, {}, socket => {
    socket.on("open", () => socket.setTimeout(() => socket.close(), 60_000));
    socket.on("message", msg => check(msg, { "ws payload nonempty": m => m.length > 0 }));
  });
}
```

Run: `k6 run --out experimental-prometheus-rw=… scenarios.js`. Prometheus + Grafana on a 1× Fly machine for visualization.

---

## 13. PHASE B + C SPRINT BREAKDOWN (weeks 5–12)

Phase A landed week 1–4. We assume single founder + 1 part-time editor (eventually).

### Week 5 — DB foundation

**Lands**: `packages/db` with full schema, migrations 0001–0005, materialized views, `seed.ts` for nav/partner/tags. Supabase EU project provisioned. Connection pooler config. Drizzle Studio wired in dev.

**Gate**: `pnpm db:migrate` clean on a fresh Supabase project. `select * from race` empty but typed.

**Risk**: schema drift between dev and prod. Mitigation: only ever apply via `drizzle-kit migrate`, never psql direct.

### Week 6 — Historical ingest + Redis cache wrapper

**Lands**: `apps/workers/jolpica/*`, token bucket, idempotent upserts, `packages/cache`. One-shot run for 2020–2026 first (faster), then 1950–2019 second. `mv_*` views refreshed.

**Dependencies**: Week 5 schema. Trigger.dev project provisioned.

**Gate**: `select count(*) from race` ≈ 1100. `select count(*) from result` ≈ 25k. Standings views populate.

**Risk**: 6h Trigger.dev runtime cap on Hobby. Mitigation: chunk by decade, chain runs.

### Week 7 — Wire 13 PID routes to real data

**Lands**:
- `/` real strip + hero
- `/schedule` real
- `/standings/driver`, `/standings/team` real
- `/race/[id]` summary
- `/driver/[slug]` + `/team/[slug]`
- ISR + `unstable_cache` tags hooked

**Dependencies**: Week 6 data live.

**Gate**: Lighthouse perf ≥ 90 desktop on home, schedule, standings. LCP ≤ 1.8s. INP ≤ 200ms.

### Week 8 — Admin CMS + Meilisearch

**Lands**: `apps/admin` (gated `/admin` on web, role-checked). Article editor (TipTap), image upload to R2, scheduled publishing, `revalidateTag('article:<id>')` on publish. Meili Fly deploy + reindex worker. `/search` page with `react-instantsearch`.

**Dependencies**: Week 5 (article table), Week 7 (revalidate plumbing).

**Gate**: Editor publishes a real article in <60s round-trip. Search returns it in <200ms.

### Week 9 — Auth + follow/saved + identity routes

**Lands**: Supabase Auth (magic link + Google + Apple + X). RLS. `auth.users` → `public.user` trigger. `/account`, `/account/follows`, `/account/saved`. Email digest opt-in. Account deletion flow.

**Gate**: Cypress smoke: sign in → follow Verstappen → see in `/account/follows` → request deletion → user row soft-deleted.

### Week 10 — Live timing pipeline end-to-end

**Lands**: `apps/workers/openf1-live` on Fly. `apps/live-ws` on Fly. `/live/[sessionKey]` route with `useLiveSession` hook. `/api/live/snapshot` fallback. Weather + race-control panels.

**Dependencies**: Week 6 schedule data. OpenF1 known good (test session_key from a past GP).

**Gate**: k6 `livews` scenario hits 1k concurrent connections; P95 send→client < 800ms.

**Risk**: OpenF1 brownouts. Mitigation: graceful degradation to snapshot polling, "live data delayed" banner.

### Week 11 — Observability + Stripe + Resend

**Lands**: Sentry tunnel route. PostHog client + server mirror. Better Stack monitors. Stripe products + webhook + checkout + portal. Resend templates (race reminder, weekly digest, magic link).

**Gate**: Test purchase → `user.is_apex_plus = true` within 3s of webhook. Resend deliverability ≥ 99% on Mailtrap-style test.

### Week 12 — k6 load tests + public beta cut

**Lands**: k6 smoke + soak + spike against staging. Fix all P95 > target findings. Newsletter signup live. Public beta announcement.

**Gate**: Soak 30min @ 200rps with `p99<2s`. Zero P0 Sentry issues for 24h pre-launch.

### Critical path

```
Week 5 schema  ──► Week 6 ingest  ──► Week 7 routes  ──► Week 8 CMS+Meili  ──► Week 11 obs+Stripe ──► Week 12 beta
                              \                                                       ▲
                               └─► Week 9 auth ──────────────────────────────────────-┘
                                              \
                                               └─► Week 10 live-ws ───────────────────►
```

Auth (W9) and live-ws (W10) can parallelise in the same week if one is delegated. Solo: keep sequential.

### Risk gates between weeks

| Gate | Pass/Fail signal |
|------|------------------|
| End W6 | `mv_standings_driver_latest` returns 2026 standings with non-zero points |
| End W7 | 5 routes Lighthouse perf ≥ 90, no client-side data fetching on hot paths |
| End W8 | Article publish → search hit in <200ms; revalidate <2s |
| End W10 | WS reconnect under SIGKILL of `apex-openf1-live` recovers in <10s |
| End W12 | k6 soak passes; Sentry quiet 24h |

---

## 14. REPO LOC ESTIMATE (post Phase B/C)

Honest. Code only, no node_modules/lockfile/fixtures.

| Package | LOC | Notes |
|---------|-----|-------|
| `apps/web` | ~14,000 | 13 PID routes + components + lib + middleware |
| `apps/admin` (inside web `/admin`) | ~3,000 | TipTap editor, table views, scheduled publish |
| `apps/live-ws` | ~600 | Single server file + tests |
| `apps/workers` (TS) | ~2,800 | Jolpica + YouTube + Wikidata + weather + revalidate + reindex |
| `apps/workers-py` | ~400 | FastF1 export (Phase 2 scaffolding only) |
| `apps/load` | ~500 | k6 scenarios + helpers |
| `packages/db` | ~2,200 | Drizzle schema (~1,400) + queries + migrations |
| `packages/cache` | ~250 | `cached()` wrapper + key helpers |
| `packages/auth` | ~400 | Supabase server/client wrappers + middleware |
| `packages/ui` | ~3,500 | AppShell, MegaNav, RaceTickerBar, charts, atoms |
| `packages/icons` | ~150 | Material Symbols wrapper |
| `packages/types` | ~600 | Shared zod schemas (Jolpica + OpenF1 + internal) |
| `packages/analytics` | ~250 | PostHog wrapper + `track()` helper |
| `packages/search` | ~300 | Meili reindex helpers + types |
| Infra (`infra/` Fly tomls, Dockerfiles, k6 grafana) | ~400 | |
| Tests (vitest + playwright + cypress) | ~3,500 | |
| Docs (in-repo MD specs, runbooks) | ~1,500 | |
| **Total** | **~34,350 LOC** | excludes generated migration SQL |

Generated SQL migrations add another ~1,200 lines. Realistic ship target: **~35k LOC of hand-written code** by end of Phase C.

---

## Closing notes for the founder

- **The single highest-leverage hour** in Phase B is wiring the `revalidateTag('article:<id>')` chain correctly. Get this wrong and the CMS feels slow forever.
- **Single highest-risk hour** is the OpenF1 poller on race day. Run a full dry-run against a *past* session_key (OpenF1 retains historical data) two weekends before the first real Grand Prix you cover.
- **Single most under-budgeted item**: editorial pipeline UX. The CMS is the product for the editorial team. Don't ship a bare CRUD; ship something the editor actually wants to open.
- **Anti-pattern surfaces** (PID §25) the spec keeps you honest on: do not let the homepage become a bento grid. Every feed surface must lead with one big editorial block, not nine equally-sized cards.
- **Founder bandwidth reality**: weeks 6 and 10 are the two that solo will overrun. Plan for 9 calendar weeks of Phase B + C, not 8.

Absolute path to plan source-of-truth this document derives from: `/Users/shauryapunj/Desktop/F1_Claude/APEX_F1_PID_PRD.md` and `/Users/shauryapunj/Desktop/F1_Claude/FORMULA1_STARTUP_PHASE1_PID.md`. Drizzle schema files to create: `/Users/shauryapunj/Desktop/F1_Claude/packages/db/src/schema/*.ts`. Live worker: `/Users/shauryapunj/Desktop/F1_Claude/apps/workers/src/openf1/live.ts`. WS server: `/Users/shauryapunj/Desktop/F1_Claude/apps/live-ws/src/server.ts`.
