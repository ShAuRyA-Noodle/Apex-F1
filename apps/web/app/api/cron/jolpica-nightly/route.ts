/**
 * Jolpica nightly sync cron.
 *
 * Fires daily at 03:00 UTC · pulls current season schedule + driver standings
 * + constructor standings to keep the cache primed before the morning UK news
 * cycle. Race week the schedule can change last-minute (FIA revisions, weather
 * postponements) so daily resync is the minimum cadence.
 *
 * Schedule: 0 3 * * * via apps/web/vercel.json.
 * Auth: Vercel cron header OR Bearer CRON_SECRET.
 *
 * Persistence: writes to Supabase race + standing_driver + standing_team tables
 * via @apex/workers when DATABASE_URL present. Until DB lands, the route warms
 * the Next.js fetch cache so first-of-the-day visitors get a fresh page.
 */

import { NextResponse } from 'next/server';
import {
  jolpica,
  mapRace,
  mapDriverStanding,
  mapConstructorStanding,
} from '@apex/api-client/jolpica';
import { revalidatePath } from 'next/cache';
import { buildReport, isAuthorizedCronRequest, logReport, retry, timed } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const start = Date.now();

  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const errors: string[] = [];
  const counts: Record<string, number> = {};
  const timings: Record<string, number> = {};

  // Fetch in parallel; each branch isolates its own failure. retry() wraps
  // upstream so Jolpica 429s during morning quota rollover don't kill a tick.
  const [scheduleRes, driverRes, teamRes] = await Promise.allSettled([
    timed(() => retry(() => jolpica.getSchedule('current', { revalidate: 60 })).then((rs) => rs.map(mapRace))),
    timed(() => retry(() => jolpica.getDriverStandings('current', { revalidate: 60 })).then((rs) => rs.map(mapDriverStanding))),
    timed(() => retry(() => jolpica.getConstructorStandings('current', { revalidate: 60 })).then((rs) => rs.map(mapConstructorStanding))),
  ]);

  if (scheduleRes.status === 'fulfilled') {
    counts['schedule_rounds'] = scheduleRes.value[0].length;
    timings['scheduleMs'] = scheduleRes.value[1];
  } else {
    errors.push(`schedule: ${String(scheduleRes.reason)}`);
  }
  if (driverRes.status === 'fulfilled') {
    counts['driver_standings'] = driverRes.value[0].length;
    timings['driverStandingsMs'] = driverRes.value[1];
  } else {
    errors.push(`drivers: ${String(driverRes.reason)}`);
  }
  if (teamRes.status === 'fulfilled') {
    counts['constructor_standings'] = teamRes.value[0].length;
    timings['constructorStandingsMs'] = teamRes.value[1];
  } else {
    errors.push(`constructors: ${String(teamRes.reason)}`);
  }

  // Bust path caches so first morning visitor gets fresh standings.
  const year = new Date().getUTCFullYear();
  try {
    revalidatePath('/');
    revalidatePath('/schedule');
    revalidatePath(`/results/${year}/drivers`);
    revalidatePath(`/results/${year}/teams`);
    revalidatePath('/drivers');
    revalidatePath('/teams');
  } catch {
    /* ignore */
  }

  const ok = errors.length === 0;
  const report = buildReport(start, {
    ok,
    route: 'jolpica-nightly',
    results: { counts, errors, timings },
  });
  logReport(report);
  return NextResponse.json(report, { status: ok ? 200 : 207 });
}
