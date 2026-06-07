import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of using Apex — the independent F1 fan platform.',
};

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-20 md:px-grid-margin md:py-32">
      <span className="text-data text-telemetry-red">LEGAL</span>
      <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
        Terms
      </h1>
      <div className="prose prose-invert mt-10 max-w-none font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
        <h2 className="font-headline text-2xl uppercase tracking-tight text-on-background">
          Use of the Service
        </h2>
        <p>
          By accessing Apex you agree to these Terms. The Service is provided &ldquo;as is&rdquo;
          without warranty. Race data is aggregated from public APIs and may contain inaccuracies;
          do not rely on Apex for betting, regulatory, or safety-critical decisions.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Content
        </h2>
        <p>
          Original editorial copy, illustrations, charts, and code are © Apex. Race factual data is
          public. Third-party embeds remain the property of their respective owners.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Acceptable use
        </h2>
        <p>
          You may not scrape, mirror, redistribute, or build derivative commercial services from
          Apex content without written permission. You may link to and quote articles in fair-use
          context.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Termination
        </h2>
        <p>
          We may suspend access for abuse, automated overload, or violation of these Terms. You
          may close your account at any time from the Account page.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Governing law
        </h2>
        <p>Jurisdiction and venue: to be determined at incorporation.</p>
        <p className="mt-12 text-sm text-outline">Last updated: 2026-05-21</p>
      </div>
    </article>
  );
}
