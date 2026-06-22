import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapConstructor, mapResult } from '@apex/api-client/jolpica';
import {
  nationalityToCountryCode,
  flagEmoji,
  teamColorBySlug,
} from '@/lib/format';
import { StatStrip } from '@/components/profile/StatStrip';
import { CountUpBadge } from '@/components/profile/CountUpBadge';
import { MagneticButton } from '@/components/profile/MagneticButton';

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
    title: c.name,
    description: `${c.name} · Formula 1 constructor profile, drivers, championships, history.`,
  };
}

export default async function TeamProfilePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const raw = await jolpica.getConstructor(slug);
  if (!raw) notFound();
  const c = mapConstructor(raw);
  const cc = nationalityToCountryCode(c.nationality);
  const color = teamColorBySlug(c.slug);

  // Pull recent constructor standings to surface current championship position.
  const recentStandings = await jolpica.getConstructorStandings('current', { revalidate: 3600 });
  const me = recentStandings.find((s) => s.Constructor.constructorId === c.slug);

  // Pull current + recent season results to surface drivers.
  const recentSeasons = await Promise.all(
    [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(async (year) => {
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

  // Roster: keep insertion order (most recent first).
  const rosterMap = new Map<
    string,
    { slug: string; fullName: string; code: string; lastSeason: number }
  >();
  for (const s of recentSeasons) {
    for (const race of s.races) {
      for (const r of race.Results ?? []) {
        const driver = mapResult(r).driver;
        const existing = rosterMap.get(driver.slug);
        if (!existing || existing.lastSeason < s.year) {
          rosterMap.set(driver.slug, {
            slug: driver.slug,
            fullName: driver.fullName,
            code: driver.code,
            lastSeason: s.year,
          });
        }
      }
    }
  }
  const roster = Array.from(rosterMap.values())
    .sort((a, b) => b.lastSeason - a.lastSeason)
    .slice(0, 8);

  // Championships count is not directly exposed by Jolpica; surface as "championships data soon"
  // when not derivable — total constructor titles requires historical aggregation done in Phase B.
  const constructorTitles: number | null = null;

  return (
    <article>
      {/* HERO — color-driven, no portrait image (team has no canonical face) */}
      <section
        className="relative isolate min-h-[100svh] w-full overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${color} 0%, ${color}AA 35%, #0f0f0f 90%)`,
        }}
      >
        {/* Carbon weave overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zM20 20h20v20H20z' fill='%23000' fill-opacity='0.6'/%3E%3C/svg%3E\")",
            backgroundSize: '120px 120px',
          }}
        />

        {/* Telemetry red radial */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 900px 600px at 80% 90%, rgba(225,6,0,0.18), transparent 65%)',
          }}
        />

        {/* Vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(180deg, transparent 40%, rgba(15,15,15,0.55) 80%, #0f0f0f 100%)',
          }}
        />

        {/* Championship badge top-right */}
        {constructorTitles !== null && constructorTitles > 0 && (
          <div className="absolute right-6 top-12 z-10 md:right-grid-margin md:top-16">
            <div className="flex items-center gap-3 border border-[#f5c945]/50 bg-[#f5c945]/10 px-5 py-3 backdrop-blur">
              <span aria-hidden="true" className="text-[#f5c945]">★</span>
              <span className="font-display text-3xl leading-none text-[#f5c945]">
                <CountUpBadge value={constructorTitles} /> ×
              </span>
              <span className="text-data text-on-background">CONSTRUCTORS&apos; TITLES</span>
            </div>
          </div>
        )}

        {/* Top utility row */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1700px] items-center justify-between px-6 pt-12 md:px-grid-margin md:pt-16">
          <Link
            href="/teams"
            className="group inline-flex items-center gap-2 text-data text-on-background/80 transition-colors hover:text-on-background"
            style={{ viewTransitionName: 'team-back' }}
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            ALL TEAMS
          </Link>
          <span className="text-data text-on-background/70">
            CONSTRUCTOR · {flagEmoji(cc)} {c.nationality}
          </span>
        </div>

        {/* Name — display-xxl */}
        <div className="relative z-10 mx-auto mt-auto flex w-full max-w-[1700px] flex-col gap-10 px-4 pb-24 md:px-grid-margin md:pb-32">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-2 w-12 bg-on-background" />
            <span className="text-data text-on-background/70">CONSTRUCTOR PROFILE</span>
          </div>
          <h1
            className="font-display uppercase leading-[0.82] tracking-[-0.04em] text-on-background"
            style={{
              fontSize: 'clamp(4.5rem, 16vw, 14rem)',
              viewTransitionName: `team-name-${c.slug}`,
              textShadow: '0 6px 60px rgba(0,0,0,0.45)',
            }}
          >
            {c.name}
          </h1>
          {me && (
            <div className="flex flex-wrap items-end gap-10">
              <div>
                <div className="text-data text-on-background/70">CHAMPIONSHIP POSITION</div>
                <div className="mt-2 font-display text-7xl leading-none tracking-tight text-on-background md:text-9xl">
                  P<CountUpBadge value={Number(me.position)} duration={1400} />
                </div>
              </div>
              <div>
                <div className="text-data text-on-background/70">POINTS THIS SEASON</div>
                <div className="mt-2 font-display text-5xl leading-none tracking-tight text-on-background md:text-7xl">
                  <CountUpBadge value={Number(me.points)} group />
                </div>
              </div>
              <div>
                <div className="text-data text-on-background/70">WINS</div>
                <div className="mt-2 font-display text-5xl leading-none tracking-tight text-on-background md:text-7xl">
                  <CountUpBadge value={Number(me.wins)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* STAT STRIP — facts (founded year etc require Wikidata constructor ingest, Phase B) */}
      <StatStrip
        items={[
          { label: 'BASE', value: c.nationality, ornament: cc ? flagEmoji(cc) : '🏁' },
          { label: 'CURRENT GRID', value: roster.length > 0 ? `${roster.length} drv` : '·' },
          { label: 'SEASON', value: CURRENT_YEAR },
          {
            label: 'P-CHAMPS',
            value: constructorTitles !== null ? constructorTitles : '·',
          },
        ]}
      />

      {/* DRIVER ROSTER carousel-style */}
      {roster.length > 0 && (
        <section className="border-t border-outline-variant/30">
          <div className="mx-auto w-full max-w-[1700px] px-4 py-24 md:px-grid-margin md:py-32">
            <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="text-data text-telemetry-red">DRIVER LINEUP</span>
                <h2 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
                  Current & recent drivers
                </h2>
              </div>
              <p className="max-w-md font-editorial text-lg text-on-surface-variant md:text-xl">
                Every driver who has started a race for {c.name} in the last
                three seasons.
              </p>
            </header>

            <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {roster.map((dr) => (
                <li key={dr.slug}>
                  <Link
                    href={`/drivers/${dr.slug}`}
                    className="group relative block overflow-hidden border-l-4 border-transparent bg-surface-container-lowest/70 p-7 backdrop-blur transition-all duration-500 ease-cinematic hover:bg-surface-container/70"
                    style={{ borderLeftColor: color }}
                  >
                    <div className="text-data text-outline">{dr.code}</div>
                    <div className="mt-6 font-display text-3xl uppercase leading-none tracking-tight text-on-background md:text-4xl">
                      {dr.fullName.split(' ').slice(0, -1).join(' ')}
                      <br />
                      <span className="text-telemetry-red">
                        {dr.fullName.split(' ').slice(-1)[0]}
                      </span>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-data text-on-surface-variant">
                      <span>LAST · {dr.lastSeason}</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* CTA → FULL HISTORY */}
      <section className="relative border-t border-outline-variant/30 bg-surface-container-lowest/40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(ellipse 800px 400px at 30% 50%, ${color}22, transparent 60%)`,
          }}
        />
        <div className="relative mx-auto flex w-full max-w-[1700px] flex-col items-start gap-10 px-4 py-32 md:flex-row md:items-end md:justify-between md:px-grid-margin md:py-40">
          <div className="max-w-2xl">
            <span className="text-data text-telemetry-red">HERITAGE</span>
            <h2 className="mt-3 font-display text-5xl uppercase leading-[0.9] tracking-[-0.03em] text-on-background md:text-7xl">
              Decade-by-decade. Every season, every car, every podium.
            </h2>
          </div>
          <MagneticButton href={`/teams/${c.slug}/history`} bg={color}>
            Full history
          </MagneticButton>
        </div>
      </section>

      {/* REFERENCES */}
      <section className="border-t border-outline-variant/30">
        <div className="mx-auto grid w-full max-w-[1700px] grid-cols-1 gap-12 px-4 py-20 md:grid-cols-[1fr_auto] md:px-grid-margin">
          <p className="max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
            Constructor data via Jolpica F1 (Ergast mirror). Full pre-2016
            history, founding year, principals and power-unit metadata land in
            Phase B with the Wikidata constructor ingest.
          </p>
          <a
            href={c.wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 self-end border border-outline-variant/40 px-5 py-3 font-data text-xs uppercase tracking-[0.2em] text-on-surface-variant transition-colors hover:border-telemetry-red hover:text-telemetry-red"
          >
            Wikipedia
            <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
              north_east
            </span>
          </a>
        </div>
      </section>
    </article>
  );
}
