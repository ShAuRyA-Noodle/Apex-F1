import { getF1Videos } from '@apex/api-client/youtube';

export async function FeaturedVideoRail() {
  const videos = await getF1Videos({ limit: 8, revalidate: 1800 });
  if (videos.length === 0) return null;

  return (
    <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 md:px-grid-margin">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-data text-telemetry-red">FEATURED VIDEO</h2>
            <p className="mt-2 font-editorial text-2xl text-on-background md:text-3xl">
              Latest from FORMULA 1, Chain Bear, Tommo F1, Driver61
            </p>
          </div>
          <a href="/video" className="text-data text-on-surface-variant hover:text-on-background">
            ALL VIDEO →
          </a>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {videos.map((v) => (
            <article key={v.videoId || v.url} className="w-[320px] shrink-0 md:w-[380px]">
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-surface-container-high">
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="material-symbols-outlined rounded-full bg-telemetry-red p-3 text-[28px] text-on-background">
                      play_arrow
                    </span>
                  </div>
                </div>
                <h3 className="mt-4 line-clamp-2 font-headline text-base text-on-background md:text-lg">
                  {v.title}
                </h3>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-outline">
                  {v.channelName}
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
