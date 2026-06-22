/**
 * Cron authorization.
 *
 * Production: Vercel injects `x-vercel-cron: 1` on scheduled invocations.
 * Vercel's edge strips this header from any inbound traffic, so it cannot
 * be forged from a public client.
 *
 * Manual re-runs (from Vercel UI or local dev): use
 *   Authorization: Bearer <CRON_SECRET>
 *
 * If CRON_SECRET is not set in env, manual re-runs are disabled and only
 * Vercel scheduled hits work. Local dev: set CRON_SECRET in .env.local to
 * test crons via `curl -H "Authorization: Bearer ..."`.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  if (req.headers.get('x-vercel-cron')) return true;
  const secret = process.env['CRON_SECRET'];
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

/** Standard JSON envelope for cron reports. */
export interface CronReport {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results?: Record<string, unknown>;
  skipped?: string;
  error?: string;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function buildReport(
  startMs: number,
  partial: Omit<CronReport, 'startedAt' | 'finishedAt' | 'durationMs'>,
): CronReport {
  const finishMs = Date.now();
  return {
    startedAt: new Date(startMs).toISOString(),
    finishedAt: new Date(finishMs).toISOString(),
    durationMs: finishMs - startMs,
    ...partial,
  };
}
