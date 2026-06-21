/* Lightweight worker runner: opens an ingestion_run row, runs the task,
 * marks success/fail, logs progress. Use across every ingest script.
 */

import { getDb, schema } from '@apex/db';
import { eq } from 'drizzle-orm';

export interface RunContext {
  runId: string;
  log: (msg: string) => void;
  bump: (delta: { itemsIn?: number; itemsOut?: number }) => void;
}

export async function runWorker(
  source: string,
  task: (ctx: RunContext) => Promise<void>,
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .insert(schema.ingestionRun)
    .values({ source, status: 'running' })
    .returning({ id: schema.ingestionRun.id });
  if (!row) throw new Error('failed to open ingestion_run');
  const runId = row.id;

  let itemsIn = 0;
  let itemsOut = 0;
  const t0 = Date.now();

  const log = (msg: string) => {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    // eslint-disable-next-line no-console
    console.log(`[${source} ${runId.slice(0, 8)} +${elapsed}s] ${msg}`);
  };
  const bump = (d: { itemsIn?: number; itemsOut?: number }) => {
    itemsIn += d.itemsIn ?? 0;
    itemsOut += d.itemsOut ?? 0;
  };

  try {
    log('start');
    await task({ runId, log, bump });
    await db
      .update(schema.ingestionRun)
      .set({ status: 'success', endedAt: new Date(), itemsIn, itemsOut })
      .where(eq(schema.ingestionRun.id, runId));
    log(`done in=${itemsIn} out=${itemsOut}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.ingestionRun)
      .set({
        status: 'failed',
        endedAt: new Date(),
        itemsIn,
        itemsOut,
        error: message,
      })
      .where(eq(schema.ingestionRun.id, runId));
    // eslint-disable-next-line no-console
    console.error(`[${source}] FAILED: ${message}`);
    throw err;
  }
}

/** Polite delay between paginated API calls. */
export function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
