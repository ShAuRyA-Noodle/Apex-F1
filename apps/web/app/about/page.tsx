import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About Apex · independent Formula 1 fan platform, designed, engineered, and shipped by one person · Shaurya Punj.',
};

const CREATOR = {
  name: 'Shaurya Punj',
  role: 'AI/ML + agentic software engineer',
  tagline:
    'Building intelligent systems that solve real problems. From machine learning pipelines to agentic AI · I engineer software that thinks, adapts, and delivers.',
  location: 'India · IST',
  links: [
    { label: 'Portfolio', href: 'https://shauryapunj.com' },
    { label: 'GitHub', href: 'https://github.com/ShAuRyA-Noodle' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/shaurya-punj-2287513b3/' },
    { label: 'X · Twitter', href: 'https://x.com/ShAuRyANoodle' },
    { label: 'Email', href: 'mailto:workwithshaurya10@gmail.com' },
  ],
} as const;

export default function AboutPage() {
  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-20 md:px-grid-margin md:py-32">
      <span className="text-data text-telemetry-red">ABOUT</span>
      <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
        Built for the fan, by the fan.
      </h1>
      <p className="mt-8 max-w-3xl font-editorial text-xl leading-relaxed text-on-surface-variant md:text-2xl">
        Apex is an independent, unofficial Formula 1 fan platform. We exist to give you a faster,
        denser, more cinematic home for the sport than what the official channels offer · without
        rehosting their video, copying their writing, or pretending to be them.
      </p>

      <section className="mt-20 grid grid-cols-1 gap-12 md:grid-cols-3">
        <div>
          <h2 className="font-headline text-xl uppercase tracking-tight text-on-background">
            Fastest
          </h2>
          <p className="mt-3 text-base text-on-surface-variant">
            Server-rendered, edge-cached, mobile-first. Race-day surfaces load before lights out.
          </p>
        </div>
        <div>
          <h2 className="font-headline text-xl uppercase tracking-tight text-on-background">
            Cinematic
          </h2>
          <p className="mt-3 text-base text-on-surface-variant">
            Design-system grade typography, scroll-pinned reveals, GPU-only motion. No clutter.
          </p>
        </div>
        <div>
          <h2 className="font-headline text-xl uppercase tracking-tight text-on-background">
            Honest
          </h2>
          <p className="mt-3 text-base text-on-surface-variant">
            Public data, original editorial, no F1 trademarks in our brand, full disclaimer in
            every footer.
          </p>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-data text-telemetry-red">DATA SOURCES</h2>
        <ul className="mt-4 grid grid-cols-1 gap-3 font-editorial text-lg text-on-surface md:grid-cols-2">
          <li>
            <strong>Jolpica F1</strong> · historical 1950 to present schedule, results, standings,
            qualifying, pit stops, laps.
          </li>
          <li>
            <strong>OpenF1</strong> · live timing, intervals, race control, weather, telemetry.
          </li>
          <li>
            <strong>Wikidata + Wikimedia Commons</strong> · driver biographies and metadata
            (CC-BY-SA attributed).
          </li>
          <li>
            <strong>OpenWeatherMap</strong> · race-weekend track-side forecasts.
          </li>
        </ul>
      </section>

      <section className="mt-20 border-t border-outline-variant/30 pt-16">
        <span className="text-data text-telemetry-red">BUILT BY · ONE PERSON</span>
        <h2 className="mt-3 font-display text-4xl uppercase tracking-tight text-on-background md:text-6xl">
          {CREATOR.name}
        </h2>
        <p className="mt-3 font-data text-[12px] tracking-[0.18em] text-on-surface-variant">
          {CREATOR.role.toUpperCase()} · {CREATOR.location.toUpperCase()}
        </p>
        <p className="mt-8 max-w-3xl font-editorial text-[20px] leading-relaxed text-on-surface-variant md:text-2xl">
          {CREATOR.tagline}
        </p>
        <p className="mt-6 max-w-3xl text-base text-on-surface-variant">
          Every line of code, every design token, every data source on this site
          was wired up by one person on a laptop. No team. No agency. No outside
          investors. No rescue. If you find a bug, a slow page, or a dead button,
          the buck stops at one inbox.
        </p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {CREATOR.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer me' : undefined}
                className="inline-flex items-center gap-2 border border-outline-variant/60 px-4 py-2.5 font-data text-[12px] tracking-[0.18em] text-on-background transition-colors hover:border-telemetry-red hover:text-telemetry-red"
              >
                <span>{link.label.toUpperCase()}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20">
        <p className="text-base text-on-surface-variant">
          Apex is not affiliated with Formula 1, FIA, FOM, Liberty Media, or any team or driver.
          Read the full{' '}
          <Link href="/legal/disclaimer" className="text-telemetry-red underline">
            disclaimer
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
