import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { season } from './season';
import { circuit } from './circuit';

export const raceStatus = ['completed', 'live', 'upcoming', 'testing', 'cancelled'] as const;

export const race = pgTable(
  'race',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seasonYear: integer('season_year')
      .notNull()
      .references(() => season.year, { onDelete: 'cascade' }),
    round: integer('round').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    officialName: text('official_name').notNull(),
    country: text('country').notNull(),
    city: text('city'),
    circuitId: uuid('circuit_id').references(() => circuit.id),
    dateStart: timestamp('date_start', { withTimezone: true }).notNull(),
    dateEnd: timestamp('date_end', { withTimezone: true }),
    timezone: text('timezone'),
    isSprint: boolean('is_sprint').default(false).notNull(),
    status: text('status', { enum: raceStatus }).notNull(),
    heroImageUrl: text('hero_image_url'),
    wikiUrl: text('wiki_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    seasonRoundUnique: uniqueIndex('race_season_round_unique').on(t.seasonYear, t.round),
    seasonRoundIdx: index('race_season_round_idx').on(t.seasonYear, t.round),
    dateStartIdx: index('race_date_start_idx').on(t.dateStart),
  }),
);

export type Race = typeof race.$inferSelect;
export type NewRace = typeof race.$inferInsert;
