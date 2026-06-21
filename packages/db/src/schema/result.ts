import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
  bigint,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { race } from './race';
import { driver } from './driver';
import { team } from './team';

export const result = pgTable(
  'result',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => race.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driver.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id),
    position: integer('position'),
    positionText: text('position_text').notNull(),
    points: integer('points').notNull(),
    laps: integer('laps'),
    timeMs: bigint('time_ms', { mode: 'number' }),
    gapToLeader: text('gap_to_leader'),
    status: text('status').notNull(),
    grid: integer('grid'),
    fastestLapRank: integer('fastest_lap_rank'),
    fastestLapTimeMs: bigint('fastest_lap_time_ms', { mode: 'number' }),
    fastestLapLap: integer('fastest_lap_lap'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    raceDriverUnique: uniqueIndex('result_race_driver_unique').on(t.raceId, t.driverId),
    racePositionIdx: index('result_race_position_idx').on(t.raceId, t.position),
    driverIdx: index('result_driver_idx').on(t.driverId),
  }),
);

export const qualifying = pgTable(
  'qualifying',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => race.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driver.id, { onDelete: 'cascade' }),
    q1Ms: bigint('q1_ms', { mode: 'number' }),
    q2Ms: bigint('q2_ms', { mode: 'number' }),
    q3Ms: bigint('q3_ms', { mode: 'number' }),
    position: integer('position'),
  },
  (t) => ({
    raceDriverUnique: uniqueIndex('qual_race_driver_unique').on(t.raceId, t.driverId),
  }),
);

export const sprintResult = pgTable(
  'sprint_result',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => race.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driver.id, { onDelete: 'cascade' }),
    position: integer('position'),
    points: integer('points').notNull(),
    timeMs: bigint('time_ms', { mode: 'number' }),
    status: text('status').notNull(),
  },
  (t) => ({
    raceDriverUnique: uniqueIndex('sprint_race_driver_unique').on(t.raceId, t.driverId),
  }),
);

export const pitStop = pgTable(
  'pit_stop',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => race.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driver.id, { onDelete: 'cascade' }),
    lap: integer('lap').notNull(),
    timeOfDay: text('time_of_day'),
    durationMs: integer('duration_ms'),
  },
  (t) => ({
    raceDriverLapUnique: uniqueIndex('pit_unique').on(t.raceId, t.driverId, t.lap),
  }),
);

export const lap = pgTable(
  'lap',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raceId: uuid('race_id')
      .notNull()
      .references(() => race.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id')
      .notNull()
      .references(() => driver.id, { onDelete: 'cascade' }),
    lapNumber: integer('lap_number').notNull(),
    position: integer('position'),
    timeMs: bigint('time_ms', { mode: 'number' }),
  },
  (t) => ({
    raceDriverLapUnique: uniqueIndex('lap_unique').on(t.raceId, t.driverId, t.lapNumber),
  }),
);

export type Result = typeof result.$inferSelect;
export type NewResult = typeof result.$inferInsert;
