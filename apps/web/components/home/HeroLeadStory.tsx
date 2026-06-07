'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { leadArticle } from '@/lib/fixtures/articles';

export function HeroLeadStory() {
  const a = leadArticle;
  return (
    <section className="relative w-full overflow-hidden bg-background">
      <div className="relative h-[88vh] min-h-[640px] w-full">
        <img
          src={a.heroImageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
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
              <span className="text-data text-telemetry-red">{a.section}</span>
              <span className="h-px w-12 bg-outline" />
              <span className="text-data text-outline">{a.readTimeMinutes} MIN READ</span>
            </div>

            <h1 className="text-display text-4xl text-on-background sm:text-5xl md:text-7xl lg:text-[84px]">
              {a.title}
            </h1>

            <p className="mt-6 max-w-2xl font-editorial text-lg text-on-surface-variant md:text-2xl">
              {a.dek}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={`/latest/article/${a.slug}`}
                className="group inline-flex items-center gap-3 bg-telemetry-red px-6 py-3 font-headline text-sm uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90"
              >
                Read story
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
              <Link
                href="/latest"
                className="inline-flex items-center gap-2 font-headline text-sm uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
              >
                All news
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
