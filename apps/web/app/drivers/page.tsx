import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica, mapDriverStanding } from '@apex/api-client/jolpica';
import { nationalityToCountryCode, flagEmoji, teamColorBySlug } from '@/lib/format';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Drivers',
  description: 'Current Formula 1 driver grid · live from Jolpica F1.',
};

export default async function DriversIndexPage() {
  const standings = (await jolpica.getDriverStandings('current', { revalidate: 3600 })).map(
    mapDriverStanding,
  );

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header>
        <span className="text-data text-telemetry-red">CURRENT GRID</span>
        <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          Drivers
        </h1>
        <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
          {standings.length} drivers on the current grid. Tap any card for full career stats.
        </p>
      </header>

      <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 lg:grid-cols-5">
        {standings.map((s) => {
          const cc = nationalityToCountryCode(s.driver.nationality);
          const color = teamColorBySlug(s.constructorSlug);
          return (
            <li key={s.driver.slug}>
              <Link
                href={`/drivers/${s.driver.slug}`}
                className="group relative block overflow-hidden border border-outline-variant/40 bg-surface-container-low p-5 transition-colors hover:border-telemetry-red"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: color }}
                />
                <div className="flex items-start justify-between">
                  <div className="font-data text-4xl text-on-background md:text-5xl">
                    {s.driver.number ?? '–'}
                  </div>
                  <div className="text-data text-outline">{s.driver.code}</div>
                </div>
                <h3 className="mt-6 font-headline text-base text-on-background">
                  <span className="block text-outline">{s.driver.firstName}</span>
                  <span className="block text-xl md:text-2xl">{s.driver.lastName}</span>
                </h3>
                <div className="mt-3 flex items-center gap-2 text-data text-on-surface-variant">
                  <span className="text-base leading-none">{flagEmoji(cc)}</span>
                  <span>{s.constructorName}</span>
                </div>
                <div className="mt-5 flex items-end justify-between border-t border-outline-variant/30 pt-3">
                  <span className="text-data text-outline">POS · PTS</span>
                  <span className="font-data text-lg text-on-background">
                    P{s.position} · {s.points}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
