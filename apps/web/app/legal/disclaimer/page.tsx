import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description:
    'Apex is an independent, fan-built Formula 1 information service. Apex is not affiliated with Formula 1, FIA, FOM, Liberty Media, or any team or driver.',
};

export default function DisclaimerPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-20 md:px-grid-margin md:py-32">
      <span className="text-data text-telemetry-red">LEGAL</span>
      <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
        Disclaimer
      </h1>
      <div className="prose prose-invert mt-10 max-w-none font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
        <p>
          Apex is an independent, fan-built Formula 1 information service. Apex is{' '}
          <strong>not affiliated with, endorsed by, or associated with</strong> Formula 1, Formula
          One World Championship Limited, FIA, Formula One Management, Liberty Media, or any
          constructor or driver.
        </p>
        <p>
          The terms &ldquo;Formula 1&rdquo;, &ldquo;F1&rdquo;, &ldquo;Grand Prix&rdquo;, and team
          and driver names are used in a purely descriptive and nominative sense to identify the
          subject matter we cover.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Data sources
        </h2>
        <p>
          Factual race data (schedule, results, standings, lap times) is sourced from the public
          Jolpica F1 API and the OpenF1 API. Historical archive data covers the 1950 inaugural
          championship through the present season.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Editorial
        </h2>
        <p>
          All editorial copy on Apex is original. We do not reproduce articles from Formula1.com or
          any commercial publisher. Wikipedia-derived material is attributed and used under
          CC-BY-SA where applicable.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Video
        </h2>
        <p>
          Video appears on Apex as iframe embeds from YouTube and other providers, used only when
          the uploader has enabled embedding. We do not rehost broadcast video or F1 TV content.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Logos &amp; trademarks
        </h2>
        <p>
          Team and championship logos are not displayed unless we have explicit license. Team
          identity is rendered through color strips and text only by default.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Takedowns
        </h2>
        <p>
          To report a copyright or trademark concern, email{' '}
          <a href="mailto:legal@apex.gg" className="text-telemetry-red underline">
            legal@apex.gg
          </a>
          . We respond within 48 hours and follow a DMCA workflow.
        </p>
        <p className="mt-12 text-sm text-outline">Last updated: 2026-05-21</p>
      </div>
    </article>
  );
}
