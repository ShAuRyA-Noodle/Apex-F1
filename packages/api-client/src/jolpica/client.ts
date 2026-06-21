import type {
  JolpicaEnvelope,
  JolpicaRaceTableEnvelope,
  JolpicaDriverStandingsEnvelope,
  JolpicaConstructorStandingsEnvelope,
  JolpicaDriverListEnvelope,
  JolpicaConstructorListEnvelope,
  JolpicaResultsEnvelope,
} from './types';

const BASE = 'https://api.jolpi.ca/ergast/f1';

type FetchOpts = {
  /** Next.js ISR revalidate seconds. */
  revalidate?: number;
  /** Override fetch (for testing). */
  fetchImpl?: typeof fetch;
  /** Pagination */
  limit?: number;
  offset?: number;
};

async function get<T>(path: string, opts: FetchOpts = {}): Promise<JolpicaEnvelope<T>> {
  const url = new URL(`${BASE}/${path}`);
  if (opts.limit !== undefined) url.searchParams.set('limit', String(opts.limit));
  if (opts.offset !== undefined) url.searchParams.set('offset', String(opts.offset));

  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(url.toString(), {
    headers: { Accept: 'application/json' },
    next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
  } as RequestInit);

  if (!res.ok) {
    throw new Error(`Jolpica ${res.status} ${res.statusText} for ${url.toString()}`);
  }
  return (await res.json()) as JolpicaEnvelope<T>;
}

export const jolpica = {
  /** Race schedule for a given season (or current if omitted). */
  async getSchedule(season: number | 'current' = 'current', opts: FetchOpts = {}) {
    const env = await get<JolpicaRaceTableEnvelope>(`${season}.json`, {
      revalidate: 3600,
      limit: 100,
      ...opts,
    });
    return env.MRData.RaceTable.Races;
  },

  /** Driver standings for a season. */
  async getDriverStandings(season: number | 'current' = 'current', opts: FetchOpts = {}) {
    const env = await get<JolpicaDriverStandingsEnvelope>(`${season}/driverStandings.json`, {
      revalidate: 300,
      ...opts,
    });
    return env.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  },

  /** Constructor standings for a season. */
  async getConstructorStandings(season: number | 'current' = 'current', opts: FetchOpts = {}) {
    const env = await get<JolpicaConstructorStandingsEnvelope>(
      `${season}/constructorStandings.json`,
      { revalidate: 300, ...opts },
    );
    return env.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
  },

  /** Drivers for a season. */
  async getDrivers(season: number | 'current' = 'current', opts: FetchOpts = {}) {
    const env = await get<JolpicaDriverListEnvelope>(`${season}/drivers.json`, {
      revalidate: 3600,
      limit: 100,
      ...opts,
    });
    return env.MRData.DriverTable.Drivers;
  },

  /** Single driver (any era). */
  async getDriver(driverId: string, opts: FetchOpts = {}) {
    const env = await get<JolpicaDriverListEnvelope>(`drivers/${driverId}.json`, {
      revalidate: 86400,
      ...opts,
    });
    return env.MRData.DriverTable.Drivers[0] ?? null;
  },

  /** Constructors for a season. */
  async getConstructors(season: number | 'current' = 'current', opts: FetchOpts = {}) {
    const env = await get<JolpicaConstructorListEnvelope>(`${season}/constructors.json`, {
      revalidate: 3600,
      limit: 100,
      ...opts,
    });
    return env.MRData.ConstructorTable.Constructors;
  },

  /** Single constructor. */
  async getConstructor(constructorId: string, opts: FetchOpts = {}) {
    const env = await get<JolpicaConstructorListEnvelope>(`constructors/${constructorId}.json`, {
      revalidate: 86400,
      ...opts,
    });
    return env.MRData.ConstructorTable.Constructors[0] ?? null;
  },

  /** Race results for a single round of a season. */
  async getRaceResults(season: number, round: number, opts: FetchOpts = {}) {
    const env = await get<JolpicaResultsEnvelope>(`${season}/${round}/results.json`, {
      revalidate: 300,
      ...opts,
    });
    const race = env.MRData.RaceTable.Races[0];
    return race ? { race, results: race.Results } : null;
  },

  /** Season-wide race results (used to compute driver/team season detail). */
  async getSeasonResults(season: number, opts: FetchOpts = {}) {
    const env = await get<JolpicaResultsEnvelope>(`${season}/results.json`, {
      revalidate: 3600,
      limit: 1000,
      ...opts,
    });
    return env.MRData.RaceTable.Races;
  },

  /** All race results for a single driver across all seasons. */
  async getDriverResults(driverId: string, opts: FetchOpts = {}) {
    const env = await get<JolpicaResultsEnvelope>(`drivers/${driverId}/results.json`, {
      revalidate: 3600,
      limit: 1000,
      ...opts,
    });
    return env.MRData.RaceTable.Races;
  },

  /** All race results for a single driver in a single season. */
  async getDriverResultsInSeason(driverId: string, season: number, opts: FetchOpts = {}) {
    const env = await get<JolpicaResultsEnvelope>(`${season}/drivers/${driverId}/results.json`, {
      revalidate: 3600,
      limit: 100,
      ...opts,
    });
    return env.MRData.RaceTable.Races;
  },

  /** All race results for a constructor in a season. */
  async getConstructorResultsInSeason(constructorId: string, season: number, opts: FetchOpts = {}) {
    const env = await get<JolpicaResultsEnvelope>(
      `${season}/constructors/${constructorId}/results.json`,
      { revalidate: 3600, limit: 100, ...opts },
    );
    return env.MRData.RaceTable.Races;
  },

  /** All seasons a driver participated in (for career timeline). */
  async getDriverSeasons(driverId: string, opts: FetchOpts = {}) {
    const env = await get<{ SeasonTable: { Seasons: Array<{ season: string; url: string }> } }>(
      `drivers/${driverId}/seasons.json`,
      { revalidate: 86400, limit: 100, ...opts },
    );
    return env.MRData.SeasonTable.Seasons.map((s) => Number(s.season)).filter((y) => Number.isFinite(y));
  },

  /** All seasons (1950 → present). */
  async getSeasons(opts: FetchOpts = {}) {
    const env = await get<{ SeasonTable: { Seasons: Array<{ season: string; url: string }> } }>(
      'seasons.json',
      { revalidate: 86400, limit: 100, ...opts },
    );
    return env.MRData.SeasonTable.Seasons;
  },
};
