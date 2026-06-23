import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  jolpica,
  mapRace,
  mapResult,
  type UiRace,
  type UiResult,
} from '@apex/api-client/jolpica';
import { countryNameToCode, flagEmoji, teamColorBySlug } from '@/lib/format';
import { WeatherStrip } from '@/components/race/WeatherStrip';
import { getRaceHeroImage } from '@/lib/heroImage';

export const revalidate = 300;

type RouteParams = { season: string; race: string };

async function loadRace(season: number, raceSlug: string): Promise<{
  race: UiRace;
  results: UiResult[];
  round: number;
} | null> {
  const races = (await jolpica.getSchedule(season, { revalidate: 3600 })).map(mapRace);
  const race = races.find((r) => r.slug === raceSlug);
  if (!race) return null;
  const round = race.round;
  const raw = await jolpica.getRaceResults(season, round, { revalidate: 300 });
  const results = raw ? raw.results.map(mapResult) : [];
  return { race, results, round };
}

export async function generateMetadata(props: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { season, race } = await props.params;
  const data = await loadRace(Number(season), race);
  if (!data) return { title: 'Race not found' };
  return {
    title: `${data.race.name} ${season}`,
    description: `${data.race.name} ${season} · sessions, results, circuit, weather.`,
  };
}

function fmtSessionLabel(kind: string): string {
  return (
    {
      FP1: 'Practice 1',
      FP2: 'Practice 2',
      FP3: 'Practice 3',
      SQ: 'Sprint Qualifying',
      S: 'Sprint',
      Q: 'Qualifying',
      R: 'Race',
    }[kind] ?? kind
  );
}

