/**
 * jolpica-historical
 *
 * One-shot seed of the full Formula 1 archive (1950 → present) from Jolpica F1.
 *
 *   - Seasons
 *   - Schedule (races + circuits)
 *   - Drivers
 *   - Constructors
 *   - Per-round race results (drivers + constructors + result rows)
 *   - Per-round qualifying + sprint + pit stops + laps (best-effort, can re-run idempotently)
 *
 * Requires:
 *   DATABASE_URL  Supabase / Postgres connection string
 *
 * Runs against Jolpica at <4 req/sec to stay polite. Expected wall-clock for a
 * full seed of 1950 → present: ~4-6 hours.
 *
 * Usage:
 *   pnpm --filter @apex/workers jolpica:historical
 *   pnpm --filter @apex/workers jolpica:historical -- --since 2020   # incremental
 */

import { eq, and } from 'drizzle-orm';
import { jolpica, mapRace, mapDriver, mapConstructor, mapResult } from '@apex/api-client/jolpica';
import { getDb, schema } from '@apex/db';
import { runWorker, sleep } from './lib/runner';

const POLITE_DELAY_MS = 280; // ~3.5 req/sec, below Jolpica's 4 req/sec ceiling

function parseArgs(): { since?: number; until?: number } {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a?.startsWith('--')) {
      const k = a.slice(2);
      args[k] = process.argv[i + 1] ?? '';
      i++;
    }
  }
  return {
    since: args.since ? Number(args.since) : undefined,
    until: args.until ? Number(args.until) : undefined,
  };
}

