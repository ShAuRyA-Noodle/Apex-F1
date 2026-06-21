'use client';

import { motion } from 'framer-motion';
import type { RssItem } from '@apex/api-client/rss';

export function HeroLeadStoryClient({ lead }: { lead: RssItem }) {
  const published = lead.pubDate
    ? new Date(lead.pubDate).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  return (
    <section className="relative w-full overflow-hidden bg-background">
      <div className="relative h-[88vh] min-h-[640px] w-full">
        {lead.imageUrl && (
          <img
            src={lead.imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 stave-line-bg opacity-[0.12] mix-blend-overlay"
        />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col justify-end px-4 pb-16 md:px-grid-margin md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.215, 0.61, 0.355, 1] }}
            className="max-w-4xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="text-data text-telemetry-red">{lead.source}</span>
              <span className="h-px w-12 bg-outline" />
              {published && <span className="text-data text-outline">{published}</span>}
            </div>

            <h1 className="text-display text-4xl text-on-background sm:text-5xl md:text-7xl lg:text-[84px]">
              {lead.title}
            </h1>

            {lead.description && (
              <p className="mt-6 max-w-2xl font-editorial text-lg text-on-surface-variant line-clamp-3 md:text-2xl">
                {lead.description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={lead.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
              >
                Read at {lead.source}
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                  arrow_outward
                </span>
              </a>
              <a
                href="/latest"
                className="inline-flex items-center gap-2 font-headline text-sm uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
              >
                All news
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
