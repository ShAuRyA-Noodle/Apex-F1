import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { getDb } from './client';
import { prediction, type PredictionPicks } from './schema';

const hasDb = () => Boolean(process.env['DATABASE_URL']);

export interface UpsertPredictionInput {
  clientId: string;
  handle?: string | null;
  season: number;
  round: number;
  raceSlug: string;
  picks: PredictionPicks;
}

/** Insert or replace a fan's picks for one race (unique on client+season+round). */
export async function upsertPrediction(input: UpsertPredictionInput): Promise<boolean> {
  if (!hasDb()) return false;
  try {
    const db = getDb();
    await db
      .insert(prediction)
      .values({
        clientId: input.clientId,
        handle: input.handle ?? null,
        season: input.season,
        round: input.round,
        raceSlug: input.raceSlug,
        picks: input.picks,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [prediction.clientId, prediction.season, prediction.round],
        set: { picks: input.picks, handle: input.handle ?? null, updatedAt: new Date() },
      });
    return true;
  } catch {
    return false;
  }
}

export async function getPrediction(
  clientId: string,
  season: number,
  round: number,
): Promise<{ picks: PredictionPicks; score: number | null } | null> {
  if (!hasDb()) return null;
  try {
    const db = getDb();
    const rows = await db
      .select({ picks: prediction.picks, score: prediction.score })
      .from(prediction)
      .where(
        and(
          eq(prediction.clientId, clientId),
          eq(prediction.season, season),
          eq(prediction.round, round),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export interface Consensus {
  total: number;
  questions: Record<string, { value: string; count: number; pct: number }[]>;
}

/** Aggregate what every fan picked for a race (live "the grid thinks..."). */
export async function getConsensus(season: number, round: number): Promise<Consensus> {
  const empty: Consensus = { total: 0, questions: {} };
  if (!hasDb()) return empty;
  try {
    const db = getDb();
    const rows = await db
      .select({ picks: prediction.picks })
      .from(prediction)
      .where(and(eq(prediction.season, season), eq(prediction.round, round)));
    const tally: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      for (const [q, v] of Object.entries(r.picks ?? {})) {
        if (!v) continue;
        (tally[q] ??= {})[v] = (tally[q]?.[v] ?? 0) + 1;
      }
    }
    const questions: Consensus['questions'] = {};
    for (const [q, counts] of Object.entries(tally)) {
      const sum = Object.values(counts).reduce((a, b) => a + b, 0);
      questions[q] = Object.entries(counts)
        .map(([value, count]) => ({ value, count, pct: Math.round((count / sum) * 100) }))
        .sort((a, b) => b.count - a.count);
    }
    return { total: rows.length, questions };
  } catch {
    return empty;
  }
}

export interface LeaderRow {
  clientId: string;
  handle: string | null;
  total: number;
  races: number;
}

/** Season leaderboard: total scored points per fan, highest first. */
export async function getLeaderboard(season: number, limit = 10): Promise<LeaderRow[]> {
  if (!hasDb()) return [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        clientId: prediction.clientId,
        handle: sql<string | null>`max(${prediction.handle})`,
        total: sql<number>`coalesce(sum(${prediction.score}),0)::int`,
        races: sql<number>`count(*) filter (where ${prediction.score} is not null)::int`,
      })
      .from(prediction)
      .where(and(eq(prediction.season, season), isNotNull(prediction.score)))
      .groupBy(prediction.clientId)
      .orderBy(desc(sql`coalesce(sum(${prediction.score}),0)`))
      .limit(limit);
    return rows.map((r) => ({
      clientId: r.clientId,
      handle: r.handle,
      total: Number(r.total),
      races: Number(r.races),
    }));
  } catch {
    return [];
  }
}

export interface RacePrediction {
  id: string;
  clientId: string;
  picks: PredictionPicks;
  score: number | null;
}

export async function getRacePredictions(season: number, round: number): Promise<RacePrediction[]> {
  if (!hasDb()) return [];
  try {
    const db = getDb();
    return await db
      .select({
        id: prediction.id,
        clientId: prediction.clientId,
        picks: prediction.picks,
        score: prediction.score,
      })
      .from(prediction)
      .where(and(eq(prediction.season, season), eq(prediction.round, round)));
  } catch {
    return [];
  }
}

export async function setPredictionScores(updates: { id: string; score: number }[]): Promise<void> {
  if (!hasDb() || updates.length === 0) return;
  try {
    const db = getDb();
    const now = new Date();
    for (const u of updates) {
      await db
        .update(prediction)
        .set({ score: u.score, scoredAt: now })
        .where(eq(prediction.id, u.id));
    }
  } catch {
    /* ignore */
  }
}
