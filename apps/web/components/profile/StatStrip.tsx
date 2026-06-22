'use client';

import { motion } from 'framer-motion';
import { CountUpBadge } from './CountUpBadge';

export interface StatItem {
  label: string;
  /** Numeric value triggers CountUp; string renders verbatim. */
  value: string | number;
  /** Optional smaller subline (e.g. place of birth). */
  sub?: string;
  /** Optional ornament before label (flag emoji, etc). */
  ornament?: string;
  /** Numeric formatting hints. */
  decimals?: number;
  suffix?: string;
  prefix?: string;
  group?: boolean;
}

export function StatStrip({ items }: { items: StatItem[] }) {
  // Literal responsive column classes (Tailwind v4 has no runtime safelist, so
  // `sm:grid-cols-${n}` would be purged). Picked by stat count so 5-6 career
  // stats wrap cleanly instead of being crushed into equal columns everywhere.
  const cols =
    items.length <= 3
      ? 'sm:grid-cols-3'
      : items.length === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-3 lg:grid-cols-6';
  return (
    <section className="relative border-y border-outline-variant/30 bg-surface-container-lowest/60 backdrop-blur-xl">
      <div
        className={`mx-auto grid w-full max-w-[1600px] grid-cols-2 ${cols} md:px-grid-margin`}
      >
        {/* Mobile: snap horizontal scroll */}
        <div className="col-span-full overflow-x-auto sm:hidden">
          <ul className="flex w-max snap-x snap-mandatory">
            {items.map((it, i) => (
              <li key={it.label} className="snap-start">
                <StatCell item={it} index={i} mobile />
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop / tablet grid */}
        {items.map((it, i) => (
          <div
            key={`d-${it.label}`}
            className="hidden sm:block"
            style={{ borderRight: i < items.length - 1 ? '1px solid rgba(68,71,72,0.4)' : 'none' }}
          >
            <StatCell item={it} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCell({
  item,
  index,
  mobile = false,
}: {
  item: StatItem;
  index: number;
  mobile?: boolean;
}) {
  const numeric = typeof item.value === 'number';
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      transition={{
        delay: 0.08 * index,
        duration: 0.7,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      className={
        mobile
          ? 'min-w-[68vw] border-r border-outline-variant/40 px-7 py-9'
          : 'px-7 py-10 md:px-9 md:py-12'
      }
    >
      <div className="flex items-center gap-2 text-data text-outline">
        {item.ornament && <span aria-hidden="true">{item.ornament}</span>}
        <span>{item.label}</span>
      </div>
      <div className="mt-4 font-display text-4xl uppercase leading-none tracking-tight text-on-background md:text-6xl">
        {numeric ? (
          <CountUpBadge
            value={item.value as number}
            decimals={item.decimals ?? 0}
            prefix={item.prefix}
            suffix={item.suffix}
            group={item.group}
          />
        ) : (
          item.value
        )}
      </div>
      {item.sub && (
        <div className="mt-2 font-editorial text-sm italic text-on-surface-variant md:text-base">
          {item.sub}
        </div>
      )}
    </motion.div>
  );
}
