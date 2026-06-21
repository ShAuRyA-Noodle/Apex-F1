import Link from 'next/link';

export default function NotFound() {
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
