'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { SearchItem } from './page';

const KIND_LABEL: Record<SearchItem['kind'], string> = {
  driver: 'DRIVER',
  team: 'CONSTRUCTOR',
  race: 'RACE',
};

export function SearchClient({
  items,
  initialQuery = '',
}: {
  items: SearchItem[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [kindFilter, setKindFilter] = useState<SearchItem['kind'] | 'all'>('all');

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (kindFilter !== 'all' && it.kind !== kindFilter) return false;
      if (!needle) return true;
      return (
        it.title.toLowerCase().includes(needle) ||
        it.meta.toLowerCase().includes(needle) ||
        it.slug.toLowerCase().includes(needle)
      );
    });
  }, [items, q, kindFilter]);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Verstappen, Ferrari, Spain..."
          aria-label="Search"
          autoFocus
          className="flex-1 border border-outline-variant bg-surface-container-low px-5 py-4 font-headline text-lg text-on-background placeholder:text-outline focus:border-telemetry-red focus:outline-none"
        />
        <div className="flex items-center gap-1 border border-outline-variant/60 p-1">
          {(['all', 'driver', 'team', 'race'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={
                kindFilter === k
                  ? 'bg-telemetry-red px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background'
                  : 'px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
              }
            >
              {k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)}s
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-data text-outline">
        {results.length} of {items.length} {results.length === 1 ? 'result' : 'results'}
      </p>

      <ul className="mt-6 divide-y divide-outline-variant/30 border-y border-outline-variant/40">
        {results.map((it) => (
          <li key={`${it.kind}-${it.slug}`}>
            <Link
              href={it.href}
              className="group flex items-center justify-between gap-4 px-2 py-4 transition-colors hover:bg-surface-container-low md:px-4"
            >
              <div className="flex-1 min-w-0">
                <div className="text-data text-telemetry-red">{KIND_LABEL[it.kind]}</div>
                <div className="mt-1 truncate font-headline text-lg text-on-background md:text-xl">
                  {it.title}
                </div>
                <div className="mt-1 truncate text-sm text-on-surface-variant">{it.meta}</div>
              </div>
              <span className="material-symbols-outlined text-[24px] text-outline transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
