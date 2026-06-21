import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { jolpica, mapConstructor } from '@apex/api-client/jolpica';
import { nationalityToCountryCode, flagEmoji, teamColorBySlug } from '@/lib/format';

export const revalidate = 86400;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const raw = await jolpica.getConstructor(slug);
  if (!raw) return { title: 'Team not found' };
  const c = mapConstructor(raw);
  return {
    title: c.name,
    description: `${c.name} — Formula 1 constructor profile, history, drivers.`,
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

  return (
    <article>
      <header className="relative overflow-hidden border-b border-outline-variant/30">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2"
          style={{ backgroundColor: color }}
        />
        <div className="mx-auto w-full max-w-[1600px] px-4 py-20 md:px-grid-margin md:py-32">
          <Link
            href="/teams"
            className="text-data inline-flex items-center gap-1 text-outline transition-colors hover:text-on-background"
          >
            ← ALL TEAMS
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <span className="text-data text-telemetry-red">CONSTRUCTOR</span>
            <span className="h-px w-8 bg-outline" />
            <span className="text-data text-outline">
              {flagEmoji(cc)} {c.nationality}
            </span>
          </div>
          <h1 className="mt-4 font-display text-6xl uppercase tracking-tight text-on-background md:text-9xl">
            {c.name}
          </h1>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
        <Link
          href={`/teams/${c.slug}/history`}
          className="group inline-flex items-center gap-3 bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
        >
          Full history — 10-season breakdown
          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
        </Link>

        <h2 className="text-data mt-16 text-telemetry-red">ABOUT</h2>
        <p className="mt-4 max-w-3xl font-editorial text-xl leading-relaxed text-on-surface-variant md:text-2xl">
          Full constructor history (founding year, base, principals, championships, season-by-season
          chart) lands in Phase B with the Wikidata seed + historical results ingest. Reference data
          live from{' '}
          <a href={c.wikiUrl} className="text-telemetry-red underline" target="_blank" rel="noopener noreferrer">
            Wikipedia
          </a>
          .
        </p>
      </section>
    </article>
  );
}
