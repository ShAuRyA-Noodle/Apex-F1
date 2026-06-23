/**
 * jolpica-nightly
 *
 * Daily cron job · sync the current season:
 *   - Schedule (in case FIA / FOM revises)
 *   - Driver standings
 *   - Constructor standings
 *   - Latest finished race result
 *
 * Idempotent. Re-runs without harm.
 *
 * Usage:
 *   pnpm --filter @apex/workers jolpica:nightly
 *
 * Scheduling (Trigger.dev): cron '0 3 * * *' (03:00 UTC daily)
 */

import { eq, and } from 'drizzle-orm';
import {
  jolpica,
  mapRace,
  mapDriverStanding,
  mapConstructorStanding,
} from '@apex/api-client/jolpica';
import { getDb, schema } from '@apex/db';
import { runWorker } from './lib/runner';

async function main() {
  await runWorker('jolpica-nightly', async ({ log, bump }) => {
    const db = getDb();
    const year = new Date().getUTCFullYear();

    log(`season ${year}`);
    await db
      .insert(schema.season)
      .values({ year, status: 'active' })
      .onConflictDoUpdate({ target: schema.season.year, set: { status: 'active', updatedAt: new Date() } });

    const schedule = (await jolpica.getSchedule(year, { revalidate: 0 })).map(mapRace);
    log(`schedule rounds: ${schedule.length}`);

    let lastFinishedRound = 0;
    for (const r of schedule) {
      const status = new Date(r.raceStartIso) < new Date() ? 'completed' : 'upcoming';
      if (status === 'completed') lastFinishedRound = Math.max(lastFinishedRound, r.round);

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
          dateStart: new Date(r.raceStartIso),
          isSprint: r.sessions.some((s) => s.kind === 'S'),
          status,
          wikiUrl: r.wikiUrl,
        })
        .onConflictDoUpdate({
          target: [schema.race.seasonYear, schema.race.round],
          set: {
            status,
            slug: r.slug,
            name: r.name,
            dateStart: new Date(r.raceStartIso),
            updatedAt: new Date(),
          },
        });
      bump({ itemsOut: 1 });
    }

    const drivers = (await jolpica.getDriverStandings(year, { revalidate: 0 })).map(mapDriverStanding);
    log(`driver standings: ${drivers.length}`);
    for (const s of drivers) {
      const [driverRow] = await db
        .select({ id: schema.driver.id })
        .from(schema.driver)
        .where(eq(schema.driver.slug, s.driver.slug));
      if (!driverRow) continue;
      await db
        .insert(schema.standingDriver)
        .values({
          seasonYear: year,
          round: lastFinishedRound,
          driverId: driverRow.id,
          position: s.position,
          points: s.points,
          wins: s.wins,
        })
        .onConflictDoUpdate({
          target: [
            schema.standingDriver.seasonYear,
            schema.standingDriver.round,
            schema.standingDriver.driverId,
          ],
          set: {
            position: s.position,
            points: s.points,
            wins: s.wins,
            updatedAt: new Date(),
          },
        });
      bump({ itemsOut: 1 });
    }

    const teams = (await jolpica.getConstructorStandings(year, { revalidate: 0 })).map(mapConstructorStanding);
    log(`constructor standings: ${teams.length}`);
    for (const t of teams) {
      const [teamRow] = await db
        .select({ id: schema.team.id })
        .from(schema.team)
        .where(eq(schema.team.slug, t.constructor.slug));
      if (!teamRow) continue;
      await db
        .insert(schema.standingTeam)
        .values({
          seasonYear: year,
          round: lastFinishedRound,
          teamId: teamRow.id,
          position: t.position,
          points: t.points,
          wins: t.wins,
        })
        .onConflictDoUpdate({
          target: [
            schema.standingTeam.seasonYear,
            schema.standingTeam.round,
            schema.standingTeam.teamId,
          ],
          set: { position: t.position, points: t.points, wins: t.wins, updatedAt: new Date() },
        });
      bump({ itemsOut: 1 });
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
