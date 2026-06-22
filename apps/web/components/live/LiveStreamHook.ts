'use client';

import { useEffect, useRef, useState } from 'react';

export type LiveSessionState =
  | { state: 'no_session' }
  | {
      state: 'live' | 'upcoming' | 'completed';
      session_key: number;
      location: string;
      session_name: string;
      date_start: string;
      date_end: string;
    };

export interface LiveTowerRow {
  driver: number;
  pos: number;
  gap?: number | string;
  interval?: number | string;
}

export interface LiveTower {
  rows: LiveTowerRow[];
  ts: number;
}

export interface LiveRaceControlMsg {
  date: string;
  category: string;
  flag?: string;
  message: string;
  driver_number?: number;
  lap_number?: number;
  sector?: number;
  scope?: string;
}

export interface LiveRaceControl {
  messages: LiveRaceControlMsg[];
  ts: number;
}

export interface LiveWeather {
  air_temperature?: number;
  track_temperature?: number;
  rainfall?: number;
  humidity?: number;
  wind_speed?: number;
  ts: number;
}

export interface LiveStreamSnapshot {
  /** Connection state of the SSE stream. */
  connection: 'connecting' | 'open' | 'reconnecting' | 'closed';
  /** Last-known session metadata. */
  session: LiveSessionState | null;
  /** Latest timing tower snapshot. */
  tower: LiveTower | null;
  /** Latest race-control window (last 3 messages). */
  raceControl: LiveRaceControl | null;
  /** Latest weather sample. */
  weather: LiveWeather | null;
  /** Last error frame, if any. */
  lastError: string | null;
  /** Server-emit timestamp of the last frame received. */
  lastFrameAt: number | null;
}

const INITIAL: LiveStreamSnapshot = {
  connection: 'connecting',
  session: null,
  tower: null,
  raceControl: null,
  weather: null,
  lastError: null,
  lastFrameAt: null,
};

/**
 * Subscribe to /api/live/stream via EventSource.
 *
 * The server multiplexes named events: `connected`, `session_state`, `tower`,
 * `race_control`, `weather`, `heartbeat`, `error`. We fan them out into a
 * single snapshot object so the consuming component renders one source of
 * truth without re-subscribing per channel.
 *
 * EventSource auto-reconnects on transport errors with browser-managed
 * backoff. We mirror that into the snapshot via `connection` so the UI can
 * show a "reconnecting" pill.
 */
export function useLiveStream(): LiveStreamSnapshot {
  const [snap, setSnap] = useState<LiveStreamSnapshot>(INITIAL);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof EventSource === 'undefined') return;

    const es = new EventSource('/api/live/stream');
    esRef.current = es;

    const onOpen = () =>
      setSnap((s) => ({ ...s, connection: 'open' }));
    const onError = () =>
      setSnap((s) => ({
        ...s,
        connection: es.readyState === EventSource.CLOSED ? 'closed' : 'reconnecting',
      }));

    es.addEventListener('open', onOpen);
    es.addEventListener('error', onError);

    es.addEventListener('connected', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setSnap((s) => ({ ...s, connection: 'open', lastFrameAt: data.ts }));
      } catch { /* ignore */ }
    });

    es.addEventListener('session_state', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as LiveSessionState;
        setSnap((s) => ({ ...s, session: data }));
      } catch { /* ignore */ }
    });

    es.addEventListener('tower', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as LiveTower;
        setSnap((s) => ({ ...s, tower: data, lastFrameAt: data.ts }));
      } catch { /* ignore */ }
    });

    es.addEventListener('race_control', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as LiveRaceControl;
        setSnap((s) => ({ ...s, raceControl: data, lastFrameAt: data.ts }));
      } catch { /* ignore */ }
    });

    es.addEventListener('weather', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as LiveWeather;
        setSnap((s) => ({ ...s, weather: data, lastFrameAt: data.ts }));
      } catch { /* ignore */ }
    });

    es.addEventListener('heartbeat', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setSnap((s) => ({ ...s, lastFrameAt: data.ts }));
      } catch { /* ignore */ }
    });

    es.addEventListener('error', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setSnap((s) => ({ ...s, lastError: data.message ?? null }));
      } catch { /* ignore */ }
    });

    return () => {
      es.close();
      esRef.current = null;
      setSnap((s) => ({ ...s, connection: 'closed' }));
    };
  }, []);

  return snap;
}