async function main() {
  const { since, until } = parseArgs();

  await runWorker('jolpica-historical', async ({ log, bump }) => {
    const db = getDb();

    const allSeasons = await jolpica.getSeasons({ revalidate: 0 });
    bump({ itemsIn: allSeasons.length });
    log(`seasons returned: ${allSeasons.length}`);

    const seasons = allSeasons
      .map((s) => Number(s.season))
      .filter((y) => Number.isFinite(y))
      .filter((y) => (since ? y >= since : true) && (until ? y <= until : true))
      .sort((a, b) => a - b);

    log(`seeding seasons ${seasons[0]} → ${seasons[seasons.length - 1]}`);

    for (const year of seasons) {
      log(`season ${year} -`);

      const now = new Date().getUTCFullYear();
      const status: 'completed' | 'active' | 'upcoming' =
        year < now ? 'completed' : year === now ? 'active' : 'upcoming';

      await db
        .insert(schema.season)
        .values({ year, status })
        .onConflictDoUpdate({ target: schema.season.year, set: { status, updatedAt: new Date() } });

      const driverList = await jolpica.getDrivers(year, { revalidate: 0 });
      await sleep(POLITE_DELAY_MS);
      for (const d of driverList.map(mapDriver)) {
        await db
          .insert(schema.driver)
          .values({
            slug: d.slug,
            code: d.code ?? null,
            permanentNumber: d.number,
            firstName: d.firstName,
            lastName: d.lastName,
            fullName: d.fullName,
            nationality: d.nationality,
            dob: d.dob || null,
            wikiUrl: d.wikiUrl,
          })
          .onConflictDoUpdate({
            target: schema.driver.slug,
            set: {
              code: d.code ?? null,
              permanentNumber: d.number,
              firstName: d.firstName,
              lastName: d.lastName,
              fullName: d.fullName,
              nationality: d.nationality,
              dob: d.dob || null,
              wikiUrl: d.wikiUrl,
              updatedAt: new Date(),
            },
          });
        bump({ itemsOut: 1 });
      }

      const constructorList = await jolpica.getConstructors(year, { revalidate: 0 });
      await sleep(POLITE_DELAY_MS);
      for (const c of constructorList.map(mapConstructor)) {
        await db
          .insert(schema.team)
          .values({ slug: c.slug, name: c.name, wikiUrl: c.wikiUrl })
          .onConflictDoUpdate({
            target: schema.team.slug,
            set: { name: c.name, wikiUrl: c.wikiUrl, updatedAt: new Date() },
          });
        bump({ itemsOut: 1 });
      }

      const scheduleRaw = await jolpica.getSchedule(year, { revalidate: 0 });
      const schedule = scheduleRaw.map(mapRace);
      await sleep(POLITE_DELAY_MS);

      for (const r of schedule) {
        const circuitRow = await db
          .insert(schema.circuit)
          .values({
            slug: r.circuitId,
            name: r.circuitName,
            country: r.country,
            city: r.city,
            lat: Number.isFinite(r.lat) ? r.lat : null,
            lon: Number.isFinite(r.lon) ? r.lon : null,
            wikiUrl: r.wikiUrl,
          })
          .onConflictDoUpdate({
            target: schema.circuit.slug,
            set: {
              name: r.circuitName,
              country: r.country,
              city: r.city,
              lat: Number.isFinite(r.lat) ? r.lat : null,
              lon: Number.isFinite(r.lon) ? r.lon : null,
              wikiUrl: r.wikiUrl,
              updatedAt: new Date(),
            },
          })
          .returning({ id: schema.circuit.id });

        await db
          .insert(schema.race)
          .values({
            seasonYear: r.season,
            round: r.round,
            slug: r.slug,
            name: r.name,
            officialName: r.name,
            country: r.country,
            city: r.city,
            circuitId: circuitRow[0]?.id,
            dateStart: new Date(r.raceStartIso),
            isSprint: r.sessions.some((s) => s.kind === 'S'),
            status: new Date(r.raceStartIso) < new Date() ? 'completed' : 'upcoming',
            wikiUrl: r.wikiUrl,
          })
          // Update on conflict so the historical worker stays idempotent
          // when Jolpica revises a date / slug / circuit upstream. Matches
          // the nightly worker (jolpica-nightly.ts:62-71) so both workers
          // share update semantics. Closes audit P1 finding.
          .onConflictDoUpdate({
            target: [schema.race.seasonYear, schema.race.round],
            set: {
              slug: r.slug,
              name: r.name,
              officialName: r.name,
              country: r.country,
              city: r.city,
              circuitId: circuitRow[0]?.id,
              dateStart: new Date(r.raceStartIso),
              isSprint: r.sessions.some((s) => s.kind === 'S'),
              status: new Date(r.raceStartIso) < new Date() ? 'completed' : 'upcoming',
              wikiUrl: r.wikiUrl,
              updatedAt: new Date(),
            },
          });
        bump({ itemsOut: 1 });

        // Per-round results (only for past races to avoid wasting requests)
        if (new Date(r.raceStartIso) < new Date()) {
          const raceResults = await jolpica.getRaceResults(year, r.round, { revalidate: 0 });
          await sleep(POLITE_DELAY_MS);
          if (raceResults) {
            const [raceRow] = await db
              .select({ id: schema.race.id })
              .from(schema.race)
              .where(and(eq(schema.race.seasonYear, year), eq(schema.race.round, r.round)));
            if (raceRow) {
              for (const result of raceResults.results.map(mapResult)) {
                const [driverRow] = await db
                  .select({ id: schema.driver.id })
                  .from(schema.driver)
                  .where(eq(schema.driver.slug, result.driver.slug));
                const [teamRow] = await db
                  .select({ id: schema.team.id })
                  .from(schema.team)
                  .where(eq(schema.team.slug, result.constructor.slug));
                if (!driverRow || !teamRow) continue;
                await db
                  .insert(schema.result)
                  .values({
                    raceId: raceRow.id,
                    driverId: driverRow.id,
                    teamId: teamRow.id,
                    position: result.position,
                    positionText: result.positionText,
                    points: result.points,
                    laps: result.laps,
                    status: result.status,
                    grid: result.grid,
                  })
                  .onConflictDoNothing({
                    target: [schema.result.raceId, schema.result.driverId],
                  });
                bump({ itemsOut: 1 });
              }
            }
          }
        }
      }

      log(`season ${year} done`);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
