import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapDriverStanding } from '@apex/api-client/jolpica';
import { nationalityToCountryCode, flagEmoji, teamColorBySlug } from '@/lib/format';

export const revalidate = 300;

export async function generateMetadata(props: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await props.params;
  return {
    title: `${season} Driver standings`,
    description: `Formula 1 ${season} driver standings · live from Jolpica F1.`,
  };
}

export default async function DriverStandingsPage(props: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await props.params;
  const seasonNum = Number(season);
  if (!Number.isInteger(seasonNum) || seasonNum < 1950 || seasonNum > new Date().getFullYear()) {
    notFound();
  }
  const standings = (await jolpica.getDriverStandings(seasonNum, { revalidate: 300 })).map(
    mapDriverStanding,
  );
  if (standings.length === 0) notFound();

  const max = Math.max(...standings.map((s) => s.points), 1);

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-data text-telemetry-red">DRIVER STANDINGS · {season}</span>
          <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            Drivers
          </h1>
        </div>
        <Link
          href={`/results/${season}/teams`}
          className="inline-flex items-center gap-2 border border-outline-variant px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-telemetry-red"
        >
          Constructor standings
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </header>

      <table className="mt-12 w-full border-collapse text-left">
        <thead className="border-b border-outline-variant/40 text-data">
          <tr>
            <th className="px-3 py-3 text-on-surface-variant">POS</th>
            <th className="px-3 py-3 text-on-surface-variant" colSpan={2}>
              DRIVER
            </th>
            <th className="hidden px-3 py-3 text-on-surface-variant md:table-cell">TEAM</th>
            <th className="px-3 py-3 text-right text-on-surface-variant">WINS</th>
            <th className="px-3 py-3 text-right text-on-surface-variant">PTS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">
          {standings.map((s) => {
            const cc = nationalityToCountryCode(s.driver.nationality);
            const color = teamColorBySlug(s.constructorSlug);
            const pct = (s.points / max) * 100;
            return (
              <tr key={s.driver.slug} className="group transition-colors hover:bg-surface-container-low">
                <td className="px-3 py-4 font-data text-xl text-on-background md:text-2xl">
                  {String(s.position).padStart(2, '0')}
                </td>
                <td className="px-2 py-4">
                  <span
                    aria-hidden="true"
                    className="block h-9 w-1.5"
                    style={{ backgroundColor: color }}
                  />
                </td>
                <td className="px-3 py-4">
                  <Link
                    href={`/drivers/${s.driver.slug}`}
                    className="block transition-colors group-hover:text-telemetry-red"
                  >
                    <div className="font-headline text-base text-on-background md:text-lg">
                      {flagEmoji(cc)} {s.driver.fullName}
                    </div>
                    <div className="text-data text-outline">{s.driver.code}</div>
                  </Link>
                </td>
                <td className="hidden px-3 py-4 text-sm text-on-surface-variant md:table-cell">
                  <Link
                    href={`/teams/${s.constructorSlug}`}
                    className="transition-colors hover:text-telemetry-red"
                  >
                    {s.constructorName}
                  </Link>
                </td>
                <td className="px-3 py-4 text-right font-data text-sm text-on-surface-variant">
                  {s.wins}
                </td>
                <td className="px-3 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <div className="hidden h-1 w-24 overflow-hidden bg-surface-container md:block">
                      <div
                        className="h-full bg-telemetry-red"
                        style={{ width: `${pct}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="font-data text-2xl text-on-background md:text-3xl">
                      {s.points}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-10 text-xs text-outline">
        Source: Jolpica F1 · revalidated every 5 minutes.
      </p>
    </article>
  );
}
