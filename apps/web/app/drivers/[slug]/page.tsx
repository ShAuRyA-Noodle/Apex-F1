import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapDriver, mapResult } from '@apex/api-client/jolpica';
import { getDriverFactsFromWikidata } from '@apex/api-client/wikidata';
import {
  getWikipediaSummaryByUrl,
  getDriverFactsByQid,
} from '@apex/api-client/wikipedia';
import {
  nationalityToCountryCode,
  flagEmoji,
  teamColorBySlug,
} from '@/lib/format';
import { ParallaxHero } from '@/components/profile/ParallaxHero';
import { getDriverHeroImage } from '@/lib/heroImage';
import { StatStrip } from '@/components/profile/StatStrip';
import { CountUpBadge } from '@/components/profile/CountUpBadge';
import { CareerArc } from '@/components/profile/CareerArc';
import { RecentFormPanel } from '@/components/profile/RecentFormPanel';
import { MagneticButton } from '@/components/profile/MagneticButton';
import { ViewTransitionLink } from '@/components/profile/ViewTransitionLink';

export const revalidate = 86400;

function commonsImageUrl(wikidataImage: string): string {
  // Wikidata returns Special:FilePath URLs. Append width param for sane sizing.
  const u = new URL(wikidataImage);
  u.searchParams.set('width', '1600');
  return u.toString();
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const raw = await jolpica.getDriver(slug);
  if (!raw) return { title: 'Driver not found' };
  const d = mapDriver(raw);
  return {
    title: d.fullName,
    description: `${d.fullName} · Formula 1 driver profile, career arc, recent form, biography.`,
  };
}

