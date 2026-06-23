import { getDb } from './client';
import { season, driver, team, standingDriver, standingTeam } from './schema';

export interface DriverStandingSeed {
  slug: string;
  code: string;
  number: number | null;
  firstName: string;
  lastName: string;
  fullName: string;
  nationality: string;
  position: number;
  points: number;
  wins: number;
}

export interface TeamStandingSeed {
  slug: string;
  name: string;
  position: number;
  points: number;
  wins: number;
}

/**
 * Self-seeding persistence of a season's standings: upserts the season, then
 * each driver + team (so the FK targets exist), then the latest standings
 * snapshot (round 0). Idempotent. Returns counts; never throws.
 */
export async function persistCurrentSeason(
  year: number,
  drivers: DriverStandingSeed[],
  teams: TeamStandingSeed[],
): Promise<{ drivers: number; teams: number }> {
  if (!process.env['DATABASE_URL']) return { drivers: 0, teams: 0 };
  try {
    const db = getDb();

    await db
      .insert(season)
      .values({ year, status: 'active' })
      .onConflictDoUpdate({ target: season.year, set: { status: 'active', updatedAt: new Date() } });

    let dn = 0;
    for (const d of drivers) {
      const [row] = await db
        .insert(driver)
        .values({
          slug: d.slug,
          code: d.code,
          permanentNumber: d.number,
          firstName: d.firstName,
          lastName: d.lastName,
          fullName: d.fullName,
          nationality: d.nationality,
        })
        .onConflictDoUpdate({
          target: driver.slug,
          set: { fullName: d.fullName, code: d.code, nationality: d.nationality },
        })
        .returning({ id: driver.id });
      if (!row) continue;
      await db
        .insert(standingDriver)
        .values({
          seasonYear: year,
          driverId: row.id,
          round: 0,
          position: d.position,
          points: d.points,
          wins: d.wins,
        })
        .onConflictDoUpdate({
          target: [standingDriver.seasonYear, standingDriver.round, standingDriver.driverId],
          set: { position: d.position, points: d.points, wins: d.wins },
        });
      dn++;
    }

    let tn = 0;
    for (const t of teams) {
      const [row] = await db
        .insert(team)
        .values({ slug: t.slug, name: t.name })
        .onConflictDoUpdate({ target: team.slug, set: { name: t.name } })
        .returning({ id: team.id });
      if (!row) continue;
      await db
        .insert(standingTeam)
        .values({
          seasonYear: year,
          teamId: row.id,
          round: 0,
          position: t.position,
          points: t.points,
          wins: t.wins,
        })
        .onConflictDoUpdate({
          target: [standingTeam.seasonYear, standingTeam.round, standingTeam.teamId],
          set: { position: t.position, points: t.points, wins: t.wins },
        });
      tn++;
    }

    return { drivers: dn, teams: tn };
  } catch {
    return { drivers: 0, teams: 0 };
  }
}
