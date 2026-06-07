'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { featuredVideos } from '@/lib/fixtures/videos';

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FeaturedVideoRail() {
  return (
    <section className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 md:px-grid-margin">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-data text-telemetry-red">FEATURED VIDEO</h2>
            <p className="mt-2 font-editorial text-2xl text-on-background md:text-3xl">
              Race-day analysis, technical breakdowns, driver-cut originals
            </p>
          </div>
          <Link href="/video" className="text-data text-on-surface-variant hover:text-on-background">
            ALL VIDEO →
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {featuredVideos.map((v, i) => (
            <motion.article
              key={v.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.215, 0.61, 0.355, 1] }}
              className="w-[320px] shrink-0 md:w-[380px]"
            >
              <Link href={`/video/${v.slug}`} className="group block">
                <div className="relative aspect-[16/9] overflow-hidden bg-surface-container-high">
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="material-symbols-outlined rounded-full bg-telemetry-red p-3 text-[28px] text-on-background">
                      play_arrow
                    </span>
                  </div>
                  <span className="text-data absolute bottom-3 right-3 bg-carbon-black/80 px-2 py-1 text-xs text-on-background">
                    {fmtDur(v.durationSeconds)}
                  </span>
                </div>
                <h3 className="mt-4 line-clamp-2 font-headline text-base text-on-background md:text-lg">
                  {v.title}
                </h3>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-outline">
                  {v.channel}
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
