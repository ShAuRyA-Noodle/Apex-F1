import type { Metadata } from 'next';
import Link from 'next/link';
import { openf1 } from '@apex/api-client/openf1';
import { LiveTimingTower, type InitialRow } from '@/components/live/LiveTimingTower';
import { LiveConnectionBadge } from '@/components/live/LiveConnectionBadge';

export const revalidate = 5;

export const metadata: Metadata = {
  title: 'Live timing',
  description: 'Live timing tower for the current Formula 1 session · powered by OpenF1.',
};

export default async function LiveTimingPage() {
  const session = await openf1.getLatestSession({ revalidate: 30 });
  if (!session) {
    return (
      <article className="mx-auto w-full max-w-[1600px] px-4 py-32 md:px-grid-margin">
        <h1 className="font-display text-5xl uppercase tracking-tight text-on-background">
          Live timing
        </h1>
        <p className="mt-6 font-editorial text-xl text-on-surface-variant">
          OpenF1 has no current session. Live timing returns when the next session starts.
        </p>
      </article>
    );
  }

  const [drivers, intervals, positions, stints, weather] = await Promise.all([
    openf1.getDrivers(session.session_key, { revalidate: 60 }),
    openf1.getIntervals(session.session_key, { revalidate: 5 }),
    openf1.getPositions(session.session_key, { revalidate: 5 }),
    openf1.getStints(session.session_key, { revalidate: 60 }),
    openf1.getWeather(session.session_key, { revalidate: 60 }),
  ]);

  // Latest snapshot per driver.
  const latestPosition = new Map<number, number>();
  for (const p of positions) {
    latestPosition.set(p.driver_number, p.position);
  }
  const latestInterval = new Map<number, { gap?: number | string; interval?: number | string }>();
  for (const i of intervals) {
    latestInterval.set(i.driver_number, { gap: i.gap_to_leader, interval: i.interval });
  }
  const latestStint = new Map<number, { compound: string; lap: number }>();
  for (const s of stints) {
    latestStint.set(s.driver_number, { compound: s.compound, lap: s.lap_end });
  }
  const latestWeather = weather[weather.length - 1];

  const sessionStart = new Date(session.date_start).getTime();
  const now = Date.now();
  const isLive = now >= sessionStart && now <= new Date(session.date_end).getTime();
  const isFuture = now < sessionStart;

  const initialRows: InitialRow[] = drivers
    .map((d) => {
      const pos = latestPosition.get(d.driver_number);
      const intervalSnap = latestInterval.get(d.driver_number);
      const stintSnap = latestStint.get(d.driver_number);
      return {
        driver: {
          driver_number: d.driver_number,
          full_name: d.full_name,
          name_acronym: d.name_acronym,
          team_name: d.team_name,
          team_colour: d.team_colour,
        },
        pos,
        gap: intervalSnap?.gap,
        interval: intervalSnap?.interval,
        compound: stintSnap?.compound,
        stintLap: stintSnap?.lap,
      };
    })
    .sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99));

  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-10 md:px-grid-margin md:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-data ${isLive ? 'text-telemetry-red' : 'text-outline'}`}>
                  {isLive ? '● LIVE' : isFuture ? 'UPCOMING' : 'COMPLETED'}
                </span>
                <span className="h-px w-8 bg-outline" />
                <span className="text-data text-outline">
                  {session.country_name} · {session.session_name}
                </span>
                <LiveConnectionBadge />
              </div>
              <h1 className="mt-2 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
                {session.location} {session.year}
              </h1>
            </div>
            {latestWeather && (
              <div className="grid grid-cols-3 gap-px overflow-hidden bg-outline-variant/40">
                <Stat label="AIR" value={`${latestWeather.air_temperature ?? '·'}°C`} />
                <Stat label="TRACK" value={`${latestWeather.track_temperature ?? '·'}°C`} />
                <Stat label="RAIN" value={`${latestWeather.rainfall ?? 0} mm`} />
              </div>
            )}
          </div>
        </div>
      </header>

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-grid-margin">
          <LiveTimingTower initialRows={initialRows} />

          <p className="mt-8 text-xs text-outline">
            Source: OpenF1 ({session.session_name}, session #{session.session_key}).
            Initial snapshot via ISR (5s intervals/positions, 60s drivers/weather).
            Position swaps animate live through the SSE channel · row tints green on a
            gain, red on a loss.
            <br />
            <Link href="/live/race-control" className="text-telemetry-red hover:underline">
              Race control feed →
            </Link>
          </p>
        </div>
      </section>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-4 py-3">
      <div className="text-data text-outline">{label}</div>
      <div className="mt-1 font-data text-lg text-on-background">{value}</div>
    </div>
  );
}
