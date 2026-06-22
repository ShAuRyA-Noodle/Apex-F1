'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@apex/ui';
import { ApexMonogram } from './ApexMonogram';

type DropdownColumn = {
  title: string;
  links: { label: string; href: string; tag?: string }[];
};

type DropdownPreview = {
  eyebrow: string;
  title: string;
  href: string;
  meta?: string;
};

type MegaSection = {
  label: string;
  href: string;
  columns: DropdownColumn[];
  preview?: DropdownPreview;
};

// Every href here must resolve to either an actual app/ route or a query
// string the destination page actually filters on. Dead links from this NAV
// were the #1 finding across the deep audit — every entry below is now
// verified against /latest, /video, /results, /drivers, /teams page logic.
const NAV: MegaSection[] = [
  {
    label: 'Latest',
    href: '/latest',
    columns: [
      {
        title: 'Newsrooms',
        links: [
          { label: 'All sources', href: '/latest' },
          // Slugs derived from F1_RSS_SOURCES.name -> lowercase, no spaces, no dots.
          { label: 'Motorsport.com', href: '/latest?source=motorsportcom' },
          { label: 'Autosport', href: '/latest?source=autosport' },
          { label: 'RaceFans', href: '/latest?source=racefans' },
          { label: 'The Race', href: '/latest?source=the-race' },
        ],
      },
      {
        title: 'Wire APIs',
        links: [
          { label: 'The Guardian', href: '/latest?source=the-guardian' },
          { label: 'GNews', href: '/latest?source=gnews' },
          { label: 'NewsData', href: '/latest?source=newsdata' },
        ],
      },
      {
        title: 'Filters',
        links: [
          { label: 'English only', href: '/latest?lang=en' },
          { label: 'Italian', href: '/latest?lang=it' },
          { label: 'Positive sentiment', href: '/latest?sentiment=positive' },
        ],
      },
    ],
  },
  {
    label: 'Schedule',
    href: '/schedule',
    columns: [
      {
        title: 'Current',
        links: [
          { label: 'Full 2026 calendar', href: '/schedule' },
          // Anchor jump to the next-race tile on the schedule page. The
          // /schedule page assigns #next to whichever race is next so this
          // works even when the calendar advances.
          { label: 'Jump to next race', href: '/schedule#next' },
        ],
      },
      {
        title: 'Past seasons',
        links: [
          { label: '2025 archive', href: '/schedule/2025' },
          { label: '2024 archive', href: '/schedule/2024' },
          { label: 'All seasons', href: '/results/archive' },
        ],
      },
    ],
  },
  {
    label: 'Results',
    href: '/results/2026/drivers',
    columns: [
      {
        title: 'Standings 2026',
        links: [
          { label: 'Drivers', href: '/results/2026/drivers' },
          { label: 'Constructors', href: '/results/2026/teams' },
        ],
      },
      {
        title: 'Recent',
        links: [
          { label: '2025 drivers', href: '/results/2025/drivers' },
          { label: '2025 constructors', href: '/results/2025/teams' },
          { label: '2024 drivers', href: '/results/2024/drivers' },
          { label: '2024 constructors', href: '/results/2024/teams' },
        ],
      },
      {
        title: 'Archive · 1950 to present',
        links: [
          { label: 'All seasons', href: '/results/archive' },
          { label: 'World champions', href: '/drivers/champions' },
          { label: 'Constructor champions', href: '/teams/champions' },
        ],
      },
    ],
  },
  {
    label: 'Drivers',
    href: '/drivers',
    columns: [
      {
        title: 'Grid 2026',
        links: [
          { label: 'Current grid', href: '/drivers' },
        ],
      },
      {
        title: 'History',
        links: [
          { label: 'World champions', href: '/drivers/champions' },
          { label: 'Hall of Fame', href: '/drivers/hall-of-fame' },
        ],
      },
    ],
  },
  {
    label: 'Teams',
    href: '/teams',
    columns: [
      {
        title: 'Constructors',
        links: [
          { label: 'Current 2026', href: '/teams' },
          { label: 'All constructors', href: '/teams/all' },
        ],
      },
      {
        title: 'History',
        links: [
          { label: 'Constructor champions', href: '/teams/champions' },
        ],
      },
    ],
  },
  {
    label: 'Video',
    href: '/video',
    columns: [
      {
        title: 'Channels',
        links: [
          { label: 'All recent', href: '/video' },
          // channelSlug() in /video/page.tsx is name.toLowerCase().replace(/\s+/g, '-')
          // So "FORMULA 1" -> "formula-1", "Chain Bear" -> "chain-bear",
          // "Tommo" -> "tommo", "Driver61" -> "driver61", "WTF1" -> "wtf1".
          { label: 'FORMULA 1 official', href: '/video?channel=formula-1' },
          { label: 'Chain Bear', href: '/video?channel=chain-bear' },
          { label: 'WTF1', href: '/video?channel=wtf1' },
          { label: 'Tommo', href: '/video?channel=tommo' },
          { label: 'Driver61', href: '/video?channel=driver61' },
        ],
      },
      {
        title: 'Sort',
        links: [
          { label: 'Newest first', href: '/video?sort=newest' },
          { label: 'Most viewed', href: '/video?sort=most-viewed' },
        ],
      },
    ],
  },
  {
    label: 'Live',
    href: '/live/timing',
    columns: [
      {
        title: 'Race day',
        links: [
          { label: 'Live timing', href: '/live/timing', tag: 'LIVE' },
          { label: 'Race control', href: '/live/race-control' },
          { label: 'Track map', href: '/live/track' },
        ],
      },
    ],
  },
];

