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

const MAX_RETRIES = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Universal empty Jolpica envelope. Every public method reads exactly one table
 * and falls back via `?? []` / `?? null`, so an all-empty envelope degrades any
 * caller to an empty result instead of throwing. Used when the API is
 * unreachable or rate-limited (notably build-time prerender bursts hitting 429).
 */
function emptyEnvelope<T>(): JolpicaEnvelope<T> {
  return {
    MRData: {
      RaceTable: { Races: [] },
      StandingsTable: { StandingsLists: [] },
      DriverTable: { Drivers: [] },
      ConstructorTable: { Constructors: [] },
      SeasonTable: { Seasons: [] },
    },
  } as unknown as JolpicaEnvelope<T>;
}

async function get<T>(path: string, opts: FetchOpts = {}): Promise<JolpicaEnvelope<T>> {
  const url = new URL(`${BASE}/${path}`);
  if (opts.limit !== undefined) url.searchParams.set('limit', String(opts.limit));
  if (opts.offset !== undefined) url.searchParams.set('offset', String(opts.offset));

  const fetchImpl = opts.fetchImpl ?? fetch;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchImpl(url.toString(), {
        headers: { Accept: 'application/json' },
        next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
      } as RequestInit);

      // 429 / 5xx are transient · back off and retry, then degrade to empty.
      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_RETRIES) {
          await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 250));
          continue;
        }
        return emptyEnvelope<T>();
      }
      // Other non-2xx (e.g. unknown driver slug) · degrade, never kill the build.
      if (!res.ok) return emptyEnvelope<T>();

      return (await res.json()) as JolpicaEnvelope<T>;
    } catch {
      if (attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 250));
        continue;
      }
      return emptyEnvelope<T>();
    }
  }
  return emptyEnvelope<T>();
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

  /** Every driver in F1 history (1950 - present). Jolpica caps a page at 100, so
   *  this pages through all ~880 sequentially. Cached 24h; powers all-era search. */
  async getAllDrivers(opts: FetchOpts = {}) {
    const PAGE = 100;
    const first = await get<JolpicaDriverListEnvelope>('drivers.json', {
      revalidate: 86400,
      limit: PAGE,
      offset: 0,
      ...opts,
    });
    const all = [...first.MRData.DriverTable.Drivers];
    const total = Number((first.MRData as { total?: string }).total) || all.length;
    for (let offset = PAGE; offset < total && offset < 1200; offset += PAGE) {
      const env = await get<JolpicaDriverListEnvelope>('drivers.json', {
        revalidate: 86400,
        limit: PAGE,
        offset,
        ...opts,
      });
      all.push(...env.MRData.DriverTable.Drivers);
    }
    return all;
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
    // Jolpica caps a page at 100 results. A long career (Hamilton ~360 races)
    // would otherwise return only the oldest 100, dropping every recent win.
    // Page through the lot so win/podium tallies are correct everywhere.
    const PAGE = 100;
    const first = await get<JolpicaResultsEnvelope>(`drivers/${driverId}/results.json`, {
      revalidate: 3600,
      limit: PAGE,
      offset: 0,
      ...opts,
    });
    const races = [...first.MRData.RaceTable.Races];
    const total = Number((first.MRData as { total?: string }).total) || races.length;
    for (let offset = PAGE; offset < total && offset < 1200; offset += PAGE) {
      const env = await get<JolpicaResultsEnvelope>(`drivers/${driverId}/results.json`, {
        revalidate: 3600,
        limit: PAGE,
        offset,
        ...opts,
      });
      races.push(...env.MRData.RaceTable.Races);
    }
    return races;
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
