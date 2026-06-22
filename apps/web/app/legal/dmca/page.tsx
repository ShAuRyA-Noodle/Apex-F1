import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DMCA',
  description: 'How to file a DMCA takedown notice with Apex.',
};

export default function DmcaPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-20 md:px-grid-margin md:py-32">
      <span className="text-data text-telemetry-red">LEGAL</span>
      <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
        DMCA notice
      </h1>
      <div className="prose prose-invert mt-10 max-w-none font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
        <p>
          Apex respects intellectual property rights. We aggregate public data and link out to
          source publishers under fair-use linking. If you believe content displayed on Apex
          infringes your copyright, file a notice using the procedure below.
        </p>

        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          What to include in your notice
        </h2>
        <p>Per 17 U.S.C. § 512(c)(3), your notice must include all of:</p>
        <ol>
          <li>A physical or electronic signature of the copyright owner (or an authorized agent).</li>
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>
            Identification of the material on Apex that is claimed to be infringing, with enough
            detail to let us locate it (URL or screenshot).
          </li>
          <li>Your contact information (address, phone, email).</li>
          <li>
            A statement that you have a good-faith belief that the use is not authorized by the
            copyright owner, its agent, or the law.
          </li>
          <li>
            A statement, under penalty of perjury, that the information in the notice is accurate
            and that you are authorized to act on behalf of the owner.
          </li>
        </ol>

        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Send notices to
        </h2>
        <p>
          <a href="mailto:dmca@apex.gg" className="text-telemetry-red underline">
            dmca@apex.gg
          </a>
          <br />
          Apex Designated Agent
          <br />
          (US Copyright Office DMCA Agent registration: pending · to be filed at{' '}
          <a
            href="https://www.copyright.gov/dmca-directory/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-telemetry-red underline"
          >
            copyright.gov/dmca-directory
          </a>{' '}
          when Apex incorporates.)
        </p>

        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Our response
        </h2>
        <p>
          We respond within 48 hours of receiving a valid notice. Material confirmed as
          infringing is removed and the uploader (where applicable) is notified.
        </p>

        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Counter-notification
        </h2>
        <p>
          If you believe content was removed in error, you can file a counter-notification under 17
          U.S.C. § 512(g). Counter-notifications are forwarded to the original claimant; if no
          court action is filed within 14 business days, the removed material may be restored.
        </p>

        <h2 className="mt-12 font-headline text-2xl uppercase tracking-tight text-on-background">
          Misrepresentation
        </h2>
        <p>
          Knowingly material misrepresentation in a notice or counter-notification is actionable
          under 17 U.S.C. § 512(f).
        </p>

        <p className="mt-12 text-sm text-outline">Last updated: 2026-06-22</p>
      </div>
    </article>
  );
}
