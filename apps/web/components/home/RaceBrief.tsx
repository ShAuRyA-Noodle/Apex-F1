import { unstable_cache } from 'next/cache';
import { jolpica, mapRace, mapDriverStanding } from '@apex/api-client/jolpica';
import { generateRaceBrief } from '@apex/api-client/groq';

/**
 * Apex AI race brief. Groq turns the real upcoming race + championship standings
 * into a 3-sentence "what to watch", cached per race so it never re-bills.
 * Renders nothing if there is no upcoming race or Groq is unavailable.
 */
export async function RaceBrief() {
  const races = (await jolpica.getSchedule('current', { revalidate: 3600 })).map(mapRace);
  const now = Date.now();
  const next = races.find((r) => new Date(r.raceStartIso).getTime() > now);
  if (!next) return null;

  const standings = (await jolpica.getDriverStandings('current', { revalidate: 1800 })).map(
    mapDriverStanding,
  );
  if (standings.length === 0) return null;

  const brief = await unstable_cache(
    () =>
      generateRaceBrief({
        raceName: next.name,
        country: next.country,
        circuit: next.circuitName,
        leaders: standings
          .slice(0, 3)
          .map((s) => `${s.driver.fullName} (${s.points} pts, ${s.constructorName})`),
      }),
    ['race-brief-v1', `${next.season}-${next.round}`],
    { revalidate: 86400 },
  )();
  if (!brief) return null;

  return (
    <section className="border-b border-outline-variant/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 md:px-grid-margin md:py-20">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-telemetry-red">smart_toy</span>
          <span className="text-data text-telemetry-red">APEX AI · RACE BRIEF · {next.name}</span>
        </div>
        <p className="mt-5 max-w-4xl font-editorial text-2xl leading-[1.45] text-on-background md:text-3xl">
          {brief}
        </p>
      </div>
    </section>
  );
}
