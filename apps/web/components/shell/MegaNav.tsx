'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@apex/ui';

type MegaSection = {
  label: string;
  href: string;
  groups: { title: string; links: { label: string; href: string; tag?: string }[] }[];
  preview?: { title: string; href: string; image: string; dek: string };
};

const NAV: MegaSection[] = [
  {
    label: 'Latest',
    href: '/latest',
    groups: [
      {
        title: 'Sections',
        links: [
          { label: 'All news', href: '/latest' },
          { label: 'Features', href: '/latest/section/feature' },
          { label: 'Analysis', href: '/latest/section/analysis' },
          { label: 'Quizzes', href: '/latest/section/quiz' },
          { label: 'Galleries', href: '/latest/section/gallery' },
        ],
      },
      {
        title: 'Topics',
        links: [
          { label: 'Race week', href: '/latest/tag/race-week' },
          { label: 'Technical', href: '/latest/tag/technical' },
          { label: 'Strategy', href: '/latest/tag/strategy' },
          { label: 'Driver market', href: '/latest/tag/driver-market', tag: 'HOT' },
        ],
      },
    ],
    preview: {
      title: 'How Mercedes engineered the W17 floor for Monaco',
      href: '/latest/article/mercedes-w17-floor',
      image:
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
      dek: 'Inside the aero choices that put Russell on pole and unlocked Hamilton’s long stint.',
    },
  },
  {
    label: 'Schedule',
    href: '/schedule',
    groups: [
      {
        title: '2026 calendar',
        links: [
          { label: 'Full schedule', href: '/schedule' },
          { label: 'Next race', href: '/schedule/2026/spain' },
          { label: 'Sprint weekends', href: '/schedule#sprints' },
          { label: 'Test sessions', href: '/schedule#testing' },
        ],
      },
      {
        title: 'Archive',
        links: [
          { label: '2025 season', href: '/schedule/2025' },
          { label: '2024 season', href: '/schedule/2024' },
          { label: 'Historic seasons', href: '/schedule/archive' },
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
          { label: 'Race by race', href: '/results/2026/races' },
        ],
      },
      {
        title: 'Historical',
        links: [
          { label: 'Archive 1950-2025', href: '/results/archive' },
          { label: 'Hall of Fame', href: '/drivers/hall-of-fame' },
          { label: 'Records', href: '/results/awards' },
        ],
      },
    ],
  },
  {
    label: 'Drivers',
    href: '/drivers',
    groups: [
      {
        title: '2026 grid',
        links: [
          { label: 'Current grid', href: '/drivers' },
          { label: 'Compare', href: '/drivers?compare=1' },
          { label: 'By nationality', href: '/drivers?by=nationality' },
        ],
      },
      {
        title: 'History',
        links: [
          { label: 'All-time index', href: '/drivers/all' },
          { label: 'Hall of Fame', href: '/drivers/hall-of-fame' },
          { label: 'Champions (1950-2025)', href: '/drivers/champions' },
        ],
      },
    ],
  },
  {
    label: 'Teams',
    href: '/teams',
    groups: [
      {
        title: '2026 constructors',
        links: [
          { label: 'Current teams', href: '/teams' },
          { label: 'Power units', href: '/teams?by=power-unit' },
          { label: 'Compare', href: '/teams?compare=1' },
        ],
      },
      {
        title: 'History',
        links: [
          { label: 'All teams', href: '/teams/all' },
          { label: 'Championship winners', href: '/teams/champions' },
        ],
      },
    ],
  },
  {
    label: 'Video',
    href: '/video',
    groups: [
      {
        title: 'Rails',
        links: [
          { label: 'Race highlights', href: '/video?rail=highlights' },
          { label: 'Technical', href: '/video?rail=technical' },
          { label: 'Driver interviews', href: '/video?rail=interviews' },
          { label: 'Behind the scenes', href: '/video?rail=bts' },
        ],
      },
    ],
  },
  {
    label: 'Live',
    href: '/live/timing',
    groups: [
      {
        title: 'Race weekend',
        links: [
          { label: 'Live timing', href: '/live/timing', tag: 'BETA' },
          { label: 'Track map', href: '/live/track' },
          { label: 'Race control', href: '/live/race-control' },
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
              {NAV.find((s) => s.label === open)?.preview && (
                <Link
                  href={NAV.find((s) => s.label === open)!.preview!.href}
                  className="group col-span-6 ml-auto block max-w-md"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-high">
                    <img
                      src={NAV.find((s) => s.label === open)!.preview!.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-transparent to-transparent" />
                    <span className="text-data absolute left-4 top-4 text-telemetry-red">
                      FEATURED
                    </span>
                  </div>
                  <h3 className="mt-4 font-headline text-xl text-on-background">
                    {NAV.find((s) => s.label === open)!.preview!.title}
                  </h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {NAV.find((s) => s.label === open)!.preview!.dek}
                  </p>
                </Link>
              )}
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
