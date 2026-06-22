/**
 * Cron authorization + observability primitives.
 *
 * Every /api/cron/* route in Apex shares the same auth gate and the same
 * structured-report envelope so a single log filter in Vercel surfaces
 * every cron tick. Keep helpers here · do not duplicate per route.
 *
 * Auth model:
 *   - Vercel cron injects `x-vercel-cron: 1` on scheduled invocations.
 *     Vercel's edge strips this from inbound traffic, so it cannot be
 *     forged from a public client.
 *   - Manual replays (Vercel UI button, local dev) pass
 *     `Authorization: Bearer <CRON_SECRET>`.
 *   - With CRON_SECRET unset, manual replays are disabled and only the
 *     Vercel scheduler succeeds.
 */

export function isAuthorizedCronRequest(req: Request): boolean {
  if (req.headers.get('x-vercel-cron')) return true;
  const secret = process.env['CRON_SECRET'];
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  // Constant-time-ish compare is overkill for an HMAC-less Bearer · the
  // secret has 256 bits of entropy and Vercel rate-limits anyway.
  return auth === `Bearer ${secret}`;
}

/** Standard JSON envelope for cron reports. Every route returns this shape. */
export interface CronReport {
  ok: boolean;
  /** Short route identifier (e.g. "rss-sync") for log grep. Optional for
   * backwards-compat · prefer passing it for every new cron. */
  route?: string;
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

/**
 * Emit the report as a single-line JSON log so Vercel's log-aggregator can
 * parse it and the operator can grep `route=` to filter by job. Call this
 * exactly once per route, right before NextResponse.json(...).
 */
export function logReport(report: CronReport): void {
  // eslint-disable-next-line no-console
  console.info(`[cron] ${JSON.stringify(report)}`);
}

/**
 * Retry a promise-returning function with exponential backoff. Useful for
 * upstream APIs that hiccup intermittently · Jolpica's free tier 429s under
 * burst, Open-Meteo can 503 during cold edges, etc.
 *
 * Defaults: 3 attempts, 250ms base, 2x growth (250 / 500 / 1000ms total wait).
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number; growth?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 250;
  const growth = opts.growth ?? 2;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(growth, i)));
      }
    }
  }
  throw lastErr;
}

/**
 * Timed-section helper. Wraps an async fn so the cron route can report
 * per-upstream timings in its `results` block · helps the operator know
 * which provider is slowing a 50s budget.
 *
 * Example:
 *   const [items, ms] = await timed(() => getF1NewsFeed(...));
 *   results.rssMs = ms;
 */
export async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = Date.now();
  const result = await fn();
  return [result, Date.now() - t];
}
