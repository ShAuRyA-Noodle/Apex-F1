'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ApexMonogram } from './ApexMonogram';
import { LiveStatusDot } from './TopUtilityBar';

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
      { label: 'Predict', href: '/predict' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Support · tip jar', href: '/support' },
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

const HERO_WORDS = ['Independent.', 'Unofficial.', 'Original', 'editorial.'];

// Capture the year once at module load so the SSR-rendered © text matches
// the first client render. The previous inline `new Date().getFullYear()`
// in render would diverge between server and client around the UTC New
// Year boundary, throwing a hydration mismatch on the © text node.
const COPYRIGHT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer
      data-shell="footer"
      className="relative overflow-hidden border-t border-outline-variant/40 bg-carbon-black"
      style={{ marginTop: 'var(--apex-section-gap)' }}
    >
      {/* Faint monogram backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 bottom-0 select-none opacity-[0.04]"
        style={{ filter: 'blur(1px)' }}
      >
        <ApexMonogram size={520} />
      </div>

      <div className="apex-container relative py-20 md:py-28">
        {/* Editorial hero */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-9">
            <p className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">
              EST. 2026 · INDEPENDENT
            </p>
            <h2
              className="mt-6 font-display font-extrabold uppercase leading-[0.95] tracking-[-0.045em] text-on-background"
              style={{ fontSize: 'clamp(2.75rem, 7vw, 5.5rem)' }}
            >
              {HERO_WORDS.map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  initial={{ y: 28, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.215, 0.61, 0.355, 1] }}
                  className="mr-3 inline-block"
                >
                  {word}
                </motion.span>
              ))}
            </h2>
            <p className="mt-8 max-w-2xl font-editorial text-[20px] leading-[1.55] text-on-surface-variant">
              Apex is a fan-built information service. Race-day intelligence, factual data,
              cinematic editorial. We do not sell access. We do not run advertising for teams.
              We are built by people who watch the race and want to understand it deeper.
            </p>
          </div>

          <div className="col-span-12 flex flex-col items-start gap-3 lg:col-span-3 lg:items-end lg:justify-end">
            <Link
              href="/newsletter"
              className="inline-flex items-center gap-2 border border-on-background bg-on-background px-5 py-3 transition-colors hover:bg-telemetry-red hover:border-telemetry-red"
            >
              <span className="font-data text-[12px] tracking-[0.18em] text-background">
                JOIN THE PIT WALL
              </span>
              <span className="material-symbols-outlined text-[18px] text-background">arrow_outward</span>
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 border border-outline-variant/70 px-5 py-3 text-on-background transition-colors hover:border-telemetry-red hover:text-telemetry-red"
            >
              <span className="material-symbols-outlined text-[18px]">local_cafe</span>
              <span className="font-data text-[12px] tracking-[0.18em]">
                BUY US A COFFEE
              </span>
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-16 h-px w-full bg-outline-variant/30" />

        {/* 5 link columns */}
        <div className="mt-12 grid grid-cols-2 gap-y-10 gap-x-6 sm:grid-cols-3 lg:grid-cols-5">
          {groups.map((g) => (
            <div key={g.title}>
              <h4 className="font-data text-[10.5px] tracking-[0.22em] text-telemetry-red">
                {g.title.toUpperCase()}
              </h4>
              <ul className="mt-5 space-y-3">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="link-draw font-headline text-[15px] text-on-surface-variant transition-colors hover:text-on-background"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Editorial disclaimer in EB Garamond italic */}
        <div className="mt-16 border-t border-outline-variant/30 pt-10">
          <p className="max-w-4xl font-editorial text-[16px] italic leading-[1.6] text-on-surface-variant">
            Apex is an independent, fan-built Formula 1 information service. Apex is not
            affiliated with, endorsed by, or associated with Formula 1, Formula One World
            Championship Limited, FIA, FOM, Liberty Media, or any constructor or driver.
            &ldquo;Formula 1&rdquo;, &ldquo;F1&rdquo;, &ldquo;Grand Prix&rdquo;, and
            team & driver names are used in a purely descriptive, journalistic sense.
          </p>
        </div>

        {/* Creator credit · Apex is shipped by one person, named */}
        <div className="mt-12 flex flex-col items-start gap-4 border-t border-outline-variant/30 pt-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-data text-[11px] tracking-[0.22em] text-telemetry-red">
              DESIGNED, ENGINEERED, SHIPPED BY
            </span>
            <a
              href="https://shauryapunj.com"
              target="_blank"
              rel="noopener noreferrer me"
              className="group inline-flex items-center gap-2 font-display text-2xl uppercase tracking-tight text-on-background transition-colors hover:text-telemetry-red md:text-3xl"
            >
              Shaurya Punj
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                arrow_outward
              </span>
            </a>
            <span className="font-data text-[10.5px] tracking-[0.18em] text-on-surface-variant">
              ONE PERSON · INDIA · IST
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://github.com/ShAuRyA-Noodle"
              target="_blank"
              rel="noopener noreferrer me"
              className="link-draw font-data text-[11px] tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
            >
              GITHUB
            </a>
            <span className="h-3 w-px bg-outline-variant/60" aria-hidden />
            <a
              href="https://www.linkedin.com/in/shaurya-punj-2287513b3/"
              target="_blank"
              rel="noopener noreferrer me"
              className="link-draw font-data text-[11px] tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
            >
              LINKEDIN
            </a>
            <span className="h-3 w-px bg-outline-variant/60" aria-hidden />
            <a
              href="https://x.com/ShAuRyANoodle"
              target="_blank"
              rel="noopener noreferrer me"
              className="link-draw font-data text-[11px] tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
            >
              X · TWITTER
            </a>
            <span className="h-3 w-px bg-outline-variant/60" aria-hidden />
            <a
              href="mailto:workwithshaurya10@gmail.com"
              className="link-draw font-data text-[11px] tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
            >
              EMAIL
            </a>
          </div>
        </div>

        {/* Bottom strip · version + uptime · sits below the credit */}
        <div className="mt-10 flex flex-col items-start gap-5 border-t border-outline-variant/30 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <ApexMonogram size={20} />
            <span className="font-data text-[11px] tracking-[0.18em] text-on-surface-variant">
              © {COPYRIGHT_YEAR} APEX · INDEPENDENT · SOLO BUILD
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-sm border border-outline-variant/50 px-2 py-1 font-data text-[10px] tracking-[0.16em] text-on-surface-variant">
              v0.1 · PHASE 1 · BETA
            </span>
            <LiveStatusDot label="ALL SYSTEMS OPERATIONAL" />
          </div>
        </div>
      </div>
    </footer>
  );
}
