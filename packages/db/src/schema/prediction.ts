import {
  pgTable,
  text,
  uuid,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/** Driver picks for the four scorable questions. Values are Jolpica driverIds. */
export interface PredictionPicks {
  pole?: string;
  winner?: string;
  fastest_lap?: string;
  podium?: string;
}

/**
 * One anonymous fan's prediction for one race. Identity is a random cookie id
 * (apex_pid) — no login required. `score` is null until the race is scored
 * against the real Jolpica result.
 */
export const prediction = pgTable(
  'prediction',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: text('client_id').notNull(),
    handle: text('handle'),
    season: integer('season').notNull(),
    round: integer('round').notNull(),
    raceSlug: text('race_slug').notNull(),
    picks: jsonb('picks').$type<PredictionPicks>().notNull(),
    score: integer('score'),
    scoredAt: timestamp('scored_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    clientRaceUq: uniqueIndex('prediction_client_race_uq').on(t.clientId, t.season, t.round),
    raceIdx: index('prediction_race_idx').on(t.season, t.round),
    scoreIdx: index('prediction_score_idx').on(t.score),
  }),
);
