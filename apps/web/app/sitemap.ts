import type { MetadataRoute } from 'next';
import { jolpica, mapDriverStanding, mapConstructorStanding, mapRace } from '@apex/api-client/jolpica';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apex.gg';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE}/schedule`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/results/2026/drivers`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE}/results/2026/teams`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE}/drivers`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/teams`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/latest`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE}/video`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE}/live/timing`, lastModified: now, changeFrequency: 'always', priority: 0.6 },
    { url: `${SITE}/live/race-control`, lastModified: now, changeFrequency: 'always', priority: 0.5 },
    { url: `${SITE}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/legal/disclaimer`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/legal/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const [drivers, teams, races] = await Promise.all([
      jolpica.getDriverStandings('current', { revalidate: 86400 }),
      jolpica.getConstructorStandings('current', { revalidate: 86400 }),
      jolpica.getSchedule('current', { revalidate: 86400 }),
    ]);

    const driverRoutes = drivers.map(mapDriverStanding).map((d): MetadataRoute.Sitemap[number] => ({
      url: `${SITE}/drivers/${d.driver.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const teamRoutes = teams.map(mapConstructorStanding).map((t): MetadataRoute.Sitemap[number] => ({
      url: `${SITE}/teams/${t.constructor.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const raceRoutes = races.map(mapRace).flatMap((r): MetadataRoute.Sitemap => [
      {
        url: `${SITE}/schedule/${r.season}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      {
        url: `${SITE}/schedule/${r.season}/${r.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      },
    ]);

    return [...staticRoutes, ...driverRoutes, ...teamRoutes, ...raceRoutes];
  } catch {
    return staticRoutes;
  }
}
