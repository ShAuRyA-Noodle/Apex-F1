import Link from 'next/link';

const groups: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Race',
    links: [
      { label: 'Schedule', href: '/schedule' },
      { label: 'Results', href: '/results/2026/drivers' },
      { label: 'Live timing', href: '/live/timing' },
      { label: 'Archive', href: '/results/archive' },
    ],
  },
  {
    title: 'Grid',
    links: [
      { label: 'Drivers', href: '/drivers' },
      { label: 'Teams', href: '/teams' },
      { label: 'Hall of Fame', href: '/drivers/hall-of-fame' },
      { label: 'Champions', href: '/drivers/champions' },
    ],
  },
  {
    title: 'Coverage',
    links: [
      { label: 'Latest', href: '/latest' },
      { label: 'Video', href: '/video' },
      { label: 'Newsletter', href: '/newsletter' },
      { label: 'Search', href: '/search' },
    ],
  },
  {
    title: 'Apex',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Apex+', href: '/membership' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Disclaimer', href: '/legal/disclaimer' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
      { label: 'DMCA', href: '/legal/dmca' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-outline-variant/40 bg-carbon-black">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-5 md:mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-telemetry-red font-data text-base font-bold text-on-background">
                A
              </div>
              <span className="text-display text-2xl uppercase tracking-tight text-on-background">
                Apex
              </span>
            </Link>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Independent Formula 1 fan platform. Race-day intelligence, factual data,
              cinematic editorial. No affiliation with Formula 1, FIA, FOM, or any team.
            </p>
          </div>

          {groups.map((g) => (
            <div key={g.title}>
              <h4 className="text-data mb-4 text-telemetry-red">{g.title}</h4>
              <ul className="space-y-3">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-on-surface-variant transition-colors hover:text-on-background"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-outline-variant/30 pt-8 text-xs leading-relaxed text-outline">
          <p>
            Apex is an independent, fan-built Formula 1 information service. Apex is not
            affiliated with, endorsed by, or associated with Formula 1, Formula One World
            Championship Limited, FIA, FOM, Liberty Media, or any constructor or driver.
            &ldquo;Formula 1&rdquo;, &ldquo;F1&rdquo;, &ldquo;Grand Prix&rdquo;, and
            team/driver names are used in a purely descriptive sense.
          </p>
          <div className="mt-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} Apex. All rights reserved.</span>
            <span className="text-data text-telemetry-red">
              v0.1 · PHASE 1 · BETA
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
