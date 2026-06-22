import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica, mapConstructorStanding } from '@apex/api-client/jolpica';
import { nationalityToCountryCode, flagEmoji, teamColorBySlug } from '@/lib/format';

export const revalidate = 300;

export async function generateMetadata(props: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await props.params;
  return {
    title: `${season} Constructor standings`,
    description: `Formula 1 ${season} constructor standings · live from Jolpica F1.`,
  };
}

export default async function ConstructorStandingsPage(props: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await props.params;
  const seasonNum = Number(season);
  const standings = (
    await jolpica.getConstructorStandings(seasonNum, { revalidate: 300 })
  ).map(mapConstructorStanding);

  const max = Math.max(...standings.map((s) => s.points), 1);

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-data text-telemetry-red">CONSTRUCTOR STANDINGS · {season}</span>
          <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            Constructors
          </h1>
        </div>
        <Link
          href={`/results/${season}/drivers`}
          className="inline-flex items-center gap-2 border border-outline-variant px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-telemetry-red"
        >
          Driver standings
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </header>

      <ol className="mt-12 divide-y divide-outline-variant/30 border-y border-outline-variant/40">
        {standings.map((s) => {
          const cc = nationalityToCountryCode(s.constructor.nationality);
          const color = teamColorBySlug(s.constructor.slug);
          const pct = (s.points / max) * 100;
          return (
            <li key={s.constructor.slug}>
              <Link
                href={`/teams/${s.constructor.slug}`}
                className="grid grid-cols-[60px_8px_1fr_auto_auto] items-center gap-5 px-2 py-5 transition-colors hover:bg-surface-container-low md:px-6"
              >
                <span className="font-data text-2xl text-on-background md:text-3xl">
                  {String(s.position).padStart(2, '0')}
                </span>
                <span
                  className="block h-10 w-2"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <div>
                  <div className="font-headline text-xl text-on-background md:text-2xl">
                    {s.constructor.name}
                  </div>
                  <div className="text-data text-outline">
                    {flagEmoji(cc)} {s.constructor.nationality} · {s.wins} WINS
                  </div>
                </div>
                <div className="hidden h-1 w-40 overflow-hidden bg-surface-container md:block">
                  <div
                    className="h-full bg-telemetry-red"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="font-data text-3xl text-on-background md:text-4xl">
                  {s.points}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="mt-10 text-xs text-outline">
        Source: Jolpica F1 · revalidated every 5 minutes.
      </p>
    </article>
  );
}
