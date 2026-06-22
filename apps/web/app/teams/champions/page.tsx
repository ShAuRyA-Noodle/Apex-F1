import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica, mapConstructorStanding } from '@apex/api-client/jolpica';
import { teamColorBySlug } from '@/lib/format';

export const revalidate = 604800;

export const metadata: Metadata = {
  title: 'Constructor Champions',
  description: 'Every Formula 1 Constructors Champion since the title was introduced in 1958.',
};

const FIRST_SEASON = 1958; // Constructors title introduced in 1958
const CURRENT_YEAR = new Date().getUTCFullYear();

interface ChampionRow {
  year: number;
  teamSlug: string;
  teamName: string;
  points: number;
  wins: number;
}

async function loadChampions(): Promise<ChampionRow[]> {
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y >= FIRST_SEASON; y--) years.push(y);
  const BATCH = 8;
  const out: ChampionRow[] = [];
  for (let i = 0; i < years.length; i += BATCH) {
    const chunk = years.slice(i, i + BATCH);
    const batch = await Promise.allSettled(
      chunk.map(async (year) => {
        try {
          const raw = await jolpica.getConstructorStandings(year, { revalidate: 604800 });
          if (raw.length === 0) return null;
          const champ = mapConstructorStanding(raw[0]!);
          return {
            year,
            teamSlug: champ.constructor.slug,
            teamName: champ.constructor.name,
            points: champ.points,
            wins: champ.wins,
          };
        } catch {
          return null;
        }
      }),
    );
    for (const r of batch) {
      if (r.status === 'fulfilled' && r.value) out.push(r.value);
    }
  }
  return out;
}

export default async function ConstructorChampionsPage() {
  const champs = await loadChampions();
  const counts = new Map<string, { name: string; slug: string; count: number; years: number[] }>();
  for (const c of champs) {
    const e = counts.get(c.teamSlug);
    if (e) {
      e.count++;
      e.years.push(c.year);
    } else {
      counts.set(c.teamSlug, { name: c.teamName, slug: c.teamSlug, count: 1, years: [c.year] });
    }
  }
  const topTeams = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header>
        <span className="text-data text-telemetry-red">CONSTRUCTOR CHAMPIONS</span>
        <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          The constructors<br />of Formula 1.
        </h1>
        <p className="mt-6 max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-2xl">
          {champs.length} seasons of the Constructors title since its 1958
          introduction. Live from Jolpica.
        </p>
      </header>

      {topTeams.length > 0 && (
        <section className="mt-16 border-y border-outline-variant/30 py-12">
          <h2 className="text-data text-telemetry-red">MOST TITLES</h2>
          <ul className="mt-6 grid grid-cols-2 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-3 lg:grid-cols-6">
            {topTeams.map((t) => {
              const color = teamColorBySlug(t.slug);
              return (
                <li key={t.slug}>
                  <Link
                    href={`/teams/${t.slug}`}
                    className="block bg-background p-6 transition-colors hover:bg-surface-container-low"
                  >
                    <span
                      aria-hidden="true"
                      className="mb-4 block h-2 w-12"
                      style={{ backgroundColor: color }}
                    />
                    <div className="font-data text-5xl text-telemetry-red md:text-6xl">{t.count}</div>
                    <div className="text-data mt-2 text-outline">TITLES</div>
                    <div className="mt-4 font-headline text-base text-on-background md:text-lg">{t.name}</div>
                    <div className="text-data mt-2 text-outline">
                      {t.years.sort((a, b) => a - b).slice(0, 6).join(', ')}
                      {t.years.length > 6 ? ' ...' : ''}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-16">
        <h2 className="text-data text-telemetry-red">YEAR · BY · YEAR</h2>
        <ol className="mt-8 divide-y divide-outline-variant/30 border-y border-outline-variant/40">
          {champs.map((c) => {
            const color = teamColorBySlug(c.teamSlug);
            return (
              <li key={c.year}>
                <Link
                  href={`/results/${c.year}/teams`}
                  className="grid grid-cols-[80px_8px_1fr_auto_80px] items-center gap-5 px-2 py-5 transition-colors hover:bg-surface-container-low md:px-6"
                >
                  <span className="font-data text-2xl text-on-background md:text-3xl">{c.year}</span>
                  <span className="block h-9 w-2" style={{ backgroundColor: color }} aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="truncate font-headline text-base text-on-background md:text-lg">
                      {c.teamName}
                    </div>
                  </div>
                  <span className="text-data text-on-surface-variant">{c.wins} WINS</span>
                  <span className="text-right font-data text-xl text-on-background md:text-2xl">
                    {c.points}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}
