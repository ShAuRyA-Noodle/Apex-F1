import { getDb } from './client';
import { video } from './schema';

export interface PersistVideoInput {
  videoId: string;
  title: string;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  channelName?: string | null;
  publishedAt?: string | null;
}

/**
 * Idempotent upsert of YouTube videos into the `video` table, keyed on the
 * deterministic `yt-<videoId>` slug. Returns the number of rows written.
 * Called by the youtube-sync cron; never throws (returns 0 on any failure).
 */
export async function persistVideos(rows: PersistVideoInput[]): Promise<number> {
  if (!process.env['DATABASE_URL'] || rows.length === 0) return 0;
  try {
    const db = getDb();
    let n = 0;
    for (const v of rows) {
      if (!v.videoId || !v.title) continue;
      const publishedAt = v.publishedAt ? new Date(v.publishedAt) : null;
      await db
        .insert(video)
        .values({
          slug: `yt-${v.videoId}`,
          provider: 'youtube',
          providerAssetId: v.videoId,
          title: v.title,
          durationSeconds: v.durationSeconds ?? null,
          thumbnailUrl: v.thumbnailUrl ?? null,
          embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
          channelName: v.channelName ?? null,
          publishedAt,
        })
        .onConflictDoUpdate({
          target: video.slug,
          set: {
            title: v.title,
            durationSeconds: v.durationSeconds ?? null,
            thumbnailUrl: v.thumbnailUrl ?? null,
            channelName: v.channelName ?? null,
            publishedAt,
          },
        });
      n++;
    }
    return n;
  } catch {
    return 0;
  }
}
