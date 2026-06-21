import type { Metadata } from 'next';
import Link from 'next/link';
import { getF1NewsFeed, F1_RSS_SOURCES } from '@apex/api-client/rss';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Latest',
  description:
    'Live aggregated F1 news from Motorsport.com, Autosport, RaceFans, and The Race. Updated every 5 minutes.',
};

function sourceSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
}

function relTime(ms: number): string {
  if (!ms) return '';
  const delta = Date.now() - ms;
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export default async function LatestPage(props: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await props.searchParams;
  const all = await getF1NewsFeed({ limit: 80, revalidate: 300 });
  const items = source
    ? all.filter((i) => sourceSlug(i.source) === source.toLowerCase())
    : all;

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-data text-telemetry-red">LIVE WIRE</span>
          <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            Latest
          </h1>
          <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
            {items.length} stories aggregated from independent F1 newsrooms — newest first.
            Links open at source. Refresh: 5 min.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 border border-outline-variant/60 p-1">
          <Link
            href="/latest"
            className={
              !source
                ? 'bg-telemetry-red px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background'
                : 'px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
            }
          >
            All
          </Link>
          {F1_RSS_SOURCES.map((s) => {
            const slug = sourceSlug(s.name);
            const active = source === slug;
            return (
              <Link
                key={s.name}
                href={`/latest?source=${slug}`}
                className={
                  active
                    ? 'bg-telemetry-red px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background'
                    : 'px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
                }
              >
                {s.name}
              </Link>
            );
          })}
        </div>
      </header>

      {items.length === 0 && (
        <p className="mt-20 text-center font-editorial text-xl text-on-surface-variant">
          No items right now. Sources may be rate-limiting. Try again in a minute.
        </p>
      )}

      <ul className="mt-12 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2">
        {items.map((it, i) => (
          <li key={`${it.link}-${i}`} className="bg-background">
            <a
              href={it.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-4 p-5 transition-colors hover:bg-surface-container-low md:gap-6 md:p-7"
            >
              {it.imageUrl ? (
                <div className="relative h-28 w-44 shrink-0 overflow-hidden bg-surface-container-high md:h-32 md:w-52">
                  <img
                    src={it.imageUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="hidden h-28 w-44 shrink-0 items-center justify-center bg-surface-container-high md:flex md:h-32 md:w-52">
                  <span className="text-data text-outline">{it.source}</span>
                </div>
              )}
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-2 text-data">
                  <span className="text-telemetry-red">{it.source}</span>
                  <span className="text-outline">·</span>
                  <span className="text-on-surface-variant">{relTime(it.pubDateMs)}</span>
                </div>
                <h2 className="mt-2 line-clamp-2 font-headline text-base text-on-background md:text-xl">
                  {it.title}
                </h2>
                {it.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant md:text-base">
                    {it.description}
                  </p>
                )}
                <span className="mt-auto pt-3 text-data text-outline transition-colors group-hover:text-telemetry-red">
                  READ AT {it.source.toUpperCase()} →
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-xs text-outline">
        Sources: {F1_RSS_SOURCES.map((s) => s.name).join(' · ')}. Apex is independent
        and unaffiliated with Formula 1, FIA, FOM, or any team. Headlines link to source
        publishers under fair-use linking; full article text remains at source.
      </p>
    </article>
  );
}
