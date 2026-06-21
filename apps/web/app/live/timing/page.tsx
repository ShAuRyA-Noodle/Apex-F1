import type { Metadata } from 'next';
import Link from 'next/link';
import { openf1 } from '@apex/api-client/openf1';

export const revalidate = 5;

export const metadata: Metadata = {
  title: 'Live timing',
  description: 'Live timing tower for the current Formula 1 session — powered by OpenF1.',
};

const COMPOUND_COLOR: Record<string, string> = {
  SOFT: '#FF3333',
  MEDIUM: '#FFE600',
  HARD: '#FFFFFF',
  INTERMEDIATE: '#00C853',
  WET: '#0091EA',
  UNKNOWN: '#888888',
};

function fmtMs(seconds?: number): string {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return '—';
  if (seconds === 0) return 'LEADER';
  if (seconds < 60) return `+${seconds.toFixed(3)}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `+${m}:${s.toFixed(3).padStart(6, '0')}`;
}

function fmtInterval(v: number | string | undefined): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'string') return v;
  if (v === 0) return 'LAP';
  return `+${v.toFixed(3)}`;
}

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

  const rows = drivers
    .map((d) => {
      const pos = latestPosition.get(d.driver_number);
      const intervalSnap = latestInterval.get(d.driver_number);
      const stintSnap = latestStint.get(d.driver_number);
      return { d, pos, intervalSnap, stintSnap };
    })
    .sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99));

  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-10 md:px-grid-margin md:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className={`text-data ${isLive ? 'text-telemetry-red' : 'text-outline'}`}>
                  {isLive ? '● LIVE' : isFuture ? 'UPCOMING' : 'COMPLETED'}
                </span>
                <span className="h-px w-8 bg-outline" />
                <span className="text-data text-outline">
                  {session.country_name} · {session.session_name}
                </span>
              </div>
              <h1 className="mt-2 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
                {session.location} {session.year}
              </h1>
            </div>
            {latestWeather && (
              <div className="grid grid-cols-3 gap-px overflow-hidden bg-outline-variant/40">
                <Stat label="AIR" value={`${latestWeather.air_temperature ?? '—'}°C`} />
                <Stat label="TRACK" value={`${latestWeather.track_temperature ?? '—'}°C`} />
                <Stat label="RAIN" value={`${latestWeather.rainfall ?? 0} mm`} />
              </div>
            )}
          </div>
        </div>
      </header>

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-grid-margin">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-outline-variant/40 text-data">
              <tr>
                <th className="px-2 py-3 text-on-surface-variant">POS</th>
                <th className="px-2 py-3 text-on-surface-variant">#</th>
                <th className="px-2 py-3 text-on-surface-variant">DRIVER</th>
                <th className="hidden px-2 py-3 text-on-surface-variant md:table-cell">TEAM</th>
                <th className="px-2 py-3 text-right text-on-surface-variant">GAP</th>
                <th className="px-2 py-3 text-right text-on-surface-variant">INT</th>
                <th className="hidden px-2 py-3 text-on-surface-variant md:table-cell">TYRE</th>
                <th className="hidden px-2 py-3 text-right text-on-surface-variant md:table-cell">
                  STINT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {rows.map(({ d, pos, intervalSnap, stintSnap }) => {
                const compound = stintSnap?.compound ?? 'UNKNOWN';
                const dot = COMPOUND_COLOR[compound] ?? '#888';
                return (
                  <tr key={d.driver_number} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-2 py-3 font-data text-lg text-on-background">
                      {pos ?? '—'}
                    </td>
                    <td className="px-2 py-3 font-data text-on-surface-variant">
                      {d.driver_number}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="block h-6 w-1.5"
                          style={{ backgroundColor: `#${d.team_colour ?? '888888'}` }}
                        />
                        <div>
                          <div className="font-headline text-on-background">
                            {d.name_acronym} {d.full_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-2 py-3 text-on-surface-variant md:table-cell">
                      {d.team_name}
                    </td>
                    <td className="px-2 py-3 text-right font-data text-on-surface-variant">
                      {fmtInterval(intervalSnap?.gap)}
                    </td>
                    <td className="px-2 py-3 text-right font-data text-on-surface-variant">
                      {fmtInterval(intervalSnap?.interval)}
                    </td>
                    <td className="hidden px-2 py-3 md:table-cell">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="block h-3 w-3 rounded-full"
                          style={{ backgroundColor: dot }}
                        />
                        <span className="text-data text-outline">{compound}</span>
                      </div>
                    </td>
                    <td className="hidden px-2 py-3 text-right font-data text-on-surface-variant md:table-cell">
                      L{stintSnap?.lap ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rows.length === 0 && (
            <p className="py-20 text-center font-editorial text-xl text-on-surface-variant">
              OpenF1 returned no driver snapshot yet. Refreshing in 5s.
            </p>
          )}

          <p className="mt-8 text-xs text-outline">
            Source: OpenF1 ({session.session_name}, session #{session.session_key}). ISR 5s on
            intervals + positions, 60s on drivers + weather. Stable up to ~1Hz under load.
            Phase C delivers WebSocket fanout for sub-second updates.
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
