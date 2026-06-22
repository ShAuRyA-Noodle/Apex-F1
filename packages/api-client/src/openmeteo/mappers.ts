import type { RaceWeather } from './types';

/**
 * UI-facing weather shapes.
 *
 * We never ship raw hourly arrays to the client. The mapper collapses
 * them to per-session peaks + a race-day cumulative + risk flags.
 *
 * Track temp heuristic: ambient + 8 C. Crude, but good enough for a
 * pre-race strip. Actual track temp diverges with sun angle, asphalt age,
 * cloud cover etc — we'll improve later if Open-Meteo adds surface_temp.
 */

export type SessionKind = 'FP1' | 'FP2' | 'FP3' | 'Q' | 'R' | 'S' | 'SQ';

export interface UiSessionWeather {
  kind: SessionKind;
  /** ISO start of the session (passed in by caller). */
  iso: string;
  /** Peak air temp (C) across the session window. null if no data. */
  peakAirTempC: number | null;
  /** Heuristic peak track temp (C) = peakAirTempC + 8. null if no data. */
  peakTrackTempC: number | null;
  /** 0-100. Forecast only; null on archive or no data. */
  precipitationProbabilityPct: number | null;
  /** Sum of precipitation across session window (mm). */
  precipitationMm: number;
  /** Peak wind (km/h). */
  peakWindKph: number | null;
  /** Dominant wind direction (deg true). null if no data. */
  windDirectionDeg: number | null;
  /** Dominant WMO weather code over the session window. */
  weathercode: number | null;
}

export interface UiRaceDayWeather {
  /** YYYY-MM-DD local. */
  date: string;
  maxAirTempC: number | null;
  minAirTempC: number | null;
  totalPrecipitationMm: number;
  peakWindKph: number | null;
  weathercode: number | null;
}

export interface UiWeatherRisks {
  heavyRain: boolean;
  extremeHeat: boolean;
  highWind: boolean;
  thunderstorm: boolean;
}

