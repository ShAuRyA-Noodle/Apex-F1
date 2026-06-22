import {
  openmeteo,
  mapRaceWeather,
  bucketFromWeathercode,
  bucketIcon,
  bucketLabel,
  cardinalFromDeg,
  type UiRaceWeather,
  type SessionKind,
} from '@apex/api-client/openmeteo';
import { SessionWeatherIcon } from './SessionWeatherIcon';

/**
 * WeatherStrip — glass-subtle strip under circuit stats on /schedule/[season]/[race].
 *
 * Server component. Fails closed — if Open-Meteo returns nothing
 * (race outside forecast/archive window or network error), the strip
 * renders nothing so the page doesn't show a confusing empty box.
 *
 * Spec:
 *   - air temp range + track temp estimate (air + 8C heuristic)
 *   - rain icon if any precip expected
 *   - wind direction + speed
 *   - one-line summary
 *   - per-session chips for FP1/FP2/FP3/Q/S/SQ/R
 */

export interface WeatherStripProps {
  lat: number;
  lon: number;
  /** ISO of the race start — used to anchor the daily row. */
  raceStartIso: string;
  sessions: Array<{ kind: string; iso: string }>;
  /** Optional explicit date window override. Otherwise derived from sessions. */
  dateStart?: string;
  dateEnd?: string;
}

const KNOWN_KINDS: ReadonlySet<SessionKind> = new Set<SessionKind>([
  'FP1',
  'FP2',
  'FP3',
  'Q',
  'R',
  'S',
  'SQ',
]);

function sessionsToTyped(
  sessions: WeatherStripProps['sessions'],
): Array<{ kind: SessionKind; iso: string }> {
  const out: Array<{ kind: SessionKind; iso: string }> = [];
  for (const s of sessions) {
    if (KNOWN_KINDS.has(s.kind as SessionKind) && s.iso) {
      out.push({ kind: s.kind as SessionKind, iso: s.iso });
    }
  }
  return out;
}

function dateBounds(
  sessions: Array<{ iso: string }>,
  fallbackIso: string,
): { start: string; end: string } {
  const isos = sessions.map((s) => s.iso).filter(Boolean);
  if (isos.length === 0) {
    const d = fallbackIso.slice(0, 10);
    return { start: d, end: d };
  }
  const sorted = isos.slice().sort();
  return {
    start: sorted[0]!.slice(0, 10),
    end: sorted[sorted.length - 1]!.slice(0, 10),
  };
}

function sessionLabel(kind: SessionKind): string {
  return (
    {
      FP1: 'FP1',
      FP2: 'FP2',
      FP3: 'FP3',
      SQ: 'SPRINT Q',
      S: 'SPRINT',
      Q: 'QUALI',
      R: 'RACE',
    }[kind] ?? kind
  );
}

