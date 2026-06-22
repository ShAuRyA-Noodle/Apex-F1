import type { OpenMeteoResponse, RaceWeather, OpenMeteoSource } from './types';

/**
 * Open-Meteo client. Free, no key, no rate limit (fair-use).
 *
 * Routing rules per the spec:
 *   - within next 14 days  → forecast endpoint
 *   - within last 5 years  → archive endpoint
 *   - older                → return null (Wikidata/other source picks up)
 *
 * We always return a RaceWeather slice (or null), never a partial.
 * Network failures collapse to null so calling UI can show empty state.
 */

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';

const HOURLY_VARS = [
  'temperature_2m',
  'precipitation',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_direction_10m',
  'weathercode',
].join(',');

const HOURLY_VARS_ARCHIVE = [
  'temperature_2m',
  'precipitation',
  'wind_speed_10m',
  'wind_direction_10m',
  'weathercode',
].join(',');

const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'weathercode',
].join(',');

const DAILY_VARS_ARCHIVE = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'wind_speed_10m_max',
  'weathercode',
].join(',');

export interface GetRaceWeatherInput {
  lat: number;
  lon: number;
  /** YYYY-MM-DD in the circuit's local day. */
  dateStart: string;
  /** YYYY-MM-DD in the circuit's local day. Inclusive. */
  dateEnd: string;
  /** Next.js ISR revalidate seconds. Defaults to 3600 (forecast) / 7d (archive). */
  revalidate?: number;
  /** Override fetch (testing). */
  fetchImpl?: typeof fetch;
}

/** Days between today (UTC) and the supplied YYYY-MM-DD. Negative = past. */
function daysFromToday(dateIso: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(`${dateIso}T00:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function pickSource(dateStart: string, dateEnd: string): OpenMeteoSource {
  const earliest = daysFromToday(dateStart);
  const latest = daysFromToday(dateEnd);
  // Forecast window: any portion within next 14 days AND not deep past.
  if (latest >= -1 && earliest <= 14) return 'forecast';
  // Archive window: within roughly last 5 years (1826 days). Open-Meteo archive
  // has a ~5 day publication lag — covered by the forecast branch above.
  if (latest >= -1826 && latest < -1) return 'archive';
  return 'none';
}

async function fetchOpenMeteo(
  url: URL,
  revalidate: number,
  fetchImpl: typeof fetch,
): Promise<OpenMeteoResponse | null> {
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate },
    } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as OpenMeteoResponse;
    if (json.error) return null;
    return json;
  } catch {
    return null;
  }
}

function normalize(raw: OpenMeteoResponse, source: OpenMeteoSource): RaceWeather {
  const h = raw.hourly;
  const d = raw.daily;
  return {
    source,
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    hourly: {
      time: h?.time ?? [],
      temperature_2m: h?.temperature_2m ?? [],
      precipitation: h?.precipitation ?? [],
      precipitation_probability: h?.precipitation_probability ?? [],
      wind_speed_10m: h?.wind_speed_10m ?? [],
      wind_direction_10m: h?.wind_direction_10m ?? [],
      weathercode: h?.weathercode ?? [],
    },
    daily: {
      time: d?.time ?? [],
      temperature_2m_max: d?.temperature_2m_max ?? [],
      temperature_2m_min: d?.temperature_2m_min ?? [],
      precipitation_sum: d?.precipitation_sum ?? [],
      precipitation_probability_max: d?.precipitation_probability_max ?? [],
      wind_speed_10m_max: d?.wind_speed_10m_max ?? [],
      weathercode: d?.weathercode ?? [],
    },
  };
}

export const openmeteo = {
  /**
   * Pull hourly + daily weather covering [dateStart, dateEnd] at the given lat/lon.
   * Returns null when the date is outside both forecast and archive windows,
   * or when the network/upstream fails — caller must handle null gracefully.
   */
  async getRaceWeather(input: GetRaceWeatherInput): Promise<RaceWeather | null> {
    const { lat, lon, dateStart, dateEnd, fetchImpl = fetch } = input;
    const source = pickSource(dateStart, dateEnd);
    if (source === 'none') return null;

    const isForecast = source === 'forecast';
    const base = isForecast ? FORECAST_BASE : ARCHIVE_BASE;
    const url = new URL(base);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('start_date', dateStart);
    url.searchParams.set('end_date', dateEnd);
    url.searchParams.set('hourly', isForecast ? HOURLY_VARS : HOURLY_VARS_ARCHIVE);
    url.searchParams.set('daily', isForecast ? DAILY_VARS : DAILY_VARS_ARCHIVE);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('wind_speed_unit', 'kmh');
    url.searchParams.set('temperature_unit', 'celsius');
    url.searchParams.set('precipitation_unit', 'mm');

    const revalidate =
      input.revalidate ?? (isForecast ? 3600 /* 1h */ : 604_800 /* 7d */);

    const raw = await fetchOpenMeteo(url, revalidate, fetchImpl);
    if (!raw) return null;
    return normalize(raw, source);
  },
};
