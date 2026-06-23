import type { PredictionPicks } from '@apex/db';

/** The four scorable questions (every one maps to real Jolpica result data). */
export const PREDICT_QUESTIONS = [
  { id: 'pole', label: 'Pole position', points: 3 },
  { id: 'winner', label: 'Race winner', points: 5 },
  { id: 'podium', label: 'Podium finish (top 3)', points: 3 },
  { id: 'fastest_lap', label: 'Fastest lap', points: 2 },
] as const;

export type PredictQId = (typeof PREDICT_QUESTIONS)[number]['id'];
export const PREDICT_MAX = PREDICT_QUESTIONS.reduce((a, q) => a + q.points, 0);

type RaceResult = { position: string; Driver: { driverId: string }; FastestLap?: { rank?: string } };
type QualiResult = { position: string; Driver: { driverId: string } };

export interface ScoredQuestion {
  id: PredictQId;
  label: string;
  points: number;
  pick: string | null;
  actual: string | null;
  correct: boolean;
  awarded: number;
}

export interface PredictionScore {
  total: number;
  questions: ScoredQuestion[];
}

/** Score a fan's picks against the real race + qualifying classification. */
export function scorePicks(
  picks: PredictionPicks,
  results: RaceResult[],
  quali: QualiResult[],
): PredictionScore {
  const winnerId = results.find((r) => r.position === '1')?.Driver.driverId ?? null;
  const podiumIds = results
    .filter((r) => Number(r.position) >= 1 && Number(r.position) <= 3)
    .map((r) => r.Driver.driverId);
  const flId = results.find((r) => r.FastestLap?.rank === '1')?.Driver.driverId ?? null;
  const poleId = quali.find((q) => q.position === '1')?.Driver.driverId ?? null;

  const check: Record<PredictQId, { ok: (p: string) => boolean; actual: string | null }> = {
    pole: { ok: (p) => p === poleId, actual: poleId },
    winner: { ok: (p) => p === winnerId, actual: winnerId },
    podium: { ok: (p) => podiumIds.includes(p), actual: podiumIds[2] ?? null },
    fastest_lap: { ok: (p) => p === flId, actual: flId },
  };

  const questions: ScoredQuestion[] = PREDICT_QUESTIONS.map((q) => {
    const pick = picks[q.id] ?? null;
    const correct = pick ? check[q.id].ok(pick) : false;
    return {
      id: q.id,
      label: q.label,
      points: q.points,
      pick,
      actual: check[q.id].actual,
      correct,
      awarded: correct ? q.points : 0,
    };
  });

  return { total: questions.reduce((a, q) => a + q.awarded, 0), questions };
}
