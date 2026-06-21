import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapDriver } from '@apex/api-client/jolpica';
import { nationalityToCountryCode, flagEmoji } from '@/lib/format';

export const revalidate = 86400;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const raw = await jolpica.getDriver(slug);
  if (!raw) return { title: 'Driver not found' };
  const d = mapDriver(raw);
  return {
    title: d.fullName,
    description: `${d.fullName} — Formula 1 career profile, stats, races.`,
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

  const age = (() => {
    if (!d.dob) return null;
    const dob = new Date(d.dob);
    const ms = Date.now() - dob.getTime();
    return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  })();

  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-10 px-4 py-16 md:grid-cols-[1fr_auto] md:items-end md:px-grid-margin md:py-24">
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
          <Stat label="BORN" value={d.dob} sub={age ? `age ${age}` : undefined} />
          <Stat label="NUMBER" value={d.number ? `#${d.number}` : '—'} />
          <Stat label="CODE" value={d.code ?? '—'} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
        <h2 className="text-data text-telemetry-red">CAREER</h2>
        <p className="mt-4 max-w-3xl font-editorial text-xl leading-relaxed text-on-surface-variant md:text-2xl">
          Driver bio + season-by-season results land in Phase B as part of the historical archive
          ingest (Jolpica 1950→present). Reference data is already live from{' '}
          <a href={d.wikiUrl} className="text-telemetry-red underline" target="_blank" rel="noopener noreferrer">
            Wikipedia
          </a>
          .
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
