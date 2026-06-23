/**
 * Open-Meteo raw response types.
 *
 * Two endpoints in play:
 *   - Forecast:   https://api.open-meteo.com/v1/forecast
 *   - Archive:    https://archive-api.open-meteo.com/v1/archive
 *
 * No auth, no key, no rate limit (fair-use). Both endpoints return the same
 * envelope shape; only the variable availability differs slightly.
 *
 * We only ever ask for hourly + daily blocks. We do NOT use current_weather
 * because it is unreliable for archival queries.
 */

/** Raw forecast/archive envelope. Fields are present iff requested via query. */
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  /** Generation time in milliseconds · diagnostic, not used. */
  generationtime_ms?: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units?: OpenMeteoHourlyUnits;
  hourly?: OpenMeteoHourly;
  daily_units?: OpenMeteoDailyUnits;
  daily?: OpenMeteoDaily;
  error?: boolean;
  reason?: string;
}

export interface OpenMeteoHourlyUnits {
  time: string;
  temperature_2m: string;
  precipitation: string;
  precipitation_probability?: string;
  wind_speed_10m: string;
  wind_direction_10m: string;
  weathercode: string;
}

export interface OpenMeteoHourly {
  /** ISO timestamps in local time of the requested timezone. */
  time: string[];
  /** Celsius. */
  temperature_2m: number[];
  /** Millimetres. */
  precipitation: number[];
  /** Percent. Only available on forecast endpoint. */
  precipitation_probability?: number[];
  /** kph (we request km/h). */
  wind_speed_10m: number[];
  /** Degrees true. */
  wind_direction_10m: number[];
  /** WMO weather code (0-99). */
  weathercode: number[];
}

export interface OpenMeteoDailyUnits {
  time: string;
  temperature_2m_max: string;
  temperature_2m_min: string;
  precipitation_sum: string;
  precipitation_probability_max?: string;
  wind_speed_10m_max: string;
  weathercode: string;
}

export interface OpenMeteoDaily {
  /** YYYY-MM-DD in requested timezone. */
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max?: number[];
  wind_speed_10m_max: number[];
  weathercode: number[];
}

/** Which Open-Meteo backend we hit for a given query. */
export type OpenMeteoSource = 'forecast' | 'archive' | 'none';

/**
 * Trimmed shape returned by client.getRaceWeather().
 * Includes only the slices we actually use downstream.
 */
export interface RaceWeather {
  source: OpenMeteoSource;
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    /** Percent (0-100). Forecast only; archive yields []. */
    precipitation_probability: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    weathercode: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    /** Percent (0-100). Forecast only; archive yields []. */
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    weathercode: number[];
  };
}
