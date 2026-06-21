'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@apex/ui';

type MegaSection = {
  label: string;
  href: string;
  groups: { title: string; links: { label: string; href: string; tag?: string }[] }[];
};

const NAV: MegaSection[] = [
  {
    label: 'Latest',
    href: '/latest',
    groups: [
      {
        title: 'Sources',
        links: [
          { label: 'All news', href: '/latest' },
          { label: 'Motorsport.com', href: '/latest?source=motorsport' },
          { label: 'Autosport', href: '/latest?source=autosport' },
          { label: 'RaceFans', href: '/latest?source=racefans' },
          { label: 'The Race', href: '/latest?source=the-race' },
        ],
      },
      {
        title: 'Community',
        links: [
          { label: 'r/formula1 hot', href: '/latest?source=reddit' },
        ],
      },
    ],
  },
  {
    label: 'Schedule',
    href: '/schedule',
    groups: [
      {
        title: 'Current season',
        links: [
          { label: 'Full schedule', href: '/schedule' },
        ],
      },
    ],
  },
  {
    label: 'Results',
    href: '/results/2026/drivers',
    groups: [
      {
        title: 'Standings',
        links: [
          { label: 'Drivers', href: '/results/2026/drivers' },
          { label: 'Constructors', href: '/results/2026/teams' },
        ],
      },
    ],
  },
  {
    label: 'Drivers',
    href: '/drivers',
    groups: [
      {
        title: 'Grid',
        links: [{ label: 'Current grid', href: '/drivers' }],
      },
    ],
  },
  {
    label: 'Teams',
    href: '/teams',
    groups: [
      {
        title: 'Constructors',
        links: [{ label: 'Current constructors', href: '/teams' }],
      },
    ],
  },
  {
    label: 'Video',
    href: '/video',
    groups: [
      {
        title: 'Channels',
        links: [
          { label: 'All recent', href: '/video' },
          { label: 'FORMULA 1 official', href: '/video?channel=formula1' },
          { label: 'Chain Bear', href: '/video?channel=chain-bear' },
          { label: 'Tommo F1', href: '/video?channel=tommo' },
          { label: 'Driver61', href: '/video?channel=driver61' },
        ],
      },
    ],
  },
];

export function MegaNav() {
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const enter = (label: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(label);
  };
  const leave = () => {
    closeTimer.current = window.setTimeout(() => setOpen(null), 120);
  };

  return (
    <header
      className={cn(
        'sticky top-9 z-30 w-full border-b border-outline-variant/40 transition-colors',
        scrolled ? 'bg-background/90 backdrop-blur-xl' : 'bg-background/70 backdrop-blur',
      )}
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 md:px-grid-margin">
        <Link href="/" className="flex items-center gap-3" onMouseEnter={leave}>
          <div className="flex h-8 w-8 items-center justify-center bg-telemetry-red font-data text-base font-bold text-on-background">
            A
          </div>
          <span className="text-display text-xl uppercase tracking-tight text-on-background">
            Apex
          </span>
        </Link>

        <nav aria-label="Main" className="hidden lg:flex" onMouseLeave={leave}>
          <ul className="flex items-stretch gap-1">
            {NAV.map((section) => (
              <li
                key={section.label}
                className="relative"
                onMouseEnter={() => enter(section.label)}
              >
                <Link
                  href={section.href}
                  className={cn(
                    'flex h-12 items-center px-4 text-[13px] uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background',
                    open === section.label && 'text-on-background',
                  )}
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          aria-label="Open menu"
          className="lg:hidden material-symbols-outlined text-[28px] text-on-background"
          onClick={() => setOpen(open === 'mobile' ? null : 'mobile')}
        >
          menu
        </button>
      </div>

      <AnimatePresence>
        {open && open !== 'mobile' && (
          <motion.div
            key={open}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full hidden border-y border-outline-variant/40 bg-surface-container/95 backdrop-blur-2xl lg:block"
            onMouseEnter={() => enter(open)}
            onMouseLeave={leave}
          >
            <div className="mx-auto grid w-full max-w-[1600px] grid-cols-12 gap-10 px-grid-margin py-10">
              {NAV.find((s) => s.label === open)?.groups.map((g) => (
                <div key={g.title} className="col-span-3">
                  <h4 className="text-data mb-4 text-outline">{g.title}</h4>
                  <ul className="space-y-3">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="group flex items-center gap-2 text-on-surface transition-colors hover:text-telemetry-red"
                        >
                          <span className="font-headline text-base">{l.label}</span>
                          {l.tag && (
                            <span className="font-data text-[10px] text-telemetry-red">
                              {l.tag}
                            </span>
                          )}
                          <span className="material-symbols-outlined ml-auto text-[16px] opacity-0 transition-opacity group-hover:opacity-100">
                            arrow_outward
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {open === 'mobile' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-outline-variant/40 bg-surface-container/98 backdrop-blur-2xl lg:hidden"
          >
            <ul className="divide-y divide-outline-variant/30 px-4 py-2">
              {NAV.map((s) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    onClick={() => setOpen(null)}
                    className="flex items-center justify-between py-4 font-headline text-lg text-on-background"
                  >
                    {s.label}
                    <span className="material-symbols-outlined text-[20px] text-outline">
                      chevron_right
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
