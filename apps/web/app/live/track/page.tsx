import type { Metadata } from 'next';
import Link from 'next/link';
import { openf1 } from '@apex/api-client/openf1';
import { countryNameToCode, flagEmoji } from '@/lib/format';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Live track',
  description: 'Current Formula 1 session · circuit, weather, conditions.',
};

const COMPOUND_COLOR: Record<string, string> = {
  SOFT: '#FF3333',
  MEDIUM: '#FFE600',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#00C853',
  WET: '#0091EA',
};

export default async function LiveTrackPage() {
  const session = await openf1.getLatestSession({ revalidate: 30 });
  if (!session) {
    return (
      <article className="mx-auto w-full max-w-[1600px] px-4 py-32 md:px-grid-margin">
        <h1 className="font-display text-5xl uppercase tracking-tight text-on-background">
          Live track
        </h1>
        <p className="mt-6 font-editorial text-xl text-on-surface-variant">
          No active session.
        </p>
      </article>
    );
  }

  const [drivers, stints, weather] = await Promise.all([
    openf1.getDrivers(session.session_key, { revalidate: 60 }),
    openf1.getStints(session.session_key, { revalidate: 60 }),
    openf1.getWeather(session.session_key, { revalidate: 60 }),
  ]);

  const latestWeather = weather[weather.length - 1];
  const cc = countryNameToCode(session.country_name);
  const isLive =
    Date.now() >= new Date(session.date_start).getTime() &&
    Date.now() <= new Date(session.date_end).getTime();

  const tyreCounts = stints.reduce<Record<string, number>>((acc, s) => {
    if (!s.compound) return acc;
    acc[s.compound] = (acc[s.compound] || 0) + 1;
    return acc;
  }, {});

  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin md:py-16">
          <Link
            href="/live/timing"
            className="text-data inline-flex items-center gap-1 text-outline transition-colors hover:text-on-background"
          >
            ← TIMING TOWER
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <span className={`text-data ${isLive ? 'text-telemetry-red' : 'text-outline'}`}>
              {isLive ? '● LIVE' : 'SESSION'}
            </span>
            <span className="h-px w-8 bg-outline" />
            <span className="text-data text-outline">
              {flagEmoji(cc)} {session.country_name} · {session.session_name}
            </span>
          </div>
          <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            {session.location}
          </h1>
        </div>
      </header>

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin">
          <h2 className="text-data text-telemetry-red">CONDITIONS</h2>
          <ul className="mt-6 grid grid-cols-2 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-4 lg:grid-cols-6">
            <Stat label="AIR" value={`${latestWeather?.air_temperature ?? '·'}°C`} />
            <Stat label="TRACK" value={`${latestWeather?.track_temperature ?? '·'}°C`} />
            <Stat label="HUMIDITY" value={`${latestWeather?.humidity ?? '·'}%`} />
            <Stat label="PRESSURE" value={`${latestWeather?.pressure ?? '·'} mb`} />
            <Stat
              label="WIND"
              value={`${latestWeather?.wind_speed ?? '·'} m/s`}
              sub={latestWeather?.wind_direction != null ? `${latestWeather.wind_direction}°` : undefined}
            />
            <Stat
              label="RAIN"
              value={
                latestWeather?.rainfall != null
                  ? latestWeather.rainfall > 0
                    ? '● YES'
                    : 'NO'
                  : '·'
              }
            />
          </ul>
        </div>
      </section>

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin">
          <h2 className="text-data text-telemetry-red">FIELD · {drivers.length} DRIVERS</h2>
          <ul className="mt-6 grid grid-cols-2 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-4 lg:grid-cols-5">
            {drivers.map((d) => (
              <li key={d.driver_number} className="bg-background p-4">
                <div className="flex items-start justify-between">
                  <div className="font-data text-2xl text-on-background">{d.driver_number}</div>
                  <div className="text-data text-outline">{d.name_acronym}</div>
                </div>
                <div className="mt-3 font-headline text-base text-on-background md:text-lg">
                  {d.full_name}
                </div>
                <div className="mt-2 flex items-center gap-2 text-data text-outline">
                  <span
                    aria-hidden="true"
                    className="block h-2 w-2"
                    style={{ backgroundColor: `#${d.team_colour ?? '888'}` }}
                  />
                  {d.team_name}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin">
          <h2 className="text-data text-telemetry-red">TYRE USAGE</h2>
          <ul className="mt-6 grid grid-cols-2 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-5">
            {Object.entries(COMPOUND_COLOR).map(([compound, color]) => {
              const n = tyreCounts[compound] ?? 0;
              return (
                <li key={compound} className="bg-background p-5">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="block h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-data text-outline">{compound}</span>
                  </div>
                  <div className="mt-3 font-data text-2xl text-on-background md:text-3xl">
                    {n}
                  </div>
                  <div className="text-data text-outline">STINTS</div>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-xs text-outline">
            Source: OpenF1. SVG track map + per-driver position dots land in Phase C.
            Free, no paywall · the platform stays free forever.
          </p>
        </div>
      </section>
    </article>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <li className="bg-background p-4">
      <div className="text-data text-outline">{label}</div>
      <div className="mt-2 font-data text-xl text-on-background md:text-2xl">{value}</div>
      {sub && <div className="text-data text-outline">{sub}</div>}
    </li>
  );
}
