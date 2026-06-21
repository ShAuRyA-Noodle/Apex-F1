import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapDriver, mapResult } from '@apex/api-client/jolpica';
import { nationalityToCountryCode, flagEmoji, teamColorBySlug } from '@/lib/format';

export const revalidate = 86400;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const raw = await jolpica.getDriver(slug);
  if (!raw) return { title: 'Driver not found' };
  const d = mapDriver(raw);
  return {
    title: `${d.fullName} — Career`,
    description: `${d.fullName} — full Formula 1 race-by-race career: every season, every result.`,
  };
}

export default async function DriverCareerPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const raw = await jolpica.getDriver(slug);
  if (!raw) notFound();
  const d = mapDriver(raw);
  const cc = nationalityToCountryCode(d.nationality);

  const allResults = await jolpica.getDriverResults(slug, { revalidate: 86400 });

  // Group by season
  const seasons = new Map<number, { round: number; race: string; country: string; result?: ReturnType<typeof mapResult> }[]>();
  let totalStarts = 0;
  let totalWins = 0;
  let totalPodiums = 0;
  let totalPoles = 0;
  let totalFastestLaps = 0;
  let totalPoints = 0;
  const teamSet = new Set<string>();

  for (const race of allResults) {
    const year = Number(race.season);
    const round = Number(race.round);
    const list = seasons.get(year) ?? [];
    const result = race.Results && race.Results[0] ? mapResult(race.Results[0]) : undefined;
    if (result) {
      totalStarts++;
      if (result.position === 1) totalWins++;
      if (result.position && result.position <= 3) totalPodiums++;
      if (result.grid === 1) totalPoles++;
      if (result.fastestLap?.rank === 1) totalFastestLaps++;
      totalPoints += result.points;
      teamSet.add(result.constructor.name);
    }
    list.push({ round, race: race.raceName, country: race.Circuit.Location.country, result });
    seasons.set(year, list);
  }

  const sortedYears = Array.from(seasons.keys()).sort((a, b) => b - a);

  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin md:py-16">
          <Link
            href={`/drivers/${slug}`}
            className="text-data inline-flex items-center gap-1 text-outline transition-colors hover:text-on-background"
          >
            ← {d.fullName} profile
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <span className="text-data text-telemetry-red">CAREER</span>
            <span className="h-px w-8 bg-outline" />
            <span className="text-data text-outline">
              {flagEmoji(cc)} {d.nationality}
            </span>
          </div>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-7xl">
            {d.fullName}
          </h1>
        </div>
      </header>

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-px bg-outline-variant/40 px-0 md:grid-cols-6 md:px-grid-margin">
          <Stat label="STARTS" value={String(totalStarts)} />
          <Stat label="WINS" value={String(totalWins)} />
          <Stat label="PODIUMS" value={String(totalPodiums)} />
          <Stat label="POLES" value={String(totalPoles)} />
          <Stat label="FASTEST LAPS" value={String(totalFastestLaps)} />
          <Stat label="TOTAL PTS" value={String(totalPoints)} />
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin md:py-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-data text-telemetry-red">SEASON-BY-SEASON</h2>
            <span className="text-data text-outline">SOURCE: JOLPICA F1</span>
          </div>

          {sortedYears.map((year) => {
            const races = seasons.get(year)!.slice().sort((a, b) => a.round - b.round);
            const seasonWins = races.filter((r) => r.result?.position === 1).length;
            const seasonPoints = races.reduce((acc, r) => acc + (r.result?.points ?? 0), 0);
            return (
              <details
                key={year}
                open={year === sortedYears[0]}
                className="border-b border-outline-variant/40"
              >
                <summary className="grid cursor-pointer grid-cols-[80px_1fr_auto_auto] items-center gap-4 py-5 transition-colors hover:bg-surface-container-low">
                  <span className="font-data text-2xl text-on-background md:text-3xl">{year}</span>
                  <span className="text-data text-on-surface-variant">
                    {races.length} ROUNDS · {seasonWins} WIN{seasonWins === 1 ? '' : 'S'}
                  </span>
                  <span className="hidden text-data text-on-surface-variant md:inline">
                    {seasonPoints} PTS
                  </span>
                  <span className="material-symbols-outlined text-outline">expand_more</span>
                </summary>
                <ul className="border-t border-outline-variant/30 divide-y divide-outline-variant/30 pb-3">
                  {races.map((race) => {
                    const r = race.result;
                    const color = r ? teamColorBySlug(r.constructor.slug) : '#444';
                    return (
                      <li
                        key={`${year}-${race.round}`}
                        className="grid grid-cols-[40px_8px_1fr_auto_60px] items-center gap-4 px-2 py-3 md:px-4"
                      >
                        <span className="font-data text-on-surface-variant">R{String(race.round).padStart(2, '0')}</span>
                        <span className="block h-6 w-1.5" style={{ backgroundColor: color }} aria-hidden="true" />
                        <div>
                          <div className="font-headline text-on-background">{race.race}</div>
                          <div className="text-data text-outline">{race.country}</div>
                        </div>
                        <span className="text-data text-outline">
                          {r ? r.positionText : '—'}
                        </span>
                        <span className="text-right font-data text-on-background">
                          {r ? r.points : 0}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}

          {sortedYears.length === 0 && (
            <p className="mt-10 text-center font-editorial text-xl text-on-surface-variant">
              No race results found for this driver via Jolpica.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5 md:p-7">
      <div className="text-data text-outline">{label}</div>
      <div className="mt-2 font-data text-3xl text-on-background md:text-4xl">{value}</div>
    </div>
  );
}
