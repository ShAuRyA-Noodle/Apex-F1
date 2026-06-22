import type { Metadata } from 'next';
import Link from 'next/link';
import { getAggregatedF1News } from '@apex/api-client';
import { F1_RSS_SOURCES } from '@apex/api-client/rss';
import type {
  NewsDataLanguageIso,
  NewsDataSentiment,
} from '@apex/api-client/newsdata';
import { SentimentBadge } from '../../components/news/SentimentBadge';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Latest',
  description:
    'Live aggregated F1 news from Motorsport.com, Autosport, RaceFans, The Race, The Guardian, GNews, and NewsData (multi-language + sentiment). Updated every 5 minutes.',
};

/**
 * Source pills shown on /latest. Order = pill order in the UI.
 *
 * `match` is a predicate against `RssItem.source` because some providers
 * stamp publisher-specific names (GNews uses "GNews · BBC News" etc., and
 * NewsData carries the per-publisher source_name verbatim).
 *
 * NewsData rows are identified by the `provider` discriminator, NOT by the
 * source label, because NewsData articles wear their publisher's name
 * (e.g. "Gazzetta dello Sport", "Auto Motor und Sport").
 */
type SourcePill = {
  slug: string;
  label: string;
  match: (item: { source: string; provider?: string }) => boolean;
  delayed?: boolean;
};

const SOURCE_PILLS: SourcePill[] = [
  ...F1_RSS_SOURCES.map((s) => ({
    slug: s.name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, ''),
    label: s.name,
    match: (it: { source: string }) => it.source === s.name,
  })),
  {
    slug: 'the-guardian',
    label: 'The Guardian',
    match: (it) => it.source === 'The Guardian',
  },
  {
    slug: 'gnews',
    label: 'GNews',
    match: (it) => it.source.startsWith('GNews'),
    delayed: true,
  },
  {
    slug: 'newsdata',
    label: 'NewsData',
    match: (it) => it.provider === 'newsdata',
  },
];

const LANGUAGE_LABEL: Record<NewsDataLanguageIso, string> = {
  en: 'English',
  it: 'Italian',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
  pt: 'Portuguese',
};

const SENTIMENT_LABEL: Record<NewsDataSentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

const LANGUAGE_ORDER: NewsDataLanguageIso[] = ['en', 'it', 'es', 'de', 'fr', 'pt'];
const SENTIMENT_ORDER: NewsDataSentiment[] = ['positive', 'neutral', 'negative'];