export async function WeatherStrip(props: WeatherStripProps) {
  const typedSessions = sessionsToTyped(props.sessions);
  const { start, end } =
    props.dateStart && props.dateEnd
      ? { start: props.dateStart, end: props.dateEnd }
      : dateBounds(typedSessions, props.raceStartIso);

  const raw = await openmeteo.getRaceWeather({
    lat: props.lat,
    lon: props.lon,
    dateStart: start,
    dateEnd: end,
    revalidate: 3600,
  });

  if (!raw) return null;

  const ui: UiRaceWeather = mapRaceWeather({
    weather: raw,
    sessions: typedSessions,
    raceStartIso: props.raceStartIso,
  });

  // Don't render if we got nothing usable.
  if (!ui.raceDay && ui.sessions.every((s) => s.peakAirTempC == null)) {
    return null;
  }

  const headlineBucket = bucketFromWeathercode(ui.raceDay?.weathercode ?? null);
  const lo = ui.raceDay?.minAirTempC;
  const hi = ui.raceDay?.maxAirTempC;
  const trackHi = hi != null ? Math.round(hi + 8) : null;
  const trackLo = lo != null ? Math.round(lo + 8) : null;
  const wind = ui.raceDay?.peakWindKph ?? null;
  // Dominant wind direction across all session windows.
  const dirs = ui.sessions
    .map((s) => s.windDirectionDeg)
    .filter((d): d is number => d != null);
  const dirAvg =
    dirs.length > 0 ? Math.round(dirs.reduce((a, b) => a + b, 0) / dirs.length) : null;

  return (
    <section
      data-component="weather-strip"
      className="border-b border-outline-variant/30"
      aria-label="Race weather forecast"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-10 md:px-grid-margin md:py-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-data text-telemetry-red">WEATHER</h2>
          <span className="text-data text-outline">
            SOURCE: OPEN-METEO · {ui.source.toUpperCase()}
          </span>
        </div>

        {/* Hero strip — glass-subtle */}
        <div className="glass-subtle relative overflow-hidden border border-outline-variant/30">
          <div className="grid grid-cols-1 gap-px bg-outline-variant/30 md:grid-cols-4">
            {/* Condition + summary */}
            <div className="flex items-center gap-4 bg-surface-container/40 p-5">
              <span
                aria-hidden
                className="material-symbols-outlined text-[44px] text-on-background"
              >
                {bucketIcon(headlineBucket)}
              </span>
              <div>
                <div className="text-data text-outline">
                  {bucketLabel(headlineBucket).toUpperCase()}
                </div>
                <p className="mt-1 font-headline text-base text-on-background md:text-lg">
                  {ui.summary}
                </p>
              </div>
            </div>

            {/* Air + track temp */}
            <div className="bg-surface-container/40 p-5">
              <div className="text-data text-outline">AIR / TRACK</div>
              <div className="mt-2 font-data text-2xl text-on-background md:text-3xl">
                {lo != null && hi != null
                  ? `${Math.round(lo)}-${Math.round(hi)}C`
                  : hi != null
                    ? `${Math.round(hi)}C`
                    : '—'}
              </div>
              <div className="mt-1 text-data text-on-surface-variant">
                {trackLo != null && trackHi != null
                  ? `TRACK EST ${trackLo}-${trackHi}C`
                  : trackHi != null
                    ? `TRACK EST ${trackHi}C`
                    : 'TRACK EST —'}
              </div>
            </div>

            {/* Precip */}
            <div className="bg-surface-container/40 p-5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`material-symbols-outlined text-[20px] ${
                    ui.risks.heavyRain || ui.risks.thunderstorm
                      ? 'text-telemetry-red'
                      : 'text-outline'
                  }`}
                >
                  rainy
                </span>
                <span className="text-data text-outline">PRECIPITATION</span>
              </div>
              <div className="mt-2 font-data text-2xl text-on-background md:text-3xl">
                {(ui.raceDay?.totalPrecipitationMm ?? 0).toFixed(1)}MM
              </div>
              <div className="mt-1 text-data text-on-surface-variant">
                {ui.risks.thunderstorm
                  ? 'THUNDERSTORM RISK'
                  : ui.risks.heavyRain
                    ? 'HEAVY RAIN EXPECTED'
                    : (ui.raceDay?.totalPrecipitationMm ?? 0) > 0
                      ? 'SHOWERS POSSIBLE'
                      : 'DRY'}
              </div>
            </div>

            {/* Wind */}
            <div className="bg-surface-container/40 p-5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`material-symbols-outlined text-[20px] ${
                    ui.risks.highWind ? 'text-telemetry-red' : 'text-outline'
                  }`}
                  style={dirAvg != null ? { transform: `rotate(${dirAvg}deg)` } : undefined}
                >
                  navigation
                </span>
                <span className="text-data text-outline">WIND</span>
              </div>
              <div className="mt-2 font-data text-2xl text-on-background md:text-3xl">
                {wind != null ? `${wind}KPH` : '—'}
              </div>
              <div className="mt-1 text-data text-on-surface-variant">
                FROM {cardinalFromDeg(dirAvg)}
                {ui.risks.highWind ? ' · HIGH WIND ALERT' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Per-session chips */}
        {ui.sessions.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-outline-variant/30 bg-outline-variant/30 md:grid-cols-4 lg:grid-cols-7">
            {ui.sessions.map((s) => {
              const bucket = bucketFromWeathercode(s.weathercode);
              return (
                <li key={s.kind} className="bg-surface-container/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-data text-outline">{sessionLabel(s.kind)}</span>
                    <SessionWeatherIcon weathercode={s.weathercode} size={18} />
                  </div>
                  <div className="mt-2 font-data text-base text-on-background">
                    {s.peakAirTempC != null ? `${Math.round(s.peakAirTempC)}C` : '—'}
                  </div>
                  <div className="text-data text-on-surface-variant">
                    {s.precipitationProbabilityPct != null
                      ? `${s.precipitationProbabilityPct}% RAIN`
                      : s.precipitationMm > 0
                        ? `${s.precipitationMm}MM`
                        : bucket === 'unknown'
                          ? '—'
                          : 'DRY'}
                    {s.peakWindKph != null ? ` · ${s.peakWindKph}KPH` : ''}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
