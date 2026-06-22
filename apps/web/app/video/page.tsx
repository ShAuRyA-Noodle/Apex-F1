import type { Metadata } from 'next';
import Link from 'next/link';
import {
  canEmbed,
  formatCompactCount,
  formatDuration,
  getF1Videos,
  isEnriched,
  YT_F1_CHANNELS,
} from '@apex/api-client/youtube';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Video',
  description:
    'Latest Formula 1 video from FORMULA 1 official, Chain Bear, WTF1, Tommo F1, Driver61. Updated every 30 min.',
};

type SortKey = 'newest' | 'most-viewed';

function channelSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function parseSort(raw: string | undefined): SortKey {
  return raw === 'most-viewed' ? 'most-viewed' : 'newest';
}

export default async function VideoPage(props: {
  searchParams: Promise<{ channel?: string; sort?: string }>;
}) {
  const { channel, sort: rawSort } = await props.searchParams;
  const sort = parseSort(rawSort);

  const filteredChannels = channel
    ? YT_F1_CHANNELS.filter((c) => channelSlug(c.name) === channel.toLowerCase())
    : YT_F1_CHANNELS;

  const videos = await getF1Videos({
    channels: filteredChannels.length > 0 ? filteredChannels : YT_F1_CHANNELS,
    // Pull a larger pool so "most-viewed" sort has signal — not just the last 24.
    limit: sort === 'most-viewed' ? 48 : 24,
    revalidate: 1800,
  });

  // "most-viewed" is meaningful only when at least one record is enriched.
  // RSS fallback has no view counts → silently degrade to newest-first.
  const anyEnriched = videos.some(isEnriched);
  const effectiveSort: SortKey = sort === 'most-viewed' && anyEnriched ? 'most-viewed' : 'newest';

  const sorted =
    effectiveSort === 'most-viewed'
      ? [...videos].sort((a, b) => (isEnriched(b) ? b.viewCount : 0) - (isEnriched(a) ? a.viewCount : 0))
      : [...videos].sort((a, b) => b.publishedMs - a.publishedMs);

  const display = sorted.slice(0, 24);

  const buildHref = (next: { channel?: string; sort?: SortKey }) => {
    const params = new URLSearchParams();
    const c = next.channel ?? channel;
    const s = next.sort ?? sort;
    if (c) params.set('channel', c);
    if (s && s !== 'newest') params.set('sort', s);
    const qs = params.toString();
    return qs ? `/video?${qs}` : '/video';
  };

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-data text-telemetry-red">VIDEO</span>
          <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            Watch
          </h1>
          <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
            Live YouTube aggregator from {YT_F1_CHANNELS.length} curated F1 channels.
            {anyEnriched ? ' Real view counts, exact durations.' : ' Newest first.'} Links open at YouTube.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 border border-outline-variant/60 p-1">
          <Link
            href={buildHref({ channel: undefined })}
            className={
              !channel
                ? 'bg-telemetry-red px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background'
                : 'px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
            }
          >
            All
          </Link>
          {YT_F1_CHANNELS.map((c) => {
            const slug = channelSlug(c.name);
            const active = channel === slug;
            return (
              <Link
                key={c.channelId}
                href={buildHref({ channel: slug })}
                className={
                  active
                    ? 'bg-telemetry-red px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background'
                    : 'px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
                }
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Sort toolbar — hidden when no enriched data is available (RSS-only). */}
      {anyEnriched && (
        <div className="mt-8 flex items-center gap-3">
          <span className="text-data text-on-surface-variant">SORT</span>
          <div className="flex items-center gap-1 border border-outline-variant/60 p-1">
            <Link
              href={buildHref({ sort: 'newest' })}
              className={
                effectiveSort === 'newest'
                  ? 'bg-on-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-background'
                  : 'px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
              }
            >
              Newest
            </Link>
            <Link
              href={buildHref({ sort: 'most-viewed' })}
              className={
                effectiveSort === 'most-viewed'
                  ? 'bg-on-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-background'
                  : 'px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
              }
            >
              Most viewed
            </Link>
          </div>
        </div>
      )}

      {display.length === 0 && (
        <p className="mt-20 text-center font-editorial text-xl text-on-surface-variant">
          No videos right now. Channel may be rate-limited. Try again in a minute.
        </p>
      )}

      <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8 lg:grid-cols-4">
        {display.map((v) => {
          const enriched = isEnriched(v);
          const duration = enriched ? formatDuration(v.durationSeconds) : '';
          const views = enriched ? formatCompactCount(v.viewCount) : '';
          return (
            <li key={v.videoId || v.url}>
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                data-apex-video-id={canEmbed(v) && v.videoId ? v.videoId : undefined}
                data-apex-video-title={v.title}
                data-apex-video-channel={v.channelName}
                className="group block"
              >
                <div className="relative aspect-video overflow-hidden bg-surface-container-high">
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  {duration && (
                    <span className="absolute bottom-2 right-2 bg-background/85 px-1.5 py-0.5 font-mono text-[11px] tracking-tight text-on-background">
                      {duration}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="material-symbols-outlined rounded-full bg-telemetry-red p-3 text-[28px] text-on-background">
                      play_arrow
                    </span>
                  </div>
                </div>
                <h3 className="mt-3 line-clamp-2 font-headline text-base text-on-background md:text-lg">
                  {v.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-data">
                  <span className="text-telemetry-red">{v.channelName}</span>
                  <span className="text-outline">·</span>
                  <span className="text-on-surface-variant">{fmtDate(v.publishedAt)}</span>
                  {enriched && v.viewCount > 0 && (
                    <>
                      <span className="text-outline">·</span>
                      <span className="text-on-surface-variant">{views} views</span>
                    </>
                  )}
                </div>
              </a>
            </li>
          );
        })}
      </ul>

      <p className="mt-12 text-xs text-outline">
        Channels: {YT_F1_CHANNELS.map((c) => c.name).join(' · ')}. Apex is independent
        and unaffiliated with any channel or rights holder. Videos play at YouTube under
        each channel&apos;s embedding terms.
      </p>
    </article>
  );
}
