import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { driver } from './driver';
import { season } from './season';

export const team = pgTable(
  'team',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    fullName: text('full_name'),
    base: text('base'),
    principal: text('principal'),
    technicalChief: text('technical_chief'),
    powerUnit: text('power_unit'),
    foundedYear: integer('founded_year'),
    colorHex: text('color_hex'),
    logoUrl: text('logo_url'),
    carImageUrl: text('car_image_url'),
    liveryImageUrl: text('livery_image_url'),
    championshipsCount: integer('championships_count').default(0),
    wikiUrl: text('wiki_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index('team_name_idx').on(t.name),
  }),
);

export const driverTeamHistory = pgTable(
  'driver_team_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driver.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    seasonYear: integer('season_year')
      .notNull()
      .references(() => season.year),
    role: text('role'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    driverSeasonIdx: index('dth_driver_season_idx').on(t.driverId, t.seasonYear),
    teamSeasonIdx: index('dth_team_season_idx').on(t.teamId, t.seasonYear),
  }),
);

export type Team = typeof team.$inferSelect;
export type NewTeam = typeof team.$inferInsert;
