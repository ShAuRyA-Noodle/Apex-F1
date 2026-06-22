import Link from 'next/link';
import { pickFirstGiphyGif, searchGiphyReaction } from '@apex/api-client/giphy';
import { PoweredByGiphy } from '@/components/predict/PoweredByGiphy';

/**
 * 404 - "Out of session"
 *
 * Replaces the static illustration with a Giphy reaction GIF tied to the
 * curated `notFound` query bank ("car crash funny", "out of fuel"). The
 * fetch is server-side, ISR-cached at the client's 24h floor, so a single
 * Giphy request serves the entire planet for a day.
 *
 * Degradation:
 *  - GIPHY_API_KEY missing -> searchGiphyReaction() returns [].
 *  - Giphy down / quota hit -> client returns [].
 *  - In both cases `pickFirstGiphyGif` returns undefined and we fall back
 *    to the original solid-color frame.
 *
 * Attribution:
 *  - PoweredByGiphy badge pinned bottom-right of the GIF frame whenever
 *    a GIF is rendered. Skipped on the fallback frame.
 */
export default async function NotFound() {
  const raw = await searchGiphyReaction('notFound', { limit: 10 });
  const gif = pickFirstGiphyGif(raw);

  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-32 text-center md:px-grid-margin">
      <span className="text-data text-telemetry-red">404</span>
      <h1 className="mt-4 font-display text-6xl uppercase tracking-tight text-on-background md:text-9xl">
        Out of session.
      </h1>
      <p className="mt-6 mx-auto max-w-2xl font-editorial text-xl text-on-surface-variant md:text-2xl">
        The page you were looking for either never existed, has moved, or finished a stint
        we can&apos;t recover. Try one of these:
      </p>

      {/* GIF accent. Plain <img> not next/image: Giphy hosts on
          media*.giphy.com which isn't in remotePatterns and reaction GIFs
          are intentionally ephemeral so they shouldn't pass the optimizer
          cache. The aspect-ratio reservation keeps CLS at 0 even when
          gif is undefined. */}
      <div className="relative mx-auto mt-12 aspect-video w-full max-w-2xl overflow-hidden rounded-sm border border-outline-variant/30 bg-asphalt-gray/40">
        {gif ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gif.gifUrl}
              alt={gif.title ? `Giphy reaction: ${gif.title}` : 'Out of session'}
              width={gif.gifWidth || undefined}
              height={gif.gifHeight || undefined}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <PoweredByGiphy className="absolute bottom-3 right-3" />
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center font-data text-xs uppercase tracking-[0.22em] text-outline">
            NO SIGNAL
          </span>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
        >
          Home
        </Link>
        <Link
          href="/schedule"
          className="border border-outline-variant px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-telemetry-red"
        >
          Schedule
        </Link>
        <Link
          href="/results/2026/drivers"
          className="border border-outline-variant px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-telemetry-red"
        >
          Standings
        </Link>
        <Link
          href="/latest"
          className="border border-outline-variant px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-telemetry-red"
        >
          Latest
        </Link>
      </div>
    </article>
  );
}
