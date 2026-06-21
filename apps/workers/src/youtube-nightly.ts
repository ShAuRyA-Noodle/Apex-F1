/**
 * youtube-nightly
 *
 * Nightly poll of curated F1 YouTube channels via public channel-RSS feeds.
 * Writes new entries into the `video` table.
 *
 * Idempotent on (provider, provider_asset_id) — re-running is a no-op for
 * already-ingested videos.
 *
 * Usage:
 *   pnpm --filter @apex/workers youtube:nightly
 *
 * Scheduling (Trigger.dev): cron '15 4 * * *' (04:15 UTC daily)
 */

import { eq, and } from 'drizzle-orm';
import { getF1Videos, YT_F1_CHANNELS } from '@apex/api-client/youtube';
import { getDb, schema } from '@apex/db';
import { runWorker } from './lib/runner';

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  await runWorker('youtube-nightly', async ({ log, bump }) => {
    const db = getDb();

    for (const channel of YT_F1_CHANNELS) {
      const videos = await getF1Videos({
        channels: [channel],
        limit: 30,
        revalidate: 0,
      });
      log(`${channel.name}: ${videos.length} candidates`);
      bump({ itemsIn: videos.length });

      for (const v of videos) {
        if (!v.videoId) continue;
        const exists = await db
          .select({ id: schema.video.id })
          .from(schema.video)
          .where(
            and(
              eq(schema.video.provider, 'youtube'),
              eq(schema.video.providerAssetId, v.videoId),
            ),
          );
        if (exists.length > 0) continue;

        await db.insert(schema.video).values({
          slug: slugify(`${channel.name}-${v.videoId}`),
          provider: 'youtube',
          providerAssetId: v.videoId,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
          channelName: v.channelName,
          publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
        });
        bump({ itemsOut: 1 });
      }
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
