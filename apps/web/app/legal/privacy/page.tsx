import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Apex handles your data · GDPR + CCPA compliant.',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-20 md:px-grid-margin md:py-32">
      <span className="text-data text-telemetry-red">LEGAL</span>
      <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
        Privacy
      </h1>
      <div className="prose prose-invert mt-10 max-w-none font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
        <p>
          Apex respects your privacy. We collect the minimum data needed to deliver the service.
          This policy applies to apex (the &ldquo;Service&rdquo;) and explains what we collect,
          why, how long we keep it, and your rights under GDPR + CCPA.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          What we collect
        </h2>
        <ul>
          <li>
            <strong>Anonymous analytics</strong> (page views, interaction events) · only with your
            consent via the cookie banner. IP addresses are truncated server-side.
          </li>
          <li>
            <strong>Account data</strong> (email, display name, preferences) · only if you create
            an account.
          </li>
          <li>
            <strong>Newsletter</strong> · email address only, used solely for newsletter delivery.
            Unsubscribe at any time.
          </li>
        </ul>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          What we do not collect
        </h2>
        <ul>
          <li>We do not sell personal data.</li>
          <li>We do not place advertising trackers without consent.</li>
          <li>We do not collect location beyond country-level timezone inference.</li>
        </ul>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Your rights
        </h2>
        <p>
          You can request access, correction, deletion, or export of your data at any time by
          emailing{' '}
          <a href="mailto:privacy@apex.example" className="text-telemetry-red underline">
            privacy@apex.example
          </a>
          . We respond within 30 days per GDPR and CCPA.
        </p>
        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Cookies
        </h2>
        <p>
          Essential cookies (session, security) are always on. Analytics and marketing cookies are
          opt-in via the consent banner. You can change preferences at any time by clearing
          site data.
        </p>
        <p className="mt-12 text-sm text-outline">Last updated: 2026-05-21</p>
      </div>
    </article>
  );
}
