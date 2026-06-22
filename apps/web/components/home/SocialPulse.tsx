import { getRedditFormula1Pulse } from '@apex/api-client/reddit';

function relTime(ms: number): string {
  if (!ms) return '';
  const delta = Date.now() - ms;
  if (delta < 60_000) return 'now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h`;
  return `${Math.floor(delta / 86_400_000)}d`;
}

export async function SocialPulse() {
  const posts = await getRedditFormula1Pulse({ limit: 6, revalidate: 600 });
  if (posts.length === 0) return null;

  return (
    <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 md:px-grid-margin">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-data text-telemetry-red">REDDIT PULSE · r/formula1</h2>
            <p className="mt-2 font-editorial text-2xl text-on-background md:text-3xl">
              What the community is talking about right now
            </p>
          </div>
          <a
            href="https://www.reddit.com/r/formula1/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-data text-on-surface-variant hover:text-on-background"
          >
            OPEN SUBREDDIT →
          </a>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {posts.slice(0, 6).map((p) => (
            <li
              key={p.id}
              className="group relative overflow-hidden border border-outline-variant/40 bg-background"
            >
              {p.thumbnailUrl && (
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={p.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                </div>
              )}
              <div className="space-y-3 p-4 md:p-5">
                <div className="flex items-center gap-2 text-data text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-telemetry-red">
                    forum
                  </span>
                  <span>REDDIT</span>
                  {p.author && (
                    <>
                      <span className="text-outline">·</span>
                      <span>{p.author}</span>
                    </>
                  )}
                  <span className="text-outline">·</span>
                  <span>{relTime(p.publishedMs)}</span>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-headline text-base text-on-background hover:text-telemetry-red md:text-lg"
                >
                  {p.title}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
