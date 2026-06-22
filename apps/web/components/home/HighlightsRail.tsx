import {
  canEmbed,
  formatCompactCount,
  formatDuration,
  getF1Videos,
  isEnriched,
  YT_F1_CHANNELS,
} from '@apex/api-client/youtube';

export async function HighlightsRail() {
  // FORMULA 1 official channel only · race highlights, onboard, post-race shows.
  // NOTE: most FORMULA 1 official uploads are embed-blocked off-domain (FOM
  // restricts to formula1.com whitelist). We still surface them as cards
  // that link out at YouTube, but the in-page modal skips them via the
  // canEmbed() check below.
  const officialChannel = YT_F1_CHANNELS.find((c) => c.name === 'FORMULA 1');
  if (!officialChannel) return null;
  const videos = await getF1Videos({
    channels: [officialChannel],
    limit: 4,
    revalidate: 1800,
  });
  if (videos.length === 0) return null;

  return (
    <section className="border-b border-outline-variant/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 md:px-grid-margin">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-data text-telemetry-red">OFFICIAL HIGHLIGHTS</h2>
            <p className="mt-2 font-editorial text-2xl text-on-background md:text-3xl">
              Direct from the FORMULA 1 YouTube channel
            </p>
          </div>
          <a href="/video?channel=formula1" className="text-data text-on-surface-variant hover:text-on-background">
            ALL →
          </a>
        </div>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {videos.map((v) => {
            const enriched = isEnriched(v);
            const duration = enriched ? formatDuration(v.durationSeconds) : '';
            const views = enriched ? formatCompactCount(v.viewCount) : '';
            const embed = canEmbed(v);
            return (
              <li key={v.videoId}>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-apex-video-id={embed && v.videoId ? v.videoId : undefined}
                  data-apex-video-title={v.title}
                  data-apex-video-channel={v.channelName}
                  className="group block"
                >
                  <div className="relative aspect-video overflow-hidden bg-surface-container-high">
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {duration && (
                      <span className="absolute bottom-2 right-2 bg-background/85 px-1.5 py-0.5 font-mono text-[11px] tracking-tight text-on-background">
                        {duration}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-headline text-sm text-on-background md:text-base">
                    {v.title}
                  </h3>
                  {enriched && v.viewCount > 0 && (
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-outline">
                      {views} views
                    </div>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
