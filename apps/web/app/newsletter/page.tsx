import type { Metadata } from 'next';
import { NewsletterForm } from './form';

export const metadata: Metadata = {
  title: 'Newsletter',
  description: 'Race Week Briefing — one short race-week edition delivered before lights out.',
};

export default function NewsletterPage() {
  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-20 md:px-grid-margin md:py-32">
          <span className="text-data text-telemetry-red">RACE WEEK BRIEFING</span>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-8xl">
            The briefing that<br />lands before lights out.
          </h1>
          <p className="mt-6 max-w-3xl font-editorial text-xl leading-relaxed text-on-surface-variant md:text-2xl">
            One concise edition every race week: strategy preview, tyre intel, paddock
            corner, standings recap. 8 sections. 1200 words. Sent Friday morning your local
            timezone. No spam. Unsubscribe one-click.
          </p>
        </div>
      </header>

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin md:py-16">
          <NewsletterForm />
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <h2 className="text-data text-telemetry-red">WHAT YOU GET EACH EDITION</h2>
          <ul className="mt-8 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-2 lg:grid-cols-4">
            <Card title="Countdown" copy="Race-time conversion to your timezone. Session-by-session." />
            <Card title="Strategy preview" copy="Tyre allocation, expected stints, undercut windows, weather risk." />
            <Card title="Driver to watch" copy="One in-form driver. Why this weekend is different." />
            <Card title="Paddock corner" copy="The story FOM won't run. Two paragraphs, no PR-spin." />
            <Card title="Standings recap" copy="Top 5 drivers + constructors. Points gap math." />
            <Card title="3 must-read links" copy="One technical, one historical, one feature. From across the wire." />
            <Card title="Did you know" copy="A 1950-2025 archive nugget. Race-week trivia." />
            <Card title="Sunday wake-up" copy="What to set the alarm for." />
          </ul>
        </div>
      </section>
    </article>
  );
}

function Card({ title, copy }: { title: string; copy: string }) {
  return (
    <li className="bg-background p-6 md:p-7">
      <h3 className="font-headline text-base text-on-background md:text-lg">{title}</h3>
      <p className="mt-2 text-sm text-on-surface-variant">{copy}</p>
    </li>
  );
}
