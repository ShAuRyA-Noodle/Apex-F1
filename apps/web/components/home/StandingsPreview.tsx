import Link from 'next/link';
import {
  jolpica,
  mapDriverStanding,
  mapConstructorStanding,
} from '@apex/api-client/jolpica';
import { teamColorBySlug } from '@/lib/format';
import { StandingsPreviewTabs } from './StandingsPreviewTabs';

export async function StandingsPreview() {
  const [driverRaw, constructorRaw] = await Promise.all([
    jolpica.getDriverStandings('current', { revalidate: 600 }),
    jolpica.getConstructorStandings('current', { revalidate: 600 }),
  ]);

  const drivers = driverRaw.slice(0, 10).map(mapDriverStanding);
  const constructors = constructorRaw.slice(0, 10).map(mapConstructorStanding);

  const driverRows = drivers.map((d) => ({
    pos: d.position,
    label: d.driver.fullName,
    meta: d.driver.code,
    points: d.points,
    wins: d.wins,
    color: teamColorBySlug(d.constructorSlug),
    href: `/drivers/${d.driver.slug}`,
  }));

  const constructorRows = constructors.map((c) => ({
    pos: c.position,
    label: c.constructor.name,
    meta: c.constructor.nationality,
    points: c.points,
    wins: c.wins,
    color: teamColorBySlug(c.constructor.slug),
    href: `/teams/${c.constructor.slug}`,
  }));

  return (
    <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-data text-telemetry-red">CURRENT STANDINGS</h2>
            <p className="mt-2 font-editorial text-3xl text-on-background md:text-4xl">
              The championship, today
            </p>
          </div>
          <div className="text-data text-outline">SOURCE: JOLPICA F1 · LIVE</div>
        </div>

        <StandingsPreviewTabs driverRows={driverRows} constructorRows={constructorRows} />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/results/current/drivers"
            className="inline-flex items-center justify-center gap-2 border border-outline-variant px-5 py-3 text-data text-on-surface transition-colors hover:border-telemetry-red"
          >
            FULL DRIVER STANDINGS
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
          <Link
            href="/results/current/teams"
            className="inline-flex items-center justify-center gap-2 border border-outline-variant px-5 py-3 text-data text-on-surface transition-colors hover:border-telemetry-red"
          >
            FULL CONSTRUCTOR STANDINGS
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
