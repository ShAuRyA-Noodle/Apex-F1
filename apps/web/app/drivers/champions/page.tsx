import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica, mapDriverStanding } from '@apex/api-client/jolpica';
import { nationalityToCountryCode, flagEmoji, teamColorBySlug } from '@/lib/format';

export const revalidate = 604800; // 1 week — champions only change once per year

export const metadata: Metadata = {
  title: 'World Champions',
  description: 'Every Formula 1 World Drivers Champion since 1950.',
};

interface ChampionRow {
  year: number;
  driverSlug: string;
  driverName: string;
  nationality: string;
  teamName: string;
  teamSlug: string;
  points: number;
  wins: number;
}

const FIRST_SEASON = 1950;
const CURRENT_YEAR = new Date().getUTCFullYear();

async function loadChampions(): Promise<ChampionRow[]> {
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y >= FIRST_SEASON; y--) years.push(y);

  // Parallel fetch with a sane concurrency window — Jolpica caps at 4 req/sec.
  // Per-call ISR (1 week) means a cold ride is ~76 calls / 4 = 19s once a year.
  const BATCH = 8;
  const results: ChampionRow[] = [];
  for (let i = 0; i < years.length; i += BATCH) {
    const chunk = years.slice(i, i + BATCH);
    const batchResults = await Promise.allSettled(
      chunk.map(async (year) => {
        try {
          const raw = await jolpica.getDriverStandings(year, { revalidate: 604800 });
          if (raw.length === 0) return null;
          const champ = mapDriverStanding(raw[0]!);
          return {
            year,
            driverSlug: champ.driver.slug,
            driverName: champ.driver.fullName,
            nationality: champ.driver.nationality,
            teamName: champ.constructorName,
            teamSlug: champ.constructorSlug,
            points: champ.points,
            wins: champ.wins,
          };
        } catch {
          return null;
        }
      }),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }
  }
  return results;
}

export default async function ChampionsPage() {
  const champions = await loadChampions();

  // Most-titled drivers
  const titleCount = new Map<string, { name: string; slug: string; count: number; years: number[] }>();
  for (const c of champions) {
    const e = titleCount.get(c.driverSlug);
    if (e) {
      e.count++;
      e.years.push(c.year);
    } else {
      titleCount.set(c.driverSlug, {
        name: c.driverName,
        slug: c.driverSlug,
        count: 1,
        years: [c.year],
      });
    }
  }
  const titleRanked = Array.from(titleCount.values()).sort((a, b) => b.count - a.count);
  const topTitled = titleRanked.slice(0, 6);

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header>
        <span className="text-data text-telemetry-red">WORLD CHAMPIONS</span>
        <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          Champions of<br />Formula 1.
        </h1>
        <p className="mt-6 max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-2xl">
          {champions.length} drivers have won the World Drivers Championship since
          Giuseppe Farina at Silverstone, 13 May 1950. Live from Jolpica F1.
        </p>
      </header>

      {/* MOST TITLES */}
      {topTitled.length > 0 && (
        <section className="mt-16 border-y border-outline-variant/30 py-12">
          <h2 className="text-data text-telemetry-red">MOST TITLES</h2>
          <ul className="mt-6 grid grid-cols-2 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-3 lg:grid-cols-6">
            {topTitled.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/drivers/${t.slug}`}
                  className="block bg-background p-6 transition-colors hover:bg-surface-container-low"
                >
                  <div className="font-data text-5xl text-telemetry-red md:text-6xl">{t.count}</div>
                  <div className="text-data mt-2 text-outline">TITLES</div>
                  <div className="mt-4 font-headline text-base text-on-background md:text-lg">{t.name}</div>
                  <div className="text-data mt-2 text-outline">{t.years.sort((a, b) => a - b).join(', ')}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* YEAR-BY-YEAR */}
      <section className="mt-16">
        <h2 className="text-data text-telemetry-red">YEAR · BY · YEAR</h2>
        {champions.length === 0 ? (
          <p className="mt-12 text-center font-editorial text-xl text-on-surface-variant">
            Jolpica is offline. Reload in a moment.
          </p>
        ) : (
          <ol className="mt-8 divide-y divide-outline-variant/30 border-y border-outline-variant/40">
            {champions.map((c) => {
              const cc = nationalityToCountryCode(c.nationality);
              const color = teamColorBySlug(c.teamSlug);
              return (
                <li key={c.year}>
                  <Link
                    href={`/results/${c.year}/drivers`}
                    className="grid grid-cols-[56px_1fr_auto] items-center gap-3 px-2 py-5 transition-colors hover:bg-surface-container-low md:grid-cols-[80px_8px_1fr_auto_80px] md:gap-5 md:px-6"
                  >
                    <span className="font-data text-2xl text-on-background md:text-3xl">{c.year}</span>
                    <span className="hidden h-9 w-2 md:block" style={{ backgroundColor: color }} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="truncate font-headline text-base text-on-background md:text-lg">
                        {flagEmoji(cc)} {c.driverName}
                      </div>
                      <div className="text-data text-outline">{c.teamName}</div>
                    </div>
                    <span className="hidden text-data text-on-surface-variant md:inline">{c.wins} WINS</span>
                    <span className="text-right font-data text-xl text-on-background md:text-2xl">
                      {c.points}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <p className="mt-12 text-xs text-outline">
        Source: Jolpica F1, ranked by season-end driver standings.
      </p>
    </article>
  );
}
