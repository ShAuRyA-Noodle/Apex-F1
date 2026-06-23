/**
 * Weather sync cron.
 *
 * Fires every hour — pulls Open-Meteo forecast for the next 3 races on the
 * calendar so /schedule/[season]/[race] hero and RaceTickerBar weather chip
 * always serve a fresh sample.
 *
 * Open-Meteo has no rate limit and no key, so this is purely a cache-priming
 * tick. Quota cost: zero.
 *
 * Schedule: 0 * * * * via apps/web/vercel.json.
 * Auth: Vercel cron header OR Bearer CRON_SECRET.
 */

import { NextResponse } from 'next/server';
import { jolpica, mapRace } from '@apex/api-client/jolpica';
import { openmeteo } from '@apex/api-client/openmeteo';
import { revalidatePath } from 'next/cache';
import { buildReport, isAuthorizedCronRequest, logReport, retry } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const start = Date.now();

  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let upcoming: Array<{ slug: string; lat: number; lon: number; date: string }> = [];
  try {
    const races = (await retry(() => jolpica.getSchedule('current', { revalidate: 3600 }))).map(mapRace);
    const now = Date.now();
    upcoming = races
      .filter((r) => new Date(r.raceStartIso).getTime() > now)
      .slice(0, 3)
      .map((r) => ({ slug: r.slug, lat: r.lat, lon: r.lon, date: r.raceStartIso }));
  } catch (err) {
    const r = buildReport(start, {
      ok: false,
      route: 'weather-sync',
      error: `schedule fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    logReport(r);
    return NextResponse.json(r, { status: 500 });
  }

  const reports: Array<{ slug: string; ok: boolean; error?: string }> = [];
  for (const r of upcoming) {
    try {
      const day = r.date.slice(0, 10); // YYYY-MM-DD (race day)
      await retry(() =>
        openmeteo.getRaceWeather({ lat: r.lat, lon: r.lon, dateStart: day, dateEnd: day }),
      );
      reports.push({ slug: r.slug, ok: true });
    } catch (err) {
      reports.push({
        slug: r.slug,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    for (const r of upcoming) {
      revalidatePath(`/schedule/${new Date(r.date).getUTCFullYear()}/${r.slug}`);
    }
    revalidatePath('/');
  } catch {
    /* ignore */
  }

  const final = buildReport(start, {
    ok: reports.every((r) => r.ok),
    route: 'weather-sync',
    results: { races: reports, count: upcoming.length },
  });
  logReport(final);
  return NextResponse.json(final, { status: 200 });
}
