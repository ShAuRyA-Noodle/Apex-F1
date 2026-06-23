'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { RssItem } from '@apex/api-client/rss';

const CYCLE_MS = 6500;

/**
 * Hero crossfade. Cycles through up to 5 server-resolved lead stories,
 * crossfading the background image, source/time chip, title, dek, and the
 * CTA href together so the slot feels editorial · not a slideshow widget.
 *
 * - Background does a Ken Burns slow zoom (transform-only, GPU cheap).
 * - The timestamp is pinned to UTC inside toLocaleString so SSR and client
 *   hydration agree on the rendered string.
 * - Pauses on hover so the user can actually read a slide they care about.
 * - Pagination dots double as a non-rotating skip control.
 */
export function HeroLeadStoryClient({ leads }: { leads: RssItem[] }) {
  const safeLeads = leads.length > 0 ? leads : [];
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (safeLeads.length <= 1 || paused) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % safeLeads.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [safeLeads.length, paused]);

  const current = safeLeads[idx];
  const published = useMemo(() => {
    if (!current?.pubDate) return '';
    return (
      new Date(current.pubDate).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    );
  }, [current]);

  if (!current) return null;

  return (
    <section
      className="relative w-full bg-background"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[88vh] min-h-[640px] w-full">
        {/* Background layer · clipped so the Ken Burns zoom stays inside the frame. */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="sync">
            {current.imageUrl && (
              <motion.img
                key={`hero-img-${idx}`}
                src={current.imageUrl}
                alt=""
                fetchPriority={idx === 0 ? 'high' : 'low'}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                width={1920}
                height={1080}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{
                  opacity: { duration: 1.1, ease: [0.215, 0.61, 0.355, 1] },
                  scale: { duration: CYCLE_MS / 1000 + 1, ease: 'linear' },
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" />
          <div className="absolute inset-0 stave-line-bg opacity-[0.12] mix-blend-overlay" />
        </div>

        {/* Copy layer · NOT clipped, with top clearance so a tall headline never
            slides under the sticky shell / breaking-news strip. */}
        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col justify-end px-4 pb-16 pt-24 md:px-grid-margin md:pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-copy-${idx}`}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
              className="max-w-4xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-data text-telemetry-red">{current.source}</span>
                <span className="h-px w-12 bg-outline" />
                {published && (
                  <span className="text-data text-outline" suppressHydrationWarning>
                    {published}
                  </span>
                )}
              </div>

              <h1 className="text-display text-4xl text-on-background [text-wrap:balance] line-clamp-3 sm:text-5xl md:text-7xl lg:text-[84px]">
                {current.title}
              </h1>

              {current.description && (
                <p className="mt-6 max-w-2xl font-editorial text-lg text-on-surface-variant line-clamp-3 md:text-2xl">
                  {current.description}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={current.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
                >
                  Read at {current.source}
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                    arrow_outward
                  </span>
                </a>
                <a
                  href="/latest"
                  className="link-draw inline-flex items-center gap-2 font-headline text-sm uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
                >
                  All news
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
              </div>
            </motion.div>
          </AnimatePresence>

          {safeLeads.length > 1 && (
            <div className="mt-8 flex items-center gap-3">
              <div className="flex items-center gap-2">
                {safeLeads.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-label={`Show lead story ${i + 1} of ${safeLeads.length}`}
                    className={
                      i === idx
                        ? 'h-1 w-8 bg-telemetry-red transition-all'
                        : 'h-1 w-3 bg-outline-variant/70 transition-all hover:bg-on-surface-variant'
                    }
                  />
                ))}
              </div>
              <span className="font-data text-[10.5px] tracking-[0.22em] text-outline">
                {String(idx + 1).padStart(2, '0')} / {String(safeLeads.length).padStart(2, '0')}
                {paused && ' · PAUSED'}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
