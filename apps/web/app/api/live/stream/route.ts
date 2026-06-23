/**
 * /api/live/stream
 *
 * Server-Sent Events feed of the current OpenF1 session.
 *
 * Why SSE and not WebSockets:
 *   - One-way push (server -> client) · we never receive from the browser.
 *   - Works through every CDN + reverse proxy without special config.
 *   - Auto-reconnect built into EventSource. Free retry with backoff.
 *   - Vercel Node runtime supports streaming responses out of the box.
 *
 * Cadence:
 *   - Tick every 2s during a live session window.
 *   - Outside the session window: emit a "session_state" event once on connect
 *     plus a heartbeat every 30s. Skip all the expensive intervals/positions
 *     polling. This keeps idle costs near zero.
 *
 * Auth:
 *   - Currently open. Add CRON_SECRET-style auth when Apex+ ships and rate
 *     limiting becomes a thing.
 *
 * Quota discipline:
 *   - OpenF1 has no formal rate limit but they monitor abuse. We honor that
 *     by capping ticks at 0.5 Hz (2s) and aborting cleanly when the client
 *     disconnects (controller.signal listener on the ReadableStream).
 *
 * Frame shape:
 *   event: <name>
 *   data: <JSON>
 *
 *   Names: connected, session_state, tower, race_control, weather, heartbeat, error
 */

import { openf1 } from '@apex/api-client/openf1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel pro cap; hobby cap is 60.

const TICK_MS_LIVE = 2_000;
const HEARTBEAT_MS_IDLE = 30_000;

interface IntervalSnap {
  driver_number: number;
  gap?: number | string;
  interval?: number | string;
}
interface PositionSnap {
  driver_number: number;
  position: number;
}

function sseFrame(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

function buildTower(intervals: IntervalSnap[], positions: PositionSnap[]) {
  const posByDriver = new Map<number, number>();
  for (const p of positions) posByDriver.set(p.driver_number, p.position);
  const intByDriver = new Map<number, IntervalSnap>();
  for (const i of intervals) intByDriver.set(i.driver_number, i);
  const rows: Array<{ driver: number; pos: number; gap?: number | string; interval?: number | string }> = [];
  for (const [driver, pos] of posByDriver.entries()) {
    const snap = intByDriver.get(driver);
    rows.push({ driver, pos, gap: snap?.gap, interval: snap?.interval });
  }
  rows.sort((a, b) => a.pos - b.pos);
  return rows;
}

export async function GET(req: Request) {
  // Closing signal so we tear down loops + intervals when the client navigates away.
  const abort = req.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let alive = true;
      const close = () => {
        if (!alive) return;
        alive = false;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      abort.addEventListener('abort', close);

      const emit = (event: string, data: unknown) => {
        if (!alive) return;
        try {
          controller.enqueue(sseFrame(event, data));
        } catch {
          alive = false;
        }
      };

      // 1. Connected handshake.
      emit('connected', { ts: Date.now(), source: 'openf1' });

      // 2. Pull session + decide cadence.
      let session = await openf1.getLatestSession({ revalidate: 0 }).catch(() => null);
      if (!session) {
        emit('session_state', { state: 'no_session' });
      } else {
        const startMs = new Date(session.date_start).getTime();
        const endMs = new Date(session.date_end).getTime();
        const now = Date.now();
        const isLive = now >= startMs && now <= endMs;
        emit('session_state', {
          state: isLive ? 'live' : now < startMs ? 'upcoming' : 'completed',
          session_key: session.session_key,
          location: session.location,
          session_name: session.session_name,
          date_start: session.date_start,
          date_end: session.date_end,
        });
      }

      // Tail loop. Tick fast when live, otherwise heartbeat only.
      while (alive) {
        try {
          // Re-fetch session each loop iteration to catch state transitions.
          if (!session) {
            session = await openf1.getLatestSession({ revalidate: 0 }).catch(() => null);
            if (!session) {
              emit('heartbeat', { ts: Date.now() });
              await sleep(HEARTBEAT_MS_IDLE, abort);
              continue;
            }
          }

          const startMs = new Date(session.date_start).getTime();
          const endMs = new Date(session.date_end).getTime();
          const now = Date.now();
          const isLive = now >= startMs && now <= endMs + 60_000; // grace 1 min

          if (!isLive) {
            emit('heartbeat', { ts: Date.now() });
            await sleep(HEARTBEAT_MS_IDLE, abort);
            session = null; // re-poll session next loop
            continue;
          }

          // Live: parallel pull of the three hot streams.
          const [intervalsRaw, positionsRaw, rcRaw, weatherRaw] = await Promise.all([
            openf1.getIntervals(session.session_key, { revalidate: 0 }).catch(() => []),
            openf1.getPositions(session.session_key, { revalidate: 0 }).catch(() => []),
            openf1.getRaceControl(session.session_key, { revalidate: 0 }).catch(() => []),
            openf1.getWeather(session.session_key, { revalidate: 0 }).catch(() => []),
          ]);

          const intervals = intervalsRaw as IntervalSnap[];
          const positions = positionsRaw as PositionSnap[];

          if (intervals.length || positions.length) {
            emit('tower', { rows: buildTower(intervals, positions), ts: Date.now() });
          }

          // Only emit latest 3 RC messages per tick to avoid blasting the client
          // with the entire session backlog.
          if (Array.isArray(rcRaw) && rcRaw.length > 0) {
            const last = rcRaw.slice(-3);
            emit('race_control', { messages: last, ts: Date.now() });
          }

          if (Array.isArray(weatherRaw) && weatherRaw.length > 0) {
            const latest = weatherRaw[weatherRaw.length - 1];
            emit('weather', { ...latest, ts: Date.now() });
          }
        } catch (err) {
          emit('error', {
            message: err instanceof Error ? err.message : String(err),
            ts: Date.now(),
          });
        }

        await sleep(TICK_MS_LIVE, abort);
      }
    },
    cancel() {
      // No-op; abort handler in start() closes the controller.
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering for any reverse proxy
    },
  });
}

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}
