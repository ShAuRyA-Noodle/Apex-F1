import { getF1NewsFeed } from '@apex/api-client/rss';
import { jolpica, mapRace, type UiRace } from '@apex/api-client/jolpica';
import { MegaNav, type MegaNavLivePreviews } from './MegaNav';

/**
 * Server wrapper around the client MegaNav. Fetches the data needed to
 * fill the "Latest" and "Schedule" dropdown previews and hands them to
 * the interactive shell as a prop.
 *
 * Closes audit-shell P1 findings:
 *   - MegaNav.tsx:60-64  Latest preview was hardcoded "Verstappen reacts to Singapore..."
 *   - MegaNav.tsx:86-91  Schedule preview was hardcoded "Marina Bay · 13d 4h"
 *
 * Both now derive from the same sources the rest of the site uses:
 *   - getF1NewsFeed()  →  same aggregator powering /latest and the homepage rails
 *   - jolpica.getSchedule('current')  →  same source the RaceTickerBar uses
 *
 * Cache windows match the underlying surfaces so we don't introduce a
 * second-source-of-truth race for cache invalidation.
 */
function relativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const delta = Date.now() - ms;
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function nextRace(races: UiRace[]): UiRace | null {
  const now = Date.now();
  const sorted = races.slice().sort((a, b) => a.round - b.round);
  return sorted.find((r) => new Date(r.raceStartIso).getTime() > now) ?? null;
}

function countdownMeta(iso: string): string {
  const delta = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(delta) || delta <= 0) return 'LIVE NOW';
  const d = Math.floor(delta / 86_400_000);
  const h = Math.floor((delta % 86_400_000) / 3_600_000);
  if (d > 0) return `Lights out · ${d}d ${h}h`;
  const m = Math.floor((delta % 3_600_000) / 60_000);
  return `Lights out · ${h}h ${m}m`;
}

export async function MegaNavServer() {
  const previews: MegaNavLivePreviews = {};

  // Latest preview · first item from the unified F1 news aggregator.
  try {
    const items = await getF1NewsFeed({ limit: 1, revalidate: 300 });
    const top = items[0];
    if (top) {
      previews.latest = {
        eyebrow: top.source.toUpperCase(),
        title: top.title,
        href: top.link,
        meta: [relativeTime(top.pubDate), top.source].filter(Boolean).join(' · '),
      };
    }
  } catch {
    /* leave undefined · MegaNav renders no preview card rather than fake data */
  }

  // Schedule preview · next race on the calendar.
  try {
    const races = (await jolpica.getSchedule('current', { revalidate: 600 })).map(mapRace);
    const next = nextRace(races);
    if (next) {
      previews.schedule = {
        eyebrow: 'NEXT ROUND',
        title: next.circuitName,
        href: `/schedule/${next.season}/${next.slug}`,
        meta: countdownMeta(next.raceStartIso),
      };
    }
  } catch {
    /* leave undefined */
  }

  return <MegaNav previews={previews} />;
}
