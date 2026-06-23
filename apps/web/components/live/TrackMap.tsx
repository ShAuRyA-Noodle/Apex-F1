import { openf1 } from '@apex/api-client/openf1';

interface DriverLite {
  driver_number: number;
  name_acronym: string;
  team_colour?: string | null;
}

/**
 * Circuit map traced from real OpenF1 car GPS telemetry. The outline is one
 * driver's ~90s green-flag lap (the actual track shape, not a generic SVG); the
 * dots are every car's latest position (live during a session, frozen at the end
 * otherwise). Renders nothing if the session has no usable location telemetry.
 */
export async function TrackMap({
  sessionKey,
  dateStart,
  dateEnd,
  isLive,
  drivers,
}: {
  sessionKey: number;
  dateStart: string;
  dateEnd: string;
  isLive: boolean;
  drivers: DriverLite[];
}) {
  const refDriver = drivers[0]?.driver_number;
  const start = new Date(dateStart).getTime();
  const end = new Date(dateEnd).getTime();

  // Outline: a 95s window ~20 min into the session (settled green-flag running).
  const outlineGte = new Date(start + 20 * 60_000).toISOString();
  const outlineLte = new Date(start + 20 * 60_000 + 95_000).toISOString();
  // Dots: last ~6s of telemetry (live = recent, past = final positions).
  const dotsGte = new Date((isLive ? Date.now() : end) - 6000).toISOString();

  const [outline, dotsRaw] = await Promise.all([
    refDriver != null
      ? openf1.getLocation(sessionKey, {
          driverNumber: refDriver,
          dateGte: outlineGte,
          dateLte: outlineLte,
          revalidate: 600,
        })
      : Promise.resolve([]),
    openf1.getLocation(sessionKey, { dateGte: dotsGte, revalidate: isLive ? 5 : 600 }),
  ]);

  if (outline.length < 20) return null;

  const latestByDriver = new Map<number, { x: number; y: number }>();
  for (const p of dotsRaw) latestByDriver.set(p.driver_number, { x: p.x, y: p.y });

  const all = [
    ...outline.map((p) => ({ x: p.x, y: p.y })),
    ...Array.from(latestByDriver.values()),
  ];
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const SIZE = 1000;
  const PAD = 80;
  const scale = Math.min((SIZE - PAD * 2) / w, (SIZE - PAD * 2) / h);
  const offX = (SIZE - w * scale) / 2;
  const offY = (SIZE - h * scale) / 2;
  const tx = (x: number) => offX + (x - minX) * scale;
  const ty = (y: number) => SIZE - (offY + (y - minY) * scale);

  const step = Math.max(1, Math.floor(outline.length / 240));
  const poly = outline
    .filter((_, i) => i % step === 0)
    .map((p) => `${tx(p.x).toFixed(1)},${ty(p.y).toFixed(1)}`)
    .join(' ');

  const teamColor = new Map(drivers.map((d) => [d.driver_number, `#${d.team_colour ?? '888888'}`]));
  const acro = new Map(drivers.map((d) => [d.driver_number, d.name_acronym]));

  return (
    <section className="border-b border-outline-variant/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin">
        <h2 className="text-data text-telemetry-red">
          TRACK MAP {isLive ? '· ● LIVE POSITIONS' : '· FINAL POSITIONS'}
        </h2>
        <div className="mx-auto mt-6 max-w-[760px]">
          <svg
            viewBox="0 0 1000 1000"
            className="w-full"
            role="img"
            aria-label="Circuit map traced from car GPS telemetry with live position dots"
          >
            {/* Track ribbon: thick asphalt under a thin telemetry-red racing line. */}
            <polyline
              points={poly}
              fill="none"
              stroke="#2b2b2b"
              strokeWidth={14}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={poly}
              fill="none"
              stroke="#e10600"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.55}
            />
            {Array.from(latestByDriver.entries()).map(([num, pt]) => (
              <g key={num}>
                <circle
                  cx={tx(pt.x)}
                  cy={ty(pt.y)}
                  r={11}
                  fill={teamColor.get(num) ?? '#888'}
                  stroke="#0f0f0f"
                  strokeWidth={2.5}
                />
                <text
                  x={tx(pt.x)}
                  y={ty(pt.y) - 17}
                  textAnchor="middle"
                  fontSize={19}
                  fontFamily="monospace"
                  fill="#e9e9e9"
                >
                  {acro.get(num) ?? num}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-4 text-xs text-outline">
          Outline and dots traced from real OpenF1 car GPS telemetry.{' '}
          {isLive ? 'Positions refresh through the session.' : 'Frozen at the last session end.'}
        </p>
      </div>
    </section>
  );
}
