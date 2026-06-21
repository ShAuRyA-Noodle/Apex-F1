import { getF1NewsFeed } from '@apex/api-client/rss';

function relTime(ms: number): string {
  const delta = Date.now() - ms;
  if (delta < 60_000) return 'now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h`;
  return `${Math.floor(delta / 86_400_000)}d`;
}

export async function HeroRail() {
  const all = await getF1NewsFeed({ limit: 6, revalidate: 300 });
  const rail = all.slice(1, 6); // skip lead
  if (rail.length === 0) return null;

  return (
    <section className="border-y border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-10 md:px-grid-margin">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-data text-telemetry-red">FROM THE WIRE</h2>
          <a
            href="/latest"
            className="text-data text-on-surface-variant transition-colors hover:text-on-background"
          >
            ALL STORIES →
          </a>
        </div>
        <ul className="grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-5">
          {rail.map((a) => (
            <li key={a.link} className="bg-background">
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col bg-background p-4 transition-colors hover:bg-surface-container-low md:p-5"
              >
                {a.imageUrl && (
                  <div className="relative mb-4 aspect-[16/10] overflow-hidden bg-surface-container-high">
                    <img
                      src={a.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="text-data mb-2 text-telemetry-red">
                  {a.source} · {relTime(a.pubDateMs)}
                </div>
                <h3 className="line-clamp-3 font-headline text-base text-on-background md:text-lg">
                  {a.title}
                </h3>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
