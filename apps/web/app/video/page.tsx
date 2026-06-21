import type { Metadata } from 'next';
import Link from 'next/link';
import { getF1Videos, YT_F1_CHANNELS } from '@apex/api-client/youtube';

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Video',
  description:
    'Latest Formula 1 video from FORMULA 1 official, Chain Bear, WTF1, Tommo F1, Driver61. Updated every 30 min.',
};

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

export default async function VideoPage(props: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { channel } = await props.searchParams;

  const filteredChannels = channel
    ? YT_F1_CHANNELS.filter((c) => channelSlug(c.name) === channel.toLowerCase())
    : YT_F1_CHANNELS;

  const videos = await getF1Videos({
    channels: filteredChannels.length > 0 ? filteredChannels : YT_F1_CHANNELS,
    limit: 24,
    revalidate: 1800,
  });

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
            Newest first. Links open at YouTube.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 border border-outline-variant/60 p-1">
          <Link
            href="/video"
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
                href={`/video?channel=${slug}`}
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

      {videos.length === 0 && (
        <p className="mt-20 text-center font-editorial text-xl text-on-surface-variant">
          No videos right now. Channel may be rate-limited. Try again in a minute.
        </p>
      )}

      <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8 lg:grid-cols-4">
        {videos.map((v) => (
          <li key={v.videoId || v.url}>
            <a
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="relative aspect-video overflow-hidden bg-surface-container-high">
                <img
                  src={v.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="material-symbols-outlined rounded-full bg-telemetry-red p-3 text-[28px] text-on-background">
                    play_arrow
                  </span>
                </div>
              </div>
              <h3 className="mt-3 line-clamp-2 font-headline text-base text-on-background md:text-lg">
                {v.title}
              </h3>
              <div className="mt-2 flex items-center gap-2 text-data">
                <span className="text-telemetry-red">{v.channelName}</span>
                <span className="text-outline">·</span>
                <span className="text-on-surface-variant">{fmtDate(v.publishedAt)}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-xs text-outline">
        Channels: {YT_F1_CHANNELS.map((c) => c.name).join(' · ')}. Apex is independent
        and unaffiliated with any channel or rights holder. Videos play at YouTube under
        each channel&apos;s embedding terms.
      </p>
    </article>
  );
}
