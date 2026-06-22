import type { Metadata } from 'next';
import {
  jolpica,
  mapDriverStanding,
  mapConstructorStanding,
  mapRace,
} from '@apex/api-client/jolpica';
import { SearchClient } from './search-client';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Formula 1 drivers, teams, and races.',
};

export type SearchItem = {
  kind: 'driver' | 'team' | 'race';
  slug: string;
  title: string;
  meta: string;
  href: string;
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;

  const [driverRaw, constructorRaw, scheduleRaw] = await Promise.all([
    jolpica.getDriverStandings('current', { revalidate: 1800 }),
    jolpica.getConstructorStandings('current', { revalidate: 1800 }),
    jolpica.getSchedule('current', { revalidate: 3600 }),
  ]);

  const drivers = driverRaw.map(mapDriverStanding);
  const constructors = constructorRaw.map(mapConstructorStanding);
  const races = scheduleRaw.map(mapRace);

  const items: SearchItem[] = [
    ...drivers.map((d): SearchItem => ({
      kind: 'driver',
      slug: d.driver.slug,
      title: d.driver.fullName,
      meta: `${d.driver.code} · ${d.constructorName} · P${d.position} · ${d.points} pts`,
      href: `/drivers/${d.driver.slug}`,
    })),
    ...constructors.map((c): SearchItem => ({
      kind: 'team',
      slug: c.constructor.slug,
      title: c.constructor.name,
      meta: `${c.constructor.nationality} · P${c.position} · ${c.points} pts`,
      href: `/teams/${c.constructor.slug}`,
    })),
    ...races.map((r): SearchItem => ({
      kind: 'race',
      slug: r.slug,
      title: r.name,
      meta: `R${r.round} · ${r.country} · ${r.circuitName}`,
      href: `/schedule/${r.season}/${r.slug}`,
    })),
  ];

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header>
        <span className="text-data text-telemetry-red">SEARCH</span>
        <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          Find anything
        </h1>
        <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
          Drivers · constructors · races · current season. Archive search lands in Phase B
          Wave 4 (Meilisearch over the 1950 to present DB).
        </p>
      </header>

      <div className="mt-12">
        <SearchClient items={items} initialQuery={q ?? ''} />
      </div>
    </article>
  );
}
