// OpenF1 client. Live + recent session data.
// Docs: https://openf1.org/

const BASE = 'https://api.openf1.org/v1';

type FetchOpts = { revalidate?: number };

async function get<T>(path: string, params: Record<string, string | number> = {}, opts: FetchOpts = {}): Promise<T> {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
    } as RequestInit);
    if (!res.ok) {
      // OpenF1 rate-limits aggressively (429) and occasionally returns 5xx
      // mid-session. Return an empty result rather than throwing so a single
      // brownout doesn't take a page down. Callers default-fall through to
      // their "no data" empty state.
      // eslint-disable-next-line no-console
      console.warn(`[openf1] ${res.status} ${res.statusText} ${url.toString()}`);
      return ([] as unknown) as T;
    }
    return (await res.json()) as T;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[openf1] network error for ${url.toString()}: ${err instanceof Error ? err.message : String(err)}`);
    return ([] as unknown) as T;
  }
}

export interface OpenF1Session {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
  country_name: string;
  location: string;
  gmt_offset: string;
  year: number;
  is_cancelled?: boolean;
}

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  country_code: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  year: number;
  gmt_offset: string;
}

export interface OpenF1Driver {
  session_key: number;
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  country_code: string;
  headshot_url?: string;
}

export interface OpenF1Interval {
  session_key: number;
  driver_number: number;
  gap_to_leader?: number | string;
  interval?: number | string;
  date: string;
}

export interface OpenF1Position {
  session_key: number;
  driver_number: number;
  position: number;
  date: string;
}

export interface OpenF1Location {
  session_key: number;
  driver_number: number;
  x: number;
  y: number;
  z: number;
  date: string;
}

export interface OpenF1Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration?: number;
  duration_sector_1?: number;
  duration_sector_2?: number;
  duration_sector_3?: number;
  date_start: string;
  is_pit_out_lap?: boolean;
}

export interface OpenF1Stint {
  session_key: number;
  driver_number: number;
  stint_number: number;
  compound: 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | 'UNKNOWN';
  lap_start: number;
  lap_end: number;
  tyre_age_at_start: number;
}

export interface OpenF1RaceControlMessage {
  session_key: number;
  date: string;
  category: string;
  flag?: string;
  message: string;
  driver_number?: number;
  lap_number?: number;
  sector?: number;
  scope?: string;
}

export interface OpenF1Weather {
  session_key: number;
  date: string;
  air_temperature?: number;
  track_temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: number;
  rainfall?: number;
}

export interface OpenF1Pit {
  session_key: number;
  driver_number: number;
  lap_number: number;
  date: string;
  pit_duration?: number;
}

export const openf1 = {
  async getLatestSession(opts: FetchOpts = {}) {
    const res = await get<OpenF1Session[]>('sessions', { session_key: 'latest' }, { revalidate: 30, ...opts });
    return res[0] ?? null;
  },

  async getSession(sessionKey: number | 'latest', opts: FetchOpts = {}) {
    const res = await get<OpenF1Session[]>('sessions', { session_key: sessionKey }, { revalidate: 30, ...opts });
    return res[0] ?? null;
  },

  async getSessionsForMeeting(meetingKey: number, opts: FetchOpts = {}) {
    return get<OpenF1Session[]>('sessions', { meeting_key: meetingKey }, { revalidate: 60, ...opts });
  },

  async getLatestMeeting(opts: FetchOpts = {}) {
    const res = await get<OpenF1Meeting[]>('meetings', { meeting_key: 'latest' }, { revalidate: 60, ...opts });
    return res[0] ?? null;
  },

  async getDrivers(sessionKey: number, opts: FetchOpts = {}) {
    return get<OpenF1Driver[]>('drivers', { session_key: sessionKey }, { revalidate: 60, ...opts });
  },

  async getIntervals(sessionKey: number, opts: FetchOpts = {}) {
    return get<OpenF1Interval[]>('intervals', { session_key: sessionKey }, { revalidate: 5, ...opts });
  },

  async getPositions(sessionKey: number, opts: FetchOpts = {}) {
    return get<OpenF1Position[]>('position', { session_key: sessionKey }, { revalidate: 5, ...opts });
  },

  /**
   * GPS location samples (x, y) for cars. Heavy endpoint, so always bound it with
   * a date window. Used to trace the circuit outline (one driver, ~90s lap) and
   * plot position dots (all drivers, last few seconds). Returns [] on error.
   */
  async getLocation(
    sessionKey: number,
    opts: {
      driverNumber?: number;
      dateGte?: string;
      dateLte?: string;
      revalidate?: number;
      fetchImpl?: typeof fetch;
    } = {},
  ): Promise<OpenF1Location[]> {
    const parts = [`session_key=${sessionKey}`];
    if (opts.driverNumber != null) parts.push(`driver_number=${opts.driverNumber}`);
    if (opts.dateGte) parts.push(`date>=${encodeURIComponent(opts.dateGte)}`);
    if (opts.dateLte) parts.push(`date<=${encodeURIComponent(opts.dateLte)}`);
    const url = `${BASE}/location?${parts.join('&')}`;
    const fetchImpl = opts.fetchImpl ?? fetch;
    try {
      const res = await fetchImpl(url, {
        next: opts.revalidate != null ? { revalidate: opts.revalidate } : undefined,
      } as RequestInit);
      if (!res.ok) return [];
      return (await res.json()) as OpenF1Location[];
    } catch {
      return [];
    }
  },

  async getLaps(sessionKey: number, opts: FetchOpts = {}) {
    return get<OpenF1Lap[]>('laps', { session_key: sessionKey }, { revalidate: 15, ...opts });
  },

  async getStints(sessionKey: number, opts: FetchOpts = {}) {
    return get<OpenF1Stint[]>('stints', { session_key: sessionKey }, { revalidate: 60, ...opts });
  },

  async getRaceControl(sessionKey: number, opts: FetchOpts = {}) {
    return get<OpenF1RaceControlMessage[]>('race_control', { session_key: sessionKey }, {
      revalidate: 15,
      ...opts,
    });
  },

  async getWeather(sessionKey: number, opts: FetchOpts = {}) {
    return get<OpenF1Weather[]>('weather', { session_key: sessionKey }, { revalidate: 60, ...opts });
  },

  async getPits(sessionKey: number, opts: FetchOpts = {}) {
    return get<OpenF1Pit[]>('pit', { session_key: sessionKey }, { revalidate: 30, ...opts });
  },
};