export interface UiRaceWeather {
  source: RaceWeather['source'];
  sessions: UiSessionWeather[];
  raceDay: UiRaceDayWeather | null;
  risks: UiWeatherRisks;
  /** One-line human summary, e.g. "Dry, hot, 28-34C, light wind". */
  summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WMO weathercode → bucket. Per spec:
//   0      clear
//   1      mainly clear
//   2      partly cloudy
//   3      overcast
//   45/48  fog
//   51-67  rain (drizzle + rain)
//   71-77  snow
//   95-99  thunderstorm
// ─────────────────────────────────────────────────────────────────────────────

export type WeatherBucket =
  | 'clear'
  | 'mainly_clear'
  | 'partly_cloudy'
  | 'overcast'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'unknown';

export function bucketFromWeathercode(code: number | null | undefined): WeatherBucket {
  if (code == null) return 'unknown';
  if (code === 0) return 'clear';
  if (code === 1) return 'mainly_clear';
  if (code === 2) return 'partly_cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  // 80-82 = rain showers, 85-86 = snow showers — fold into rain/snow.
  if (code >= 80 && code <= 82) return 'rain';
  if (code === 85 || code === 86) return 'snow';
  return 'unknown';
}

/** Pretty short label for a bucket. */
export function bucketLabel(b: WeatherBucket): string {
  switch (b) {
    case 'clear':
      return 'Clear';
    case 'mainly_clear':
      return 'Mainly clear';
    case 'partly_cloudy':
      return 'Partly cloudy';
    case 'overcast':
      return 'Overcast';
    case 'fog':
      return 'Fog';
    case 'rain':
      return 'Rain';
    case 'snow':
      return 'Snow';
    case 'thunderstorm':
      return 'Thunderstorm';
    default:
      return 'Unknown';
  }
}

/** Material Symbols icon name per bucket. */
export function bucketIcon(b: WeatherBucket): string {
  switch (b) {
    case 'clear':
      return 'wb_sunny';
    case 'mainly_clear':
      return 'partly_cloudy_day';
    case 'partly_cloudy':
      return 'partly_cloudy_day';
    case 'overcast':
      return 'cloud';
    case 'fog':
      return 'foggy';
    case 'rain':
      return 'rainy';
    case 'snow':
      return 'weather_snowy';
    case 'thunderstorm':
      return 'thunderstorm';
    default:
      return 'cloud';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — pure, side-effect free.
// ─────────────────────────────────────────────────────────────────────────────

/** Pick all hourly indices that fall within the [start, start+3h] window. */
function indicesForSession(
  hourlyTime: string[],
  sessionIso: string,
): number[] {
  if (!sessionIso) return [];
  const start = new Date(sessionIso).getTime();
  if (!Number.isFinite(start)) return [];
  // Sessions span ≤2h normally; we widen to 3h to catch overrun + alignment.
  const end = start + 3 * 60 * 60 * 1000;
  const out: number[] = [];
  for (let i = 0; i < hourlyTime.length; i++) {
    const ts = hourlyTime[i];
    if (!ts) continue;
    const t = new Date(ts).getTime();
    // Hourly timestamps are local-naive (no Z) — we treat them as UTC offset
    // already applied by Open-Meteo ("timezone=auto"). Aligning by wall-clock
    // hour is acceptable because all session ISOs are stored UTC and the
    // delta is consistent within the same response.
    if (Number.isFinite(t) && t >= start - 60 * 60 * 1000 && t <= end) {
      out.push(i);
    }
  }
  return out;
}

function max(xs: number[]): number | null {
  if (xs.length === 0) return null;
  let m = xs[0]!;
  for (let i = 1; i < xs.length; i++) {
    const v = xs[i]!;
    if (v > m) m = v;
  }
  return m;
}

function sum(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

/** Most common value, ties broken by first occurrence. */
function mode(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const counts = new Map<number, number>();
  let best = xs[0]!;
  let bestN = 0;
  for (const x of xs) {
    const n = (counts.get(x) ?? 0) + 1;
    counts.set(x, n);
    if (n > bestN) {
      bestN = n;
      best = x;
    }
  }
  return best;
}

function pick<T>(arr: T[], idxs: number[]): T[] {
  const out: T[] = [];
  for (const i of idxs) {
    const v = arr[i];
    if (v !== undefined) out.push(v);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main mapper.
// ─────────────────────────────────────────────────────────────────────────────

export interface MapRaceWeatherInput {
  weather: RaceWeather;
  /** Sessions ordered as caller sees them. */
  sessions: Array<{ kind: SessionKind; iso: string }>;
  /** ISO of the race start — used to lock onto the daily row. */
  raceStartIso: string;
}

export function mapRaceWeather(input: MapRaceWeatherInput): UiRaceWeather {
  const { weather, sessions, raceStartIso } = input;

  // ── Per-session collapse ────────────────────────────────────────────────
  const uiSessions: UiSessionWeather[] = sessions.map((s) => {
    const idxs = indicesForSession(weather.hourly.time, s.iso);
    const peakAir = max(pick(weather.hourly.temperature_2m, idxs));
    const precip = sum(pick(weather.hourly.precipitation, idxs));
    const probArr = pick(weather.hourly.precipitation_probability, idxs);
    const peakWind = max(pick(weather.hourly.wind_speed_10m, idxs));
    const dirArr = pick(weather.hourly.wind_direction_10m, idxs);
    const codeArr = pick(weather.hourly.weathercode, idxs);

    return {
      kind: s.kind,
      iso: s.iso,
      peakAirTempC: peakAir,
      peakTrackTempC: peakAir == null ? null : Math.round(peakAir + 8),
      precipitationProbabilityPct: probArr.length > 0 ? max(probArr) : null,
      precipitationMm: Math.round(precip * 10) / 10,
      peakWindKph: peakWind == null ? null : Math.round(peakWind),
      windDirectionDeg: dirArr.length > 0 ? Math.round(mode(dirArr) ?? 0) : null,
      weathercode: mode(codeArr),
    };
  });

  // ── Race-day cumulative ─────────────────────────────────────────────────
  const raceDate = raceStartIso.slice(0, 10);
  const dailyIdx = weather.daily.time.indexOf(raceDate);
  let raceDay: UiRaceDayWeather | null = null;
  if (dailyIdx >= 0) {
    raceDay = {
      date: raceDate,
      maxAirTempC: weather.daily.temperature_2m_max[dailyIdx] ?? null,
      minAirTempC: weather.daily.temperature_2m_min[dailyIdx] ?? null,
      totalPrecipitationMm:
        Math.round((weather.daily.precipitation_sum[dailyIdx] ?? 0) * 10) / 10,
      peakWindKph: weather.daily.wind_speed_10m_max[dailyIdx] != null
        ? Math.round(weather.daily.wind_speed_10m_max[dailyIdx]!)
        : null,
      weathercode: weather.daily.weathercode[dailyIdx] ?? null,
    };
  }

  // ── Risk flags ──────────────────────────────────────────────────────────
  // Thresholds chosen to be conservative — false positives are cheap, false
  // negatives lose us the headline. F1 calls heavy rain anywhere >2mm/h.
  const heavyRain =
    (raceDay?.totalPrecipitationMm ?? 0) >= 5 ||
    uiSessions.some((s) => s.precipitationMm >= 2 || (s.precipitationProbabilityPct ?? 0) >= 70);
  const extremeHeat = (raceDay?.maxAirTempC ?? -Infinity) >= 32;
  const highWind =
    (raceDay?.peakWindKph ?? 0) >= 30 ||
    uiSessions.some((s) => (s.peakWindKph ?? 0) >= 35);
  const thunderstorm =
    bucketFromWeathercode(raceDay?.weathercode ?? null) === 'thunderstorm' ||
    uiSessions.some((s) => bucketFromWeathercode(s.weathercode) === 'thunderstorm');

  // ── Summary line ────────────────────────────────────────────────────────
  const summary = buildSummary({ raceDay, uiSessions, risks: { heavyRain, extremeHeat, highWind, thunderstorm } });

  return {
    source: weather.source,
    sessions: uiSessions,
    raceDay,
    risks: { heavyRain, extremeHeat, highWind, thunderstorm },
    summary,
  };
}

function buildSummary(args: {
  raceDay: UiRaceDayWeather | null;
  uiSessions: UiSessionWeather[];
  risks: UiWeatherRisks;
}): string {
  const { raceDay, uiSessions, risks } = args;

  // Pick the race session if present, else the last session.
  const headline =
    uiSessions.find((s) => s.kind === 'R') ?? uiSessions[uiSessions.length - 1] ?? null;

  // Headline weather condition.
  let lede: string;
  if (risks.thunderstorm) lede = 'Thunderstorm risk';
  else if (risks.heavyRain) lede = 'Heavy rain risk';
  else if (raceDay && bucketFromWeathercode(raceDay.weathercode) === 'rain') lede = 'Showers possible';
  else if (raceDay && bucketFromWeathercode(raceDay.weathercode) === 'overcast') lede = 'Overcast';
  else if (raceDay && bucketFromWeathercode(raceDay.weathercode) === 'fog') lede = 'Fog';
  else if (risks.extremeHeat) lede = 'Dry, hot';
  else lede = 'Dry';

  // Temp band.
  const lo = raceDay?.minAirTempC;
  const hi = raceDay?.maxAirTempC;
  const tempPart =
    lo != null && hi != null
      ? `${Math.round(lo)}-${Math.round(hi)}C`
      : hi != null
        ? `${Math.round(hi)}C`
        : headline?.peakAirTempC != null
          ? `${Math.round(headline.peakAirTempC)}C`
          : null;

  // Wind band.
  const wind = raceDay?.peakWindKph ?? headline?.peakWindKph ?? null;
  let windPart: string | null = null;
  if (wind != null) {
    const label = wind >= 35 ? 'gusting wind' : wind >= 20 ? 'breezy' : 'light wind';
    windPart = `${label} ${wind}kph`;
  }

  return [lede, tempPart, windPart].filter((x): x is string => Boolean(x)).join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: cardinal direction from degrees (used by WeatherStrip).
// ─────────────────────────────────────────────────────────────────────────────

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export function cardinalFromDeg(deg: number | null): string {
  if (deg == null || !Number.isFinite(deg)) return '—';
  const i = Math.round(((deg % 360) / 45)) % 8;
  return CARDINALS[i] ?? 'N';
}
