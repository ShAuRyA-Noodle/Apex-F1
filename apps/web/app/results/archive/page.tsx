import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica } from '@apex/api-client/jolpica';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Results Archive',
  description:
    'Every Formula 1 season from 1950 to present. Click any year to open its full driver and constructor standings.',
};

const CURRENT_YEAR = new Date().getUTCFullYear();

export default async function ResultsArchivePage() {
  // Pull every season Jolpica reports. Free, public, no key required.
  let years: number[] = [];
  try {
    const seasons = await jolpica.getSeasons({ revalidate: 86400 });
    years = seasons
      .map((s) => Number(s.season))
      .filter((y) => Number.isFinite(y))
      .sort((a, b) => b - a);
  } catch {
    // Empty list -> graceful empty state. Per project rule #1 we never fake.
    years = [];
  }

  const byDecade = new Map<number, number[]>();
  for (const y of years) {
    const decade = Math.floor(y / 10) * 10;
    const bucket = byDecade.get(decade) ?? [];
    bucket.push(y);
    byDecade.set(decade, bucket);
  }
  const decades = Array.from(byDecade.keys()).sort((a, b) => b - a);

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-data text-telemetry-red">RESULTS · ARCHIVE</span>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            Every season.<br />Every champion.
          </h1>
          <p className="mt-6 max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-2xl">
            {years.length} seasons of Formula 1, from the 1950 Silverstone
            opener through {CURRENT_YEAR}. Pick any year and dive into its
            standings table.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-outline-variant/60 p-1">
          <Link
            href={`/results/${CURRENT_YEAR}/drivers`}
            className="bg-telemetry-red px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background"
          >
            {CURRENT_YEAR}
          </Link>
        </div>
      </header>

      {years.length === 0 && (
        <p className="mt-20 text-center font-editorial text-xl text-on-surface-variant">
          Jolpica is briefly offline. Reload in a minute.
        </p>
      )}

      <div className="mt-16 space-y-16">
        {decades.map((decade) => {
          const seasonsInDecade = byDecade.get(decade) ?? [];
          return (
            <section key={decade}>
              <div className="mb-6 flex items-baseline gap-4">
                <h2 className="font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
                  {decade}s
                </h2>
                <span className="text-data text-outline">
                  {seasonsInDecade.length} {seasonsInDecade.length === 1 ? 'SEASON' : 'SEASONS'}
                </span>
              </div>
              <ul className="grid grid-cols-3 gap-px overflow-hidden bg-outline-variant/40 sm:grid-cols-5 md:grid-cols-10">
                {seasonsInDecade.map((year) => (
                  <li key={year} className="bg-background">
                    <Link
                      href={`/results/${year}/drivers`}
                      className="group flex aspect-square flex-col items-center justify-center transition-colors hover:bg-surface-container-low"
                    >
                      <span className="font-data text-xl text-on-background transition-colors group-hover:text-telemetry-red md:text-2xl">
                        {year}
                      </span>
                      <span className="text-data mt-1 text-outline opacity-0 transition-opacity group-hover:opacity-100">
                        OPEN →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-20 text-xs text-outline">
        Source: Jolpica F1 (Ergast-compatible). Free, public, no API key required.
      </p>
    </article>
  );
}
