import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Reach the Apex team. Editorial, partnerships, legal, security.',
};

const ROUTES = [
  {
    label: 'EDITORIAL',
    title: 'Pitch a story, send a tip',
    email: 'hello@apex.gg',
    subject: 'Editorial tip',
    description: 'Race-week intel, paddock corners, technical scoops. Source confidentiality respected.',
  },
  {
    label: 'PARTNERSHIPS',
    title: 'Sponsorship and brand work',
    email: 'partners@apex.gg',
    subject: 'Apex partnership inquiry',
    description: 'Newsletter sponsorship, native creative, race-weekend integrations.',
  },
  {
    label: 'LEGAL · DMCA',
    title: 'Takedowns, trademark, licensing',
    email: 'legal@apex.gg',
    subject: 'Legal inquiry',
    description: 'DMCA notices follow the procedure on /legal/dmca. 48-hour SLA.',
  },
  {
    label: 'SECURITY',
    title: 'Vulnerability disclosure',
    email: 'security@apex.gg',
    subject: 'Security report',
    description: 'Responsible disclosure welcomed. Encrypted reports via PGP on request.',
  },
];

export default function ContactPage() {
  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-24 md:px-grid-margin md:py-32">
      <header>
        <span className="text-data text-telemetry-red">CONTACT</span>
        <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          Reach Apex.
        </h1>
        <p className="mt-6 max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-2xl">
          Pick the right inbox below. Founder-led, so expect a reply within a
          couple of days. Faster on weekdays, slower on race-weekend Sundays.
        </p>
      </header>

      <section className="mt-12">
        <ul className="grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2">
          {ROUTES.map((r) => (
            <li key={r.email} className="bg-background p-6 md:p-7">
              <div className="text-data text-telemetry-red">{r.label}</div>
              <h3 className="mt-3 font-headline text-xl text-on-background md:text-2xl">{r.title}</h3>
              <p className="mt-3 max-w-md text-sm text-on-surface-variant">{r.description}</p>
              <a
                href={`mailto:${r.email}?subject=${encodeURIComponent(r.subject)}`}
                className="mt-5 inline-flex items-center gap-2 text-data text-on-surface-variant transition-colors hover:text-telemetry-red"
              >
                {r.email}
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border-t border-outline-variant/30 pt-12">
        <h2 className="text-data text-telemetry-red">FASTER · NEWSLETTER</h2>
        <p className="mt-4 max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
          Or just hook into the Race Week Briefing. Same editorial voice,
          delivered before lights out every weekend.
        </p>
        <Link
          href="/newsletter"
          className="mt-6 inline-flex items-center gap-3 bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
        >
          Subscribe
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </section>
    </article>
  );
}
