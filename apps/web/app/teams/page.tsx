import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica, mapConstructorStanding } from '@apex/api-client/jolpica';
import { nationalityToCountryCode, flagEmoji, teamColorBySlug } from '@/lib/format';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Teams',
  description: 'Current Formula 1 constructors — live from Jolpica F1.',
};

export default async function TeamsIndexPage() {
  const standings = (await jolpica.getConstructorStandings('current', { revalidate: 3600 })).map(
    mapConstructorStanding,
  );

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header>
        <span className="text-data text-telemetry-red">CURRENT CONSTRUCTORS</span>
        <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          Teams
        </h1>
        <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
          The 10 constructors competing in this Formula 1 season.
        </p>
      </header>

      <ul className="mt-12 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2">
        {standings.map((s) => {
          const cc = nationalityToCountryCode(s.constructor.nationality);
          const color = teamColorBySlug(s.constructor.slug);
          return (
            <li key={s.constructor.slug} className="bg-background">
              <Link
                href={`/teams/${s.constructor.slug}`}
                className="group flex items-center gap-6 p-8 transition-colors hover:bg-surface-container-low"
              >
                <div
                  aria-hidden="true"
                  className="h-24 w-2 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1">
                  <div className="text-data text-outline">
                    P{s.position} · {s.wins} WINS · {s.points} PTS
                  </div>
                  <h2 className="mt-2 font-display text-2xl uppercase tracking-tight text-on-background md:text-4xl">
                    {s.constructor.name}
                  </h2>
                  <div className="mt-2 text-data text-on-surface-variant">
                    {flagEmoji(cc)} {s.constructor.nationality}
                  </div>
                </div>
                <span className="material-symbols-outlined text-[28px] text-outline transition-transform group-hover:translate-x-2">
                  arrow_forward
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
