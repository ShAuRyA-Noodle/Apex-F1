import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { race } from './race';

export const sessionKind = ['FP1', 'FP2', 'FP3', 'SQ', 'S', 'Q', 'R'] as const;
export const sessionStatus = ['scheduled', 'live', 'completed', 'cancelled'] as const;

export const session = pgTable(
  'session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => race.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: sessionKind }).notNull(),
    scheduledStart: timestamp('scheduled_start', { withTimezone: true }).notNull(),
    scheduledEnd: timestamp('scheduled_end', { withTimezone: true }),
    actualStart: timestamp('actual_start', { withTimezone: true }),
    actualEnd: timestamp('actual_end', { withTimezone: true }),
    status: text('status', { enum: sessionStatus }).notNull().default('scheduled'),
    openf1SessionKey: text('openf1_session_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    raceIdx: index('session_race_idx').on(t.raceId),
    openf1Idx: index('session_openf1_idx').on(t.openf1SessionKey),
  }),
);

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