export default async function DriverProfilePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const raw = await jolpica.getDriver(slug);
  if (!raw) notFound();
  const d = mapDriver(raw);
  const cc = nationalityToCountryCode(d.nationality);
  // Two-step enrichment that always wins where the old label-match SPARQL fell short:
  //   1. Hit the Wikipedia REST summary endpoint with the article URL
  //      Jolpica already gives us. Returns bio extract + image + the
  //      driver's canonical Wikidata Q-id.
  //   2. Use that Q-id to pull dob / place of birth / height from
  //      Wikidata via wbgetentities (id lookup, no SPARQL fuzz).
  // Fallback to the legacy SPARQL client only if BOTH steps return nothing
  // (handles drivers without a Wikipedia article — e.g. very old grids).
  const wikiSummary = d.wikiUrl
    ? await getWikipediaSummaryByUrl(d.wikiUrl, { revalidate: 86400 })
    : null;
  const wdFacts = wikiSummary?.wikidataId
    ? await getDriverFactsByQid(wikiSummary.wikidataId, { revalidate: 86400 })
    : null;
  const legacyFacts =
    !wdFacts && !wikiSummary
      ? await getDriverFactsFromWikidata(d.fullName, { revalidate: 86400 })
      : null;

  // Unified read-side shape used throughout the rest of this component.
  const facts = {
    qid: wdFacts?.qid ?? legacyFacts?.qid,
    dob: wdFacts?.dob ?? legacyFacts?.dob,
    pob: wdFacts?.placeOfBirth ?? legacyFacts?.pob,
    height: wdFacts?.heightM ?? legacyFacts?.height,
    image: wdFacts?.imageUrl ?? legacyFacts?.image,
    extract: wikiSummary?.extract,
    description: wikiSummary?.description,
  } as const;

  // Pull race history once. Used for: career arc, last 5 races, debut year, current team color.
  const allResults = await jolpica.getDriverResults(slug, { revalidate: 86400 });

  // Build per-year aggregation for the career arc.
  const yearMap = new Map<
    number,
    { teamSlug: string; teamColor: string; teamName: string; bestPos: number }
  >();
  let totalWins = 0;
  for (const race of allResults) {
    const r = race.Results?.[0] ? mapResult(race.Results[0]) : undefined;
    if (!r) continue;
    const year = Number(race.season);
    const slugC = r.constructor.slug;
    const existing = yearMap.get(year);
    const bestPos =
      existing?.bestPos !== undefined && r.position
        ? Math.min(existing.bestPos, r.position)
        : r.position ?? existing?.bestPos ?? 99;
    yearMap.set(year, {
      teamSlug: slugC,
      teamColor: teamColorBySlug(slugC),
      teamName: r.constructor.name,
      bestPos,
    });
    if (r.position === 1) totalWins++;
  }

  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);
  const debutYear = sortedYears[0];
  const latestYear = sortedYears[sortedYears.length - 1];
  const currentEntry = latestYear ? yearMap.get(latestYear) : undefined;
  const currentTeamColor = currentEntry?.teamColor ?? '#444748';

  // Build the last 5 races for the recent-form panel (chronological, newest last → reverse).
  const last5 = allResults
    .slice()
    .sort((a, b) => Number(b.season) - Number(a.season) || Number(b.round) - Number(a.round))
    .slice(0, 5)
    .map((race) => {
      const r = race.Results?.[0] ? mapResult(race.Results[0]) : undefined;
      return {
        round: Number(race.round),
        raceName: race.raceName,
        country: race.Circuit.Location.country,
        position: r?.position ?? null,
        positionText: r?.positionText ?? '·',
        teamColor: r ? teamColorBySlug(r.constructor.slug) : '#444',
      };
    });

  // Career arc years
  const careerArcYears = sortedYears.map((y) => {
    const e = yearMap.get(y)!;
    return {
      year: y,
      teamSlug: e.teamSlug,
      teamColor: e.teamColor,
      teamName: e.teamName,
      bestResult: e.bestPos === 1 ? 'WIN' : e.bestPos <= 3 ? 'PODIUM' : `P${e.bestPos}`,
      // Champion detection requires a season-end standings query — left undefined here.
      isChampion: false,
    };
  });

  const age = (() => {
    if (!d.dob) return null;
    const dob = new Date(d.dob);
    return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
  })();

  // Unified hero lookup: Wikidata portrait → curated Unsplash by nationality
  // → abstract fallback. Returns null only if every path fails.
  const hero = await getDriverHeroImage({
    fullName: d.fullName,
    wikidataImage: facts?.image ?? null,
    wikiUrl: d.wikiUrl ?? null,
    nationality: d.nationality,
  });
  const heroImage = hero?.urlHero ?? (facts?.image ? commonsImageUrl(facts.image) : undefined);
  const heroAttribution =
    hero && hero.source !== 'wikidata' && hero.attributionName
      ? { name: hero.attributionName, profileUrl: hero.attributionUrl }
      : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: d.fullName,
    givenName: d.firstName,
    familyName: d.lastName,
    nationality: d.nationality,
    birthDate: d.dob,
    sameAs: [
      d.wikiUrl,
      facts?.qid && `https://www.wikidata.org/wiki/${facts.qid}`,
    ].filter(Boolean),
    url: `https://apex.gg/drivers/${d.slug}`,
    image: heroImage,
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ParallaxHero
        imageUrl={heroImage}
        objectPosition="center 18%"
        height="xl"
        accent="#e10600"
        rightStripeColor={currentTeamColor}
        alt={hero?.alt ?? ''}
        attribution={heroAttribution}
      >
        {/* TOP utility row */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 pt-12 md:px-grid-margin md:pt-16">
          <Link
            href="/drivers"
            className="group inline-flex items-center gap-2 text-data text-on-surface-variant transition-colors hover:text-telemetry-red"
            style={{ viewTransitionName: 'driver-back' }}
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            ALL DRIVERS
          </Link>
          <span className="text-data text-outline">
            {d.code ?? d.lastName.slice(0, 3).toUpperCase()} ·{' '}
            {currentEntry?.teamName ?? 'UNAFFILIATED'}
          </span>
        </div>

        {/* CENTER name block — breaks the grid */}
        <div className="relative z-10 mx-auto mt-auto flex w-full max-w-[1700px] flex-col gap-10 px-4 pb-20 md:px-grid-margin md:pb-32">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-2 w-12"
              style={{ backgroundColor: currentTeamColor }}
            />
            <span className="text-data text-on-surface-variant">DRIVER PROFILE</span>
          </div>

          <h1
            className="font-display uppercase leading-[0.82] tracking-[-0.04em] text-on-background"
            style={{
              fontSize: 'clamp(4.5rem, 18vw, 14rem)',
              viewTransitionName: `driver-name-${d.slug}`,
            }}
          >
            <span className="block text-[0.32em] font-headline tracking-[0.18em] text-on-surface-variant">
              {d.firstName}
            </span>
            <span className="-mt-2 block">{d.lastName}</span>
          </h1>

          {/* Driver number — display-lg, telemetry-red, count-up */}
          {d.number !== null && (
            <div className="flex items-end gap-6">
              <span className="text-data text-on-surface-variant">CAR NO.</span>
              <span
                className="font-display leading-none tracking-tighter text-telemetry-red"
                style={{
                  fontSize: 'clamp(5rem, 14vw, 11rem)',
                  viewTransitionName: `driver-number-${d.slug}`,
                }}
              >
                <CountUpBadge value={d.number} duration={1600} delay={400} />
              </span>
            </div>
          )}
        </div>
      </ParallaxHero>

      {/* STAT STRIP — 4 cards */}
      <StatStrip
        items={[
          {
            label: 'NATIONALITY',
            value: d.nationality,
            ornament: cc ? flagEmoji(cc) : '🏁',
          },
          {
            label: 'BORN',
            value: d.dob || facts?.dob || '·',
            sub: facts?.pob
              ? `in ${facts.pob}${age ? ` · age ${age}` : ''}`
              : age
                ? `age ${age}`
                : undefined,
          },
          {
            label: 'HEIGHT',
            value: facts?.height ? facts.height : '·',
            decimals: 2,
            suffix: ' m',
          },
          {
            label: 'DEBUT',
            value: debutYear ?? '·',
            sub: latestYear ? `latest · ${latestYear}` : undefined,
          },
        ]}
      />

      {/* CAREER ARC */}
      <section className="mx-auto w-full max-w-[1700px] px-4 py-24 md:px-grid-margin md:py-32">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-data text-telemetry-red">CAREER ARC</span>
            <h2 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
              {sortedYears.length} {sortedYears.length === 1 ? 'SEASON' : 'SEASONS'} ·{' '}
              <CountUpBadge value={totalWins} /> WINS
            </h2>
          </div>
          <p className="max-w-md font-editorial text-lg text-on-surface-variant md:text-xl">
            Every year on the grid mapped against the full Formula 1 timeline,
            shaded with the colors of every constructor {d.firstName} has raced for.
          </p>
        </header>

        <CareerArc years={careerArcYears} />
      </section>

      {/* RECENT FORM */}
      {last5.length > 0 && (
        <section className="border-t border-outline-variant/30">
          <div className="mx-auto w-full max-w-[1700px] px-4 py-24 md:px-grid-margin md:py-32">
            <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="text-data text-telemetry-red">RECENT FORM</span>
                <h2 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
                  Last 5 Races
                </h2>
              </div>
              <p className="max-w-md font-editorial text-lg text-on-surface-variant md:text-xl">
                Trend line above tracks finishing-position momentum across the
                most recent five Grands Prix.
              </p>
            </header>

            <RecentFormPanel races={last5} />
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative border-t border-outline-variant/30">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background: `radial-gradient(ellipse 800px 400px at 30% 50%, ${currentTeamColor}1f, transparent 60%)`,
          }}
        />
        <div className="relative mx-auto flex w-full max-w-[1700px] flex-col items-start gap-10 px-4 py-32 md:flex-row md:items-end md:justify-between md:px-grid-margin md:py-40">
          <div className="max-w-2xl">
            <span className="text-data text-telemetry-red">DEEPER</span>
            <h2 className="mt-3 font-display text-5xl uppercase leading-[0.9] tracking-[-0.03em] text-on-background md:text-7xl">
              Every race. Every season. Every point scored.
            </h2>
          </div>
          <MagneticButton
            href={`/drivers/${d.slug}/career`}
            // ViewTransition target so the hero name morphs into the career hero
            className="self-end"
          >
            Full career
          </MagneticButton>
        </div>
      </section>

      {/* REFERENCES (kept, restyled) */}
      <section className="border-t border-outline-variant/30 bg-surface-container-lowest/40">
        <div className="mx-auto grid w-full max-w-[1700px] grid-cols-1 gap-12 px-4 py-20 md:grid-cols-[1fr_auto] md:px-grid-margin">
          <div>
            <span className="text-data text-telemetry-red">SOURCES</span>
            <p className="mt-4 max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
              Profile facts via Wikidata SPARQL · race-by-race history via the
              Jolpica F1 mirror of Ergast · portrait imagery on Wikimedia Commons
              under CC BY SA. We never invent stats.
            </p>
          </div>
          <ul className="flex flex-col gap-3 self-end">
            <ReferenceLink href={d.wikiUrl} label="Wikipedia" />
            {facts?.qid && (
              <ReferenceLink
                href={`https://www.wikidata.org/wiki/${facts.qid}`}
                label={`Wikidata · ${facts.qid}`}
              />
            )}
          </ul>
        </div>
      </section>

      {/* Hidden ViewTransition seed: links between profile and career */}
      <ViewTransitionLink
        href={`/drivers/${d.slug}/career`}
        className="sr-only"
      >
        Career
      </ViewTransitionLink>
    </article>
  );
}

function ReferenceLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-3 border border-outline-variant/40 px-5 py-3 font-data text-xs uppercase tracking-[0.2em] text-on-surface-variant transition-colors hover:border-telemetry-red hover:text-telemetry-red"
      >
        {label}
        <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
          north_east
        </span>
      </a>
    </li>
  );
}
