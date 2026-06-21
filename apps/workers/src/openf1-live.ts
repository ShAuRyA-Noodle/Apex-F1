/**
 * openf1-live
 *
 * Long-running race-weekend polling worker.
 *
 * Polls OpenF1 every 1-3 seconds for the current session and writes snapshots
 * to Redis (lt:{session_key}:tower / positions / rc / weather). Designed to run
 * on a Fly.io shared-cpu-1x VM only during race weekends.
 *
 * Phase C ships a WebSocket fanout server on top of these Redis snapshots so
 * clients get sub-second updates.
 *
 * Required env:
 *   REDIS_URL   Upstash Redis REST URL (or rediss://...)
 *
 * Until REDIS_URL is provisioned, this script polls + logs but does not write.
 */

import { openf1 } from '@apex/api-client/openf1';
import { sleep } from './lib/runner';

const TICK_MS = 2000;

async function tick(sessionKey: number) {
  const [intervals, positions, weather, rc] = await Promise.all([
    openf1.getIntervals(sessionKey, { revalidate: 0 }),
    openf1.getPositions(sessionKey, { revalidate: 0 }),
    openf1.getWeather(sessionKey, { revalidate: 0 }),
    openf1.getRaceControl(sessionKey, { revalidate: 0 }),
  ]);
  return { intervals, positions, weather, rc };
}

async function main() {
  const session = await openf1.getLatestSession({ revalidate: 0 });
  if (!session) {
    console.log('[openf1-live] no current session; nothing to do');
    process.exit(0);
  }
  const sessionKey = session.session_key;
  const endMs = new Date(session.date_end).getTime();
  console.log(`[openf1-live] session ${sessionKey} (${session.location} ${session.session_name})`);

  while (Date.now() < endMs + 5 * 60_000) {
    try {
      const snap = await tick(sessionKey);
      // TODO: write to Redis once REDIS_URL provisioned
      console.log(
        `[openf1-live] tick: intervals=${snap.intervals.length} positions=${snap.positions.length} rc=${snap.rc.length} weather=${snap.weather.length}`,
      );
    } catch (err) {
      console.error('[openf1-live] tick failed', err);
    }
    await sleep(TICK_MS);
  }

  console.log('[openf1-live] session ended; exiting cleanly');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
