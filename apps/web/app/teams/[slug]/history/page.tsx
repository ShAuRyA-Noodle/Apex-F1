import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapConstructor, mapResult } from '@apex/api-client/jolpica';
import { teamColorBySlug } from '@/lib/format';

export const revalidate = 86400;

const CURRENT_YEAR = new Date().getUTCFullYear();

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const raw = await jolpica.getConstructor(slug);
  if (!raw) return { title: 'Team not found' };
  const c = mapConstructor(raw);
  return {
    title: `${c.name} — History`,
    description: `${c.name} — Formula 1 constructor history, recent seasons, results.`,
  };
}

export default async function TeamHistoryPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const raw = await jolpica.getConstructor(slug);
  if (!raw) notFound();
  const c = mapConstructor(raw);
  const color = teamColorBySlug(c.slug);

  // Pull last 10 seasons of results to keep page weight reasonable.
  const seasonRange: number[] = [];
  for (let y = CURRENT_YEAR; y >= CURRENT_YEAR - 9; y--) seasonRange.push(y);

  const seasonResults = await Promise.all(
    seasonRange.map(async (year) => {
      try {
        const races = await jolpica.getConstructorResultsInSeason(c.slug, year, {
          revalidate: 86400,
        });
        return { year, races };
      } catch {
        return { year, races: [] };
      }
    }),
  );

  const seasons = seasonResults
    .filter((s) => s.races.length > 0)
    .map((s) => {
      let wins = 0;
      let podiums = 0;
      let points = 0;
      let starts = 0;
      const drivers = new Set<string>();
      for (const race of s.races) {
        for (const r of race.Results ?? []) {
          const result = mapResult(r);
          starts++;
          if (result.position === 1) wins++;
          if (result.position && result.position <= 3) podiums++;
          points += result.points;
          drivers.add(result.driver.fullName);
        }
      }
      return { year: s.year, wins, podiums, points, starts, drivers: Array.from(drivers), races: s.races.length };
    });

  return (
    <article>
      <header className="relative overflow-hidden border-b border-outline-variant/30">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2" style={{ backgroundColor: color }} />
        <div className="mx-auto w-full max-w-[1600px] px-4 py-14 md:px-grid-margin md:py-20">
          <Link
            href={`/teams/${slug}`}
            className="text-data inline-flex items-center gap-1 text-outline transition-colors hover:text-on-background"
          >
            ← {c.name} profile
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <span className="text-data text-telemetry-red">HISTORY</span>
            <span className="h-px w-8 bg-outline" />
            <span className="text-data text-outline">LAST 10 SEASONS</span>
          </div>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-8xl">
            {c.name}
          </h1>
        </div>
      </header>

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin md:py-16">
          {seasons.length === 0 ? (
            <p className="text-center font-editorial text-xl text-on-surface-variant">
              No recent season data via Jolpica for this constructor.
            </p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-outline-variant/40 text-data">
                <tr>
                  <th className="px-3 py-3 text-on-surface-variant">SEASON</th>
                  <th className="hidden px-3 py-3 text-on-surface-variant md:table-cell">
                    DRIVERS
                  </th>
                  <th className="px-3 py-3 text-right text-on-surface-variant">RACES</th>
                  <th className="px-3 py-3 text-right text-on-surface-variant">WINS</th>
                  <th className="px-3 py-3 text-right text-on-surface-variant">PODIUMS</th>
                  <th className="px-3 py-3 text-right text-on-surface-variant">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {seasons.map((s) => (
                  <tr key={s.year} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-3 py-4 font-data text-2xl text-on-background md:text-3xl">
                      {s.year}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-on-surface-variant md:table-cell">
                      {s.drivers.join(' · ')}
                    </td>
                    <td className="px-3 py-4 text-right font-data text-on-surface-variant">
                      {s.races}
                    </td>
                    <td className="px-3 py-4 text-right font-data text-lg text-on-background">
                      {s.wins}
                    </td>
                    <td className="px-3 py-4 text-right font-data text-on-surface-variant">
                      {s.podiums}
                    </td>
                    <td className="px-3 py-4 text-right font-data text-xl text-on-background md:text-2xl">
                      {s.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-8 text-xs text-outline">
            Source: Jolpica F1. Full pre-2016 history lands in Phase B with the historical seed
            (DATABASE_URL provisioned).
          </p>
        </div>
      </section>
    </article>
  );
}
