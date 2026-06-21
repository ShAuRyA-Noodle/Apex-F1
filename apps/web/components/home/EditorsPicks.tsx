import { getF1NewsFeed } from '@apex/api-client/rss';

// Wire-aggregated long-reads. Until Apex original editorial CMS lands,
// this surface fairly-uses public RSS headlines + 2-line preview text
// from licensed-RSS upstream feeds. Links open at source.
export async function EditorsPicks() {
  const items = await getF1NewsFeed({ limit: 30, revalidate: 600 });
  // Skip the items consumed by HeroLeadStory + HeroRail (first 6).
  const picks = items.slice(6, 16);
  if (picks.length === 0) return null;

  const [feature, ...rest] = picks;
  if (!feature) return null;

  return (
    <section className="border-b border-outline-variant/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-data text-telemetry-red">PADDOCK FEED</h2>
            <p className="mt-2 font-editorial text-3xl text-on-background md:text-4xl">
              Independent F1 coverage, aggregated live
            </p>
          </div>
          <a
            href="/latest"
            className="text-data text-on-surface-variant hover:text-on-background"
          >
            MORE →
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <a
            href={feature.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group col-span-1 row-span-2 block md:col-span-2"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-container-high md:aspect-[16/10]">
              {feature.imageUrl && (
                <img
                  src={feature.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <span className="text-data text-telemetry-red">{feature.source}</span>
                <h3 className="mt-3 font-headline text-2xl text-on-background md:text-4xl">
                  {feature.title}
                </h3>
                {feature.description && (
                  <p className="mt-3 max-w-2xl line-clamp-2 font-editorial text-base text-on-surface-variant md:text-lg">
                    {feature.description}
                  </p>
                )}
              </div>
            </div>
          </a>

          {rest.slice(0, 4).map((a) => (
            <a
              key={a.link}
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3"
            >
              {a.imageUrl && (
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-high">
                  <img
                    src={a.imageUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}
              <span className="text-data text-telemetry-red">{a.source}</span>
              <h3 className="line-clamp-3 font-headline text-base text-on-background md:text-lg">
                {a.title}
              </h3>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