function fmtSessionDate(iso: string): string {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function RaceDetailPage(props: { params: Promise<RouteParams> }) {
  const { season, race: raceSlug } = await props.params;
  const seasonNum = Number(season);
  // Kick off the Unsplash hero lookup BEFORE awaiting the schedule + results
  // chain · the hero only needs the raceSlug, which we already have, so it
  // can race against the two-step jolpica fetch inside loadRace. This shaves
  // the marina_bay cold load that smoke flagged at 5.4s in half.
  const heroPromise = getRaceHeroImage({ circuitSlug: raceSlug });
  const data = await loadRace(seasonNum, raceSlug);
  if (!data) notFound();
  const { race, results, round } = data;
  const cc = countryNameToCode(race.country);
  const hasResults = results.length > 0;
  const winner = hasResults ? results[0] : null;
  const hero = await heroPromise;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${race.name} ${seasonNum}`,
    startDate: race.raceStartIso,
    location: {
      '@type': 'Place',
      name: race.circuitName,
      address: { '@type': 'PostalAddress', addressLocality: race.city, addressCountry: race.country },
    },
    sport: 'Formula 1',
    url: `https://apex.gg/schedule/${seasonNum}/${raceSlug}`,
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <Link
            href={`/schedule/${seasonNum}`}
            className="text-data inline-flex items-center gap-1 text-outline transition-colors hover:text-on-background"
          >
            ← {seasonNum} SCHEDULE
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <span className="text-data text-telemetry-red">
              ROUND {String(round).padStart(2, '0')}
            </span>
            <span className="h-px w-8 bg-outline" />
            <span className="text-data text-outline">
              {flagEmoji(cc)} {race.country} · {race.city}
            </span>
          </div>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-8xl">
            {race.name}
          </h1>
          <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
            {race.circuitName}
            {winner && (
              <>
                {' · '}
                <span className="text-on-background">
                  Winner: {winner.driver.fullName}
                </span>
              </>
            )}
          </p>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-outline-variant/30">
        {/* Circuit-specific Unsplash backdrop. Sits at -z-10 so the grid lives
           on top of a dimmed cinematic frame. Hidden entirely when no hero
           resolves · section falls back to the page surface color. */}
        {hero && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-20"
              style={{ backgroundColor: hero.color ?? '#0e0e0e' }}
            />
            <img
              src={hero.urlHero}
              alt={hero.alt}
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
              loading="lazy"
              decoding="async"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  'linear-gradient(180deg, rgba(14,14,14,0.65) 0%, rgba(14,14,14,0.78) 60%, rgba(14,14,14,0.95) 100%)',
              }}
            />
          </>
        )}

        <div className="relative mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-data text-telemetry-red">SESSIONS</h2>
            <span className="text-data text-outline">
              {race.circuitName.toUpperCase()}
            </span>
          </div>
          <ul className="mt-6 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-4">
            {race.sessions.map((s) => (
              <li key={s.kind} className="bg-background/90 p-5 backdrop-blur-sm">
                <div className="text-data text-outline">{fmtSessionLabel(s.kind)}</div>
                <div className="mt-2 font-headline text-base text-on-background md:text-lg">
                  {fmtSessionDate(s.iso)}
                </div>
              </li>
            ))}
          </ul>

          {/* Unsplash attribution · license-required when hero is from Unsplash.
             Wikidata source renders nothing. Glass-subtle bottom-right. */}
          {hero && hero.attributionName && hero.attributionUrl && (
            <div className="mt-6 flex justify-end">
              <div className="rounded-sm bg-black/40 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm md:text-[11px]">
                Photo by{' '}
                <a
                  href={hero.attributionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/95 underline-offset-2 transition-colors hover:text-telemetry-red hover:underline"
                >
                  {hero.attributionName}
                </a>{' '}
                on{' '}
                <a
                  href="https://unsplash.com/?utm_source=apex&utm_medium=referral"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/95 underline-offset-2 transition-colors hover:text-telemetry-red hover:underline"
                >
                  Unsplash
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {hasResults ? (
        <section className="border-b border-outline-variant/30">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-data text-telemetry-red">RACE RESULTS</h2>
              <span className="text-data text-outline">SOURCE: JOLPICA F1</span>
            </div>
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-outline-variant/40 text-data">
                <tr>
                  <th className="px-3 py-3 text-on-surface-variant">POS</th>
                  <th className="px-3 py-3 text-on-surface-variant" colSpan={2}>
                    DRIVER
                  </th>
                  <th className="hidden px-3 py-3 text-on-surface-variant md:table-cell">TEAM</th>
                  <th className="hidden px-3 py-3 text-on-surface-variant md:table-cell">
                    LAPS
                  </th>
                  <th className="px-3 py-3 text-right text-on-surface-variant">TIME / GAP</th>
                  <th className="px-3 py-3 text-right text-on-surface-variant">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {results.map((r) => {
                  const color = teamColorBySlug(r.constructor.slug);
                  return (
                    <tr key={r.driver.slug} className="group transition-colors hover:bg-surface-container-low">
                      <td className="px-3 py-3 font-data text-lg text-on-background md:text-xl">
                        {r.positionText}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          aria-hidden="true"
                          className="block h-8 w-1.5"
                          style={{ backgroundColor: color }}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/drivers/${r.driver.slug}`}
                          className="block transition-colors group-hover:text-telemetry-red"
                        >
                          <div className="font-headline text-base text-on-background md:text-lg">
                            {r.driver.fullName}
                          </div>
                          <div className="text-data text-outline">{r.driver.code}</div>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-3 text-sm text-on-surface-variant md:table-cell">
                        <Link
                          href={`/teams/${r.constructor.slug}`}
                          className="transition-colors hover:text-telemetry-red"
                        >
                          {r.constructor.name}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-3 font-data text-sm text-on-surface-variant md:table-cell">
                        {r.laps}
                      </td>
                      <td className="px-3 py-3 text-right font-data text-sm text-on-surface-variant">
                        {r.time ?? r.status}
                      </td>
                      <td className="px-3 py-3 text-right font-data text-lg text-on-background md:text-xl">
                        {r.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="border-b border-outline-variant/30">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin">
            <div className="border border-outline-variant/40 p-10 text-center">
              <span className="text-data text-telemetry-red">UPCOMING</span>
              <p className="mt-4 font-editorial text-xl text-on-surface-variant md:text-2xl">
                Race hasn&apos;t happened yet. Results land here within minutes of the chequered flag.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin">
          <h2 className="text-data text-telemetry-red">CIRCUIT</h2>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-4">
            <Cell label="CIRCUIT" value={race.circuitName} />
            <Cell label="LOCATION" value={`${race.city}, ${race.country}`} />
            <Cell label="ROUND" value={String(race.round)} />
            <Cell label="SEASON" value={String(race.season)} />
          </div>
        </div>
      </section>

      {Number.isFinite(race.lat) && Number.isFinite(race.lon) && (
        <WeatherStrip
          lat={race.lat}
          lon={race.lon}
          raceStartIso={race.raceStartIso}
          sessions={race.sessions}
        />
      )}
    </article>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5">
      <div className="text-data text-outline">{label}</div>
      <div className="mt-2 font-headline text-base text-on-background md:text-lg">{value}</div>
    </div>
  );
}