export interface MegaNavLivePreviews {
  /** Live RSS top item — overrides the "Latest" dropdown preview card. */
  latest?: DropdownPreview;
  /** Live next-race chip — overrides the "Schedule" dropdown preview card. */
  schedule?: DropdownPreview;
}

export function MegaNav({ previews }: { previews?: MegaNavLivePreviews } = {}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [utilHidden, setUtilHidden] = useState(false);
  const lastYRef = useRef(0);
  const closeTimer = useRef<number | null>(null);

  // Find active section for the red-dot indicator
  const activeLabel =
    NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.label ?? null;

  // Inject live previews into the static NAV at render time. This keeps the
  // NAV structure declarative while letting the dropdowns reflect real-time
  // data passed by the server wrapper.
  const navWithPreviews = NAV.map((section) => {
    if (section.label === 'Latest' && previews?.latest) {
      return { ...section, preview: previews.latest };
    }
    if (section.label === 'Schedule' && previews?.schedule) {
      return { ...section, preview: previews.schedule };
    }
    return section;
  });

  useEffect(() => {
    // User asked to drop the "always-on" sticky behavior. Now:
    //   - First ~80px of the page = nav visible (so the brand always greets)
    //   - Scroll down past 80px = nav slides off the top
    //   - Any upward scroll instantly reveals it again (Material-You pattern)
    //   - Any open dropdown OR open mobile sheet pins it open so the user
    //     never loses the menu mid-interaction
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const goingDown = y > lastYRef.current;
      const past = y > 80;
      // Mirror TopUtilityBar's hide rule (y past one viewport, scrolling down)
      // so the nav rises to top-0 and fills the 32px band the utility bar
      // vacates — no transparent gap above the glass nav.
      setUtilHidden(y > window.innerHeight && goingDown);
      const interactionOpen = open !== null || mobile || searchOpen;
      if (interactionOpen) {
        setHidden(false);
      } else if (past && goingDown) {
        setHidden(true);
      } else if (!goingDown || y < 80) {
        setHidden(false);
      }
      lastYRef.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open, mobile, searchOpen]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobile]);

  const enter = (label: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(label);
  };
  const leave = () => {
    closeTimer.current = window.setTimeout(() => setOpen(null), 140);
  };

  return (
    <>
      <motion.header
        data-shell="mega-nav"
        data-compact={hidden || undefined}
        initial={false}
        // No translateY hide. Per user feedback ("navbar completely disappears
        // on scroll-down"), the nav now stays visible permanently · we just
        // collapse it into a compact 44px-tall variant when scrolled past the
        // hero. data-compact drives the height transition + element shrink.
        animate={{ y: 0 }}
        transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
        className={cn(
          'sticky top-0 z-40 w-full transition-[top] duration-300',
          utilHidden ? 'md:top-0' : 'md:top-8',
          'glass-pronounced transition-[backdrop-filter] duration-300',
          scrolled && 'shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]',
        )}
      >
        <div
          className={cn(
            'apex-container flex items-center justify-between transition-[height] duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)]',
            hidden ? 'h-12 md:h-[48px]' : 'h-16 md:h-[72px]',
          )}
        >
          {/* Left: logo lockup */}
          <Link href="/" className="group flex items-center gap-3" onMouseEnter={leave}>
            <ApexMonogram size={hidden ? 22 : 32} animated />
            <span className="flex items-baseline gap-2">
              <span
                className={cn(
                  'font-display font-extrabold uppercase leading-none tracking-[-0.04em] text-on-background transition-all duration-300',
                  hidden ? 'text-[18px]' : 'text-[26px]',
                )}
              >
                Apex
              </span>
              <span
                className={cn(
                  'hidden font-data tracking-[0.18em] text-outline transition-opacity duration-300 md:inline',
                  hidden ? 'text-[9px] opacity-0' : 'text-[10px] opacity-100',
                )}
              >
                v0.1 · BETA
              </span>
            </span>
          </Link>

          {/* Center: primary nav */}
          <nav aria-label="Primary" className="hidden lg:flex" onMouseLeave={leave}>
            <ul className="relative flex items-stretch gap-1">
              {navWithPreviews.map((section) => {
                const isActive = activeLabel === section.label;
                const isOpen = open === section.label;
                return (
                  <li
                    key={section.label}
                    className="relative"
                    onMouseEnter={() => enter(section.label)}
                  >
                    <Link
                      href={section.href}
                      prefetch
                      className={cn(
                        'relative flex items-center px-4 font-data tracking-[0.14em] transition-all duration-300',
                        // Section pills shrink in lockstep with the navbar's
                        // compact mode · same easing window so they don't
                        // animate independently from the surrounding shell.
                        hidden
                          ? 'h-[48px] text-[11px]'
                          : 'h-[72px] text-[12.5px]',
                        isActive || isOpen
                          ? 'text-on-background'
                          : 'text-on-surface-variant hover:text-on-background',
                      )}
                    >
                      {section.label.toUpperCase()}
                      {isActive && (
                        <motion.span
                          layoutId="apex-nav-dot"
                          className="absolute bottom-3 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-telemetry-red"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right: search + mobile menu */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open search"
              onClick={() => setSearchOpen(true)}
              className="group flex h-10 items-center gap-2 border border-outline-variant/40 bg-surface-container/40 px-3 transition-colors hover:border-on-background/40 hover:bg-surface-container/70"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant transition-colors group-hover:text-on-background">
                search
              </span>
              <span className="hidden font-data text-[11px] tracking-[0.16em] text-on-surface-variant lg:inline">
                SEARCH
              </span>
              <span className="hidden font-data text-[10px] tracking-[0.16em] text-outline lg:inline">
                /
              </span>
            </button>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobile(true)}
              className="flex h-10 w-10 items-center justify-center border border-outline-variant/40 bg-surface-container/40 transition-colors hover:border-on-background/40 lg:hidden"
            >
              <span className="material-symbols-outlined text-[22px] text-on-background">
                menu
              </span>
            </button>
          </div>
        </div>

        {/* Desktop mega-dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              key={open}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.215, 0.61, 0.355, 1] }}
              className="absolute left-0 right-0 top-full hidden lg:block"
              onMouseEnter={() => enter(open)}
              onMouseLeave={leave}
            >
              <div className="glass-panel border-t border-outline-variant/40">
                <div className="apex-container grid grid-cols-12 gap-10 py-12">
                  {(() => {
                    const section = navWithPreviews.find((s) => s.label === open);
                    if (!section) return null;
                    const colSpan = section.preview ? 'col-span-8' : 'col-span-12';
                    // Static class map — Tailwind v4 purges runtime `grid-cols-${n}`.
                    const gridCols =
                      ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'][
                        Math.min(section.columns.length, 4)
                      ] ?? 'grid-cols-1';
                    return (
                      <>
                        <div className={`${colSpan} grid ${gridCols} gap-8`}>
                          {section.columns.map((col, i) => (
                            <motion.div
                              key={col.title}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, delay: 0.04 * i }}
                            >
                              <h4 className="mb-4 font-data text-[10.5px] tracking-[0.20em] text-outline">
                                {col.title.toUpperCase()}
                              </h4>
                              <ul className="space-y-3">
                                {col.links.map((l) => (
                                  <li key={l.href}>
                                    <Link
                                      href={l.href}
                                      prefetch
                                      onClick={() => setOpen(null)}
                                      className="group flex items-center gap-3 transition-colors hover:text-telemetry-red"
                                    >
                                      <span className="font-headline text-[17px] text-on-background transition-colors group-hover:text-telemetry-red">
                                        {l.label}
                                      </span>
                                      {l.tag && (
                                        <span className="rounded-sm bg-telemetry-red/20 px-1.5 py-0.5 font-data text-[9px] tracking-[0.16em] text-telemetry-red">
                                          {l.tag}
                                        </span>
                                      )}
                                      <span className="material-symbols-outlined ml-auto text-[16px] text-outline opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                                        arrow_outward
                                      </span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ))}
                        </div>

                        {section.preview && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.08 }}
                            className="col-span-4"
                          >
                            <Link
                              href={section.preview.href}
                              prefetch
                              onClick={() => setOpen(null)}
                              className="group relative block h-full overflow-hidden border border-outline-variant/40 bg-gradient-to-br from-surface-container-low to-carbon-black p-6 transition-all hover:border-telemetry-red/60"
                            >
                              <span className="font-data text-[10.5px] tracking-[0.22em] text-telemetry-red">
                                {section.preview.eyebrow}
                              </span>
                              <h3 className="mt-3 font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-on-background">
                                {section.preview.title}
                              </h3>
                              {section.preview.meta && (
                                <p className="mt-4 font-data text-[11px] tracking-[0.14em] text-outline">
                                  {section.preview.meta.toUpperCase()}
                                </p>
                              )}
                              <span className="material-symbols-outlined absolute bottom-5 right-5 text-[20px] text-on-surface-variant transition-transform group-hover:translate-x-0.5 group-hover:text-telemetry-red">
                                arrow_outward
                              </span>
                            </Link>
                          </motion.div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* Mobile takeover */}
      <AnimatePresence>
        {mobile && (
          <MobileTakeover
            sections={NAV}
            onClose={() => setMobile(false)}
            onOpenSearch={() => {
              setMobile(false);
              setSearchOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ============================================================
 * Mobile full-screen takeover
 * ============================================================ */
function MobileTakeover({
  sections,
  onClose,
  onOpenSearch,
}: {
  sections: MegaSection[];
  onClose: () => void;
  onOpenSearch: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      className="fixed inset-0 z-[70] flex flex-col lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Apex navigation"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/95 backdrop-blur-2xl"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
        className="relative flex h-full flex-col"
      >
        {/* Header bar inside takeover */}
        <div className="apex-container flex h-16 items-center justify-between border-b border-outline-variant/30">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <ApexMonogram size={26} />
            <span className="font-display text-[22px] font-extrabold uppercase tracking-[-0.04em] text-on-background">
              Apex
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center border border-outline-variant/40"
          >
            <span className="material-symbols-outlined text-[22px] text-on-background">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="apex-container pt-6">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex w-full items-center gap-3 border border-outline-variant/40 bg-surface-container/40 px-4 py-3.5 text-left"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">search</span>
            <span className="font-data text-[12px] tracking-[0.16em] text-on-surface-variant">
              SEARCH APEX
            </span>
          </button>
        </div>

        {/* Sections with stagger */}
        <nav aria-label="Mobile primary" className="apex-container flex-1 overflow-y-auto py-8">
          <ul className="space-y-1">
            {sections.map((s, i) => (
              <motion.li
                key={s.label}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32, delay: 0.05 + i * 0.05, ease: [0.215, 0.61, 0.355, 1] }}
              >
                <Link
                  href={s.href}
                  onClick={onClose}
                  className="group flex items-center justify-between border-b border-outline-variant/20 py-5"
                >
                  <span className="font-display text-[44px] font-extrabold uppercase leading-[1.05] tracking-[-0.04em] text-on-background transition-colors group-hover:text-telemetry-red">
                    {s.label}
                  </span>
                  <span className="material-symbols-outlined text-[28px] text-outline transition-transform group-hover:translate-x-1 group-hover:text-telemetry-red">
                    arrow_forward
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>

        {/* Footer utility (the 3-dot reveal area for the slim utility bar) */}
        <div className="apex-container border-t border-outline-variant/30 py-6">
          <div className="grid grid-cols-2 gap-y-3 gap-x-6">
            {(
              [
                { label: 'Newsletter', href: '/newsletter' },
                { label: 'Archive', href: '/results/archive' },
                { label: 'Support', href: '/support' },
                { label: 'About', href: '/about' },
              ] as const
            ).map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="font-data text-[12px] tracking-[0.18em] text-on-surface-variant hover:text-on-background"
              >
                {label.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
 * Search overlay (search button morphs into this)
 * ============================================================ */
/**
 * Search overlay with real Enter-key submit + suggestion navigation.
 *
 * Audit findings closed:
 *   - audit-shell P2 [MegaNav.tsx:594] input had no submit handler
 *   - audit-shell P2 [MegaNav.tsx:613-624] suggestions only closed the modal
 *
 * Behaviour:
 *   - Enter on the input pushes /search?q=<query>
 *   - Each suggestion has a real { label, href } pair and routes via
 *     next/navigation router.push when clicked. No more inert chips.
 *   - ESC + backdrop-click + ESC-button all close.
 */
const SEARCH_SUGGESTIONS: { label: string; href: string }[] = [
  { label: 'Next race · Schedule', href: '/schedule' },
  { label: 'Drivers · 2026 grid', href: '/drivers' },
  { label: 'Standings · Drivers', href: '/results/2026/drivers' },
  { label: 'Standings · Constructors', href: '/results/2026/teams' },
  { label: 'Live timing', href: '/live/timing' },
  { label: 'World champions', href: '/drivers/champions' },
];

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/search');
    }
    onClose();
  };

  const goSuggestion = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-label="Search"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
      />
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.215, 0.61, 0.355, 1] }}
        className="apex-container relative pt-[18vh]"
      >
        <form onSubmit={submit} className="glass-panel mx-auto max-w-3xl p-2">
          <div className="flex items-center gap-3 border-b border-outline-variant/40 px-4 py-4">
            <span className="material-symbols-outlined text-[22px] text-telemetry-red">search</span>
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search drivers, races, teams, archive..."
              className="flex-1 bg-transparent font-headline text-[20px] text-on-background placeholder:text-outline focus:outline-none"
            />
            <span className="hidden font-data text-[10px] tracking-[0.18em] text-outline md:inline">
              PRESS RETURN
            </span>
            <button
              type="button"
              onClick={onClose}
              className="font-data text-[11px] tracking-[0.18em] text-on-surface-variant hover:text-on-background"
            >
              ESC
            </button>
          </div>
          <div className="px-4 py-4">
            <p className="font-data text-[10.5px] tracking-[0.20em] text-outline">SUGGESTED</p>
            <ul className="mt-3 space-y-2">
              {SEARCH_SUGGESTIONS.map((s) => (
                <li key={s.href}>
                  <button
                    type="button"
                    onClick={() => goSuggestion(s.href)}
                    className="flex w-full items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-surface-container/40"
                  >
                    <span className="material-symbols-outlined text-[18px] text-outline">north_east</span>
                    <span className="font-headline text-[15px] text-on-background">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
