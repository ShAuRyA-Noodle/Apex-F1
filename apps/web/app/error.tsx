'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[apex] route error', error);
  }, [error]);

  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-32 text-center md:px-grid-margin">
      <span className="text-data text-telemetry-red">500</span>
      <h1 className="mt-4 font-display text-6xl uppercase tracking-tight text-on-background md:text-9xl">
        Yellow flag.
      </h1>
      <p className="mt-6 mx-auto max-w-2xl font-editorial text-xl text-on-surface-variant md:text-2xl">
        Something went wrong on our side. The error has been logged.
      </p>
      <pre className="mx-auto mt-6 max-w-2xl overflow-x-auto bg-surface-container-low p-4 text-left font-data text-xs text-outline">
        {error.message}
        {error.digest ? `\n\ndigest: ${error.digest}` : ''}
      </pre>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border border-outline-variant px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-telemetry-red"
        >
          Home
        </Link>
      </div>
    </article>
  );
}