function pickEnum<T extends string>(raw: string | undefined, allowed: readonly T[]): T | null {
  if (!raw) return null;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

function buildHref(params: {
  source?: string | null;
  language?: NewsDataLanguageIso | null;
  sentiment?: NewsDataSentiment | null;
}): string {
  const sp = new URLSearchParams();
  if (params.source) sp.set('source', params.source);
  if (params.language) sp.set('lang', params.language);
  if (params.sentiment) sp.set('sentiment', params.sentiment);
  const q = sp.toString();
  return q ? `/latest?${q}` : '/latest';
}

function relTime(ms: number): string {
  if (!ms) return '';
  const delta = Date.now() - ms;
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

const PILL_ACTIVE =
  'bg-telemetry-red px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background';
const PILL_INACTIVE =
  'px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background';

export default async function LatestPage(props: {
  searchParams: Promise<{ source?: string; lang?: string; sentiment?: string }>;
}) {
  const { source, lang, sentiment } = await props.searchParams;
  const all = await getAggregatedF1News({ limit: 120, revalidate: 300 });

  // Has NewsData enrichment landed in at least one row? Drives whether we
  // bother rendering the sentiment filter pill at all (CORE RULE #1: never
  // show controls that match nothing).
  const hasNewsData = all.some((i) => i.provider === 'newsdata');
  const newsDataCount = all.reduce((n, i) => n + (i.provider === 'newsdata' ? 1 : 0), 0);

  const activeLang = pickEnum<NewsDataLanguageIso>(lang, LANGUAGE_ORDER);
  const activeSentiment = pickEnum<NewsDataSentiment>(sentiment, SENTIMENT_ORDER);

  const activePill = source
    ? SOURCE_PILLS.find((p) => p.slug === source.toLowerCase())
    : undefined;

  let items = all;
  if (activePill) {
    items = items.filter((i) => activePill.match(i));
  }
  if (activeLang) {
    // Rows without an explicit `language` tag (RSS / Guardian / NewsAPI /
    // GNews) are treated as English when the user filters by English; any
    // other language picks restrict to NewsData rows with that ISO code.
    items = items.filter((i) => {
      if (i.language) return i.language === activeLang;
      return activeLang === 'en';
    });
  }
  if (activeSentiment) {
    // Sentiment is NewsData-only; non-NewsData rows are filtered out when
    // the user explicitly picks a sentiment.
    items = items.filter((i) => i.sentiment === activeSentiment);
  }

  const sourceLabels = SOURCE_PILLS.map((p) => p.label).join(' · ');

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-data text-telemetry-red">LIVE WIRE</span>
          <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
            Latest
          </h1>
          <p className="mt-4 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
            {items.length} stories aggregated from {SOURCE_PILLS.length} independent F1
            sources, newest first. Links open at source. Refresh: 5 min.
            {hasNewsData && newsDataCount > 0 && (
              <span className="ml-2 font-mono text-xs uppercase tracking-[0.18em] text-outline">
                · {newsDataCount} multi-language via NewsData
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-3">
        {/* Source row */}
        <div className="flex flex-wrap items-center gap-1 border border-outline-variant/60 p-1">
          <Link
            href={buildHref({ language: activeLang, sentiment: activeSentiment })}
            className={!source ? PILL_ACTIVE : PILL_INACTIVE}
          >
            All sources
          </Link>
          {SOURCE_PILLS.map((pill) => {
            const active = source === pill.slug;
            return (
              <Link
                key={pill.slug}
                href={buildHref({ source: pill.slug, language: activeLang, sentiment: activeSentiment })}
                className={
                  active
                    ? `flex items-center gap-1 ${PILL_ACTIVE}`
                    : `flex items-center gap-1 ${PILL_INACTIVE}`
                }
              >
                <span>{pill.label}</span>
                {pill.delayed && (
                  <span
                    title="GNews free tier delivers articles 12h+ after publication"
                    className={
                      active
                        ? 'rounded-sm bg-on-background/20 px-1 text-[9px] tracking-normal'
                        : 'rounded-sm bg-outline-variant/40 px-1 text-[9px] tracking-normal text-outline'
                    }
                  >
                    DELAYED
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Language row - shown for all users; defaults are English. */}
        <div className="flex flex-wrap items-center gap-1 border border-outline-variant/60 p-1">
          <span className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-outline">
            Lang
          </span>
          <Link
            href={buildHref({ source, sentiment: activeSentiment })}
            className={!activeLang ? PILL_ACTIVE : PILL_INACTIVE}
          >
            All
          </Link>
          {LANGUAGE_ORDER.map((iso) => {
            const active = activeLang === iso;
            return (
              <Link
                key={iso}
                href={buildHref({ source, language: iso, sentiment: activeSentiment })}
                className={active ? PILL_ACTIVE : PILL_INACTIVE}
              >
                {LANGUAGE_LABEL[iso]}
              </Link>
            );
          })}
        </div>

        {/* Sentiment row - only when at least one NewsData row exists. */}
        {hasNewsData && (
          <div className="flex flex-wrap items-center gap-1 border border-outline-variant/60 p-1">
            <span className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-outline">
              Sentiment
            </span>
            <Link
              href={buildHref({ source, language: activeLang })}
              className={!activeSentiment ? PILL_ACTIVE : PILL_INACTIVE}
            >
              All
            </Link>
            {SENTIMENT_ORDER.map((s) => {
              const active = activeSentiment === s;
              return (
                <Link
                  key={s}
                  href={buildHref({ source, language: activeLang, sentiment: s })}
                  className={
                    active
                      ? `inline-flex items-center gap-1.5 ${PILL_ACTIVE}`
                      : `inline-flex items-center gap-1.5 ${PILL_INACTIVE}`
                  }
                >
                  {!active && <SentimentBadge sentiment={s} compact />}
                  {SENTIMENT_LABEL[s]}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {activePill?.delayed && (
        <p className="mt-6 border-l-2 border-telemetry-red bg-surface-container-low/40 px-4 py-3 text-xs uppercase tracking-[0.16em] text-on-surface-variant">
          GNews free tier · articles surface 12h+ after publication. Useful for
          archive depth, not breaking news. Real-time access is locked behind
          paid plan.
        </p>
      )}

      {items.length === 0 && (
        <p className="mt-20 text-center font-editorial text-xl text-on-surface-variant">
          No items match these filters. Drop the language or sentiment pill, or
          try again in a minute.
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
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="hidden h-28 w-44 shrink-0 items-center justify-center bg-surface-container-high md:flex md:h-32 md:w-52">
                  <span className="text-data text-outline">{it.source}</span>
                </div>
              )}
              <div className="flex flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 text-data">
                  <span className="text-telemetry-red">{it.source}</span>
                  <span className="text-outline">·</span>
                  <span className="text-on-surface-variant">{relTime(it.pubDateMs)}</span>
                  {it.language && it.language !== 'en' && (
                    <>
                      <span className="text-outline">·</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        {LANGUAGE_LABEL[it.language]}
                      </span>
                    </>
                  )}
                  {it.sentiment && (
                    <SentimentBadge sentiment={it.sentiment} className="ml-1" />
                  )}
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
        Sources: {sourceLabels}. Apex is independent and unaffiliated with
        Formula 1, FIA, FOM, or any team. Headlines link to source publishers
        under fair-use linking; full article text remains at source. GNews
        articles are delivered with a 12h+ delay on the free tier. NewsData
        sentiment labels are provider-supplied and may be absent on free-tier
        rows.
      </p>
    </article>
  );
}
