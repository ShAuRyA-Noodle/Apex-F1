import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Help build Apex. Open roles, hiring approach, what we are looking for.',
};

export default function CareersPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-24 md:px-grid-margin md:py-32">
      <header>
        <span className="text-data text-telemetry-red">CAREERS</span>
        <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          Build the platform<br />the paddock deserves.
        </h1>
        <p className="mt-6 max-w-2xl font-editorial text-lg leading-relaxed text-on-surface-variant md:text-2xl">
          Apex is founder-led. Roles open when there is real work to give
          and real revenue to back it. We hire writers, designers, and
          engineers who actually watch the race.
        </p>
      </header>

      <section className="mt-12">
        <h2 className="text-data text-telemetry-red">OPEN ROLES</h2>
        <ul className="mt-6 border-y border-outline-variant/40 divide-y divide-outline-variant/30">
          <Role
            title="Contract editorial writer"
            commitment="2 race weekends / month, paid per piece"
            pitch="Race-week features and analysis. Strong technical voice. Bylined."
            mailto="hello@apex.gg?subject=Editorial%20pitch%20-%20Apex"
          />
          <Role
            title="Design partner (visual)"
            commitment="Per-project, when commissioned"
            pitch="Hero image direction, branded social assets, race-weekend creative."
            mailto="hello@apex.gg?subject=Design%20-%20Apex"
          />
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-data text-telemetry-red">HOW WE HIRE</h2>
        <ol className="mt-6 list-decimal pl-6 font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
          <li>Email with a sample of your work and 3 race takes.</li>
          <li>One 30-minute call.</li>
          <li>Paid trial piece.</li>
          <li>Ongoing engagement.</li>
        </ol>
      </section>

      <section className="mt-16 border-t border-outline-variant/30 pt-12">
        <h2 className="text-data text-telemetry-red">CONTACT</h2>
        <p className="mt-4 font-editorial text-lg leading-relaxed text-on-surface-variant md:text-xl">
          Send a short note to{' '}
          <a
            href="mailto:hello@apex.gg?subject=Apex%20-%20I%20want%20to%20help"
            className="text-telemetry-red underline underline-offset-4"
          >
            hello@apex.gg
          </a>
          . Include a link or two of your best work. We reply within a week.
        </p>
        <div className="mt-8">
          <Link
            href="/contact"
            className="inline-flex items-center gap-3 bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
          >
            Contact form
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </article>
  );
}

function Role({
  title,
  commitment,
  pitch,
  mailto,
}: {
  title: string;
  commitment: string;
  pitch: string;
  mailto: string;
}) {
  return (
    <li className="py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="font-headline text-xl text-on-background md:text-2xl">{title}</h3>
        <span className="text-data text-outline">{commitment}</span>
      </div>
      <p className="mt-3 max-w-2xl text-base text-on-surface-variant">{pitch}</p>
      <a
        href={`mailto:${mailto}`}
        className="mt-4 inline-flex items-center gap-2 text-data text-telemetry-red transition-colors hover:text-on-background"
      >
        APPLY · EMAIL US
        <span className="material-symbols-outlined text-[16px]">north_east</span>
      </a>
    </li>
  );
}
