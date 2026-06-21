import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapDriver } from '@apex/api-client/jolpica';
import { getDriverFactsFromWikidata } from '@apex/api-client/wikidata';
import { nationalityToCountryCode, flagEmoji } from '@/lib/format';

export const revalidate = 86400;

function commonsImageUrl(wikidataImage: string): string {
  // Wikidata returns URLs like "http://commons.wikimedia.org/wiki/Special:FilePath/Some%20File.jpg"
  // which serve the file directly. Append a width param for sane sizing.
  const u = new URL(wikidataImage);
  u.searchParams.set('width', '800');
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
    description: `${d.fullName} — Formula 1 driver profile, career stats, biography.`,
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
  const facts = await getDriverFactsFromWikidata(d.fullName, { revalidate: 86400 });

  const age = (() => {
    if (!d.dob) return null;
    const dob = new Date(d.dob);
    return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
  })();

  const heroImage = facts?.image ? commonsImageUrl(facts.image) : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: d.fullName,
    givenName: d.firstName,
    familyName: d.lastName,
    nationality: d.nationality,
    birthDate: d.dob,
    sameAs: [d.wikiUrl, facts?.qid && `https://www.wikidata.org/wiki/${facts.qid}`].filter(Boolean),
    url: `https://apex.gg/drivers/${d.slug}`,
    image: heroImage,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="relative overflow-hidden border-b border-outline-variant/30 bg-surface-container-lowest">
        {heroImage && (
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="absolute right-0 top-0 hidden h-full w-[55%] object-cover opacity-50 lg:block"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent lg:block"
        />

        <div className="relative mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-10 px-4 py-16 md:grid-cols-[1fr_auto] md:items-end md:px-grid-margin md:py-24">
          <div>
            <Link
              href="/drivers"
              className="text-data inline-flex items-center gap-1 text-outline transition-colors hover:text-on-background"
            >
              ← ALL DRIVERS
            </Link>
            <div className="mt-6 flex items-center gap-3">
              <span className="text-data text-telemetry-red">{d.code ?? d.lastName.slice(0, 3).toUpperCase()}</span>
              <span className="h-px w-8 bg-outline" />
              <span className="text-data text-outline">DRIVER</span>
            </div>
            <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-8xl">
              <span className="block text-outline">{d.firstName}</span>
              <span className="block">{d.lastName}</span>
            </h1>
          </div>
          <div className="font-data text-[120px] leading-none text-telemetry-red md:text-[200px]">
            {d.number ?? '–'}
          </div>
        </div>
      </header>

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-px bg-outline-variant/40 px-0 md:grid-cols-4 md:px-grid-margin">
          <Stat label="NATIONALITY" value={`${flagEmoji(cc)} ${d.nationality}`} />
          <Stat
            label="BORN"
            value={d.dob || facts?.dob || '—'}
            sub={facts?.pob ? `in ${facts.pob}` : age ? `age ${age}` : undefined}
          />
          <Stat label="NUMBER" value={d.number ? `#${d.number}` : '—'} />
          <Stat label="HEIGHT" value={facts?.height ? `${facts.height} m` : '—'} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
        <Link
          href={`/drivers/${d.slug}/career`}
          className="group inline-flex items-center gap-3 bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
        >
          Full career — every race
          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
        </Link>

        <h2 className="text-data mt-16 text-telemetry-red">REFERENCES</h2>
        <ul className="mt-4 space-y-3 font-editorial text-lg text-on-surface md:text-xl">
          <li>
            <a
              href={d.wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-surface transition-colors hover:text-telemetry-red"
            >
              Wikipedia →
            </a>
          </li>
          {facts?.qid && (
            <li>
              <a
                href={`https://www.wikidata.org/wiki/${facts.qid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface transition-colors hover:text-telemetry-red"
              >
                Wikidata ({facts.qid}) →
              </a>
            </li>
          )}
        </ul>
        <p className="mt-12 max-w-3xl font-editorial text-base text-on-surface-variant">
          Career stats by season + race-by-race results land in Phase B Wave 4 (DB-backed
          historical ingest of every result 1950 → present). Profile imagery and place-of-birth
          courtesy of Wikidata (CC-BY-SA), per data licensing.
        </p>
      </section>
    </article>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-background p-6 md:p-8">
      <div className="text-data text-outline">{label}</div>
      <div className="mt-2 font-headline text-2xl text-on-background md:text-3xl">{value}</div>
      {sub && <div className="mt-1 text-data text-on-surface-variant">{sub}</div>}
    </div>
  );
}
