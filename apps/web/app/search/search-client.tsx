'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Fuse, { type FuseResult, type IFuseOptions } from 'fuse.js';
import type { SearchItem } from './page';

const KIND_LABEL: Record<SearchItem['kind'], string> = {
  driver: 'DRIVER',
  team: 'CONSTRUCTOR',
  race: 'RACE',
};

// Fuse weights mirror what a human types · everyone reaches for the name
// first, the meta line (team / round / season) is the natural backup, and
// the slug is the long-tail fallback for url-aware fans. Threshold 0.42
// gives forgiveness for one or two typos (Verstapen → Verstappen, Mclaren →
// McLaren) without leaking unrelated rows.
const FUSE_OPTIONS: IFuseOptions<SearchItem> = {
  keys: [
    { name: 'title', weight: 0.6 },
    { name: 'meta', weight: 0.3 },
    { name: 'slug', weight: 0.1 },
  ],
  threshold: 0.42,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
  shouldSort: true,
};

const KIND_BUCKETS: Array<{ key: SearchItem['kind'] | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'driver', label: 'Drivers' },
  { key: 'team', label: 'Constructors' },
  { key: 'race', label: 'Races' },
];

function highlight(value: string, needle: string) {
  if (!needle) return value;
  const idx = value.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return value;
  return (
    <>
      {value.slice(0, idx)}
      <mark className="bg-telemetry-red/20 text-on-background underline decoration-telemetry-red/60 decoration-2 underline-offset-4">
        {value.slice(idx, idx + needle.length)}
      </mark>
      {value.slice(idx + needle.length)}
    </>
  );
}

export function SearchClient({
  items,
  initialQuery = '',
}: {
  items: SearchItem[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [kindFilter, setKindFilter] = useState<SearchItem['kind'] | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQ = useDeferredValue(q);

  // Index gets rebuilt only when the underlying items change · Fuse's index
  // build is O(n) over the corpus so doing it on every keystroke would
  // burn time on a 1500-row corpus.
  const fuse = useMemo(() => new Fuse(items, FUSE_OPTIONS), [items]);

  const ranked = useMemo<FuseResult<SearchItem>[]>(() => {
    const needle = deferredQ.trim();
    if (!needle) {
      return items.map((it, i) => ({ item: it, refIndex: i, score: 0 }));
    }
    return fuse.search(needle, { limit: 200 });
  }, [fuse, items, deferredQ]);

  const filtered = useMemo(() => {
    return ranked.filter((r) => kindFilter === 'all' || r.item.kind === kindFilter);
  }, [ranked, kindFilter]);

  const counts = useMemo(() => {
    const c = { all: ranked.length, driver: 0, team: 0, race: 0 };
    for (const r of ranked) c[r.item.kind] += 1;
    return c;
  }, [ranked]);

  // Press `/` anywhere to focus search · standard editorial shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      const inField = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === '/' && !inField) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQ('');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[22px] text-outline">
            search
          </span>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Verstapen, Mclaren, monaco, 2023..."
            aria-label="Search"
            autoFocus
            className="w-full border border-outline-variant bg-surface-container-low pl-12 pr-16 py-4 font-headline text-lg text-on-background placeholder:text-outline focus:border-telemetry-red focus:outline-none md:text-xl"
          />
          <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 select-none rounded-sm border border-outline-variant/60 px-2 py-1 font-data text-[10.5px] text-outline md:block">
            press /
          </kbd>
        </div>
        <div className="flex items-center gap-1 border border-outline-variant/60 p-1">
          {KIND_BUCKETS.map((b) => {
            const active = kindFilter === b.key;
            const count = b.key === 'all' ? counts.all : counts[b.key];
            return (
              <button
                key={b.key}
                onClick={() => setKindFilter(b.key)}
                className={
                  active
                    ? 'flex items-center gap-2 bg-telemetry-red px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-background'
                    : 'flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant hover:text-on-background'
                }
              >
                <span>{b.label}</span>
                <span className={active ? 'text-on-background/70' : 'text-outline'}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-data text-outline">
        <span>
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'} of {items.length}
        </span>
        {deferredQ && (
          <span>· Fuzzy match · typo tolerant</span>
        )}
      </div>

      {filtered.length === 0 && deferredQ ? (
        <div className="mt-12 border border-dashed border-outline-variant/50 p-10 text-center">
          <div className="font-display text-3xl text-on-background">No matches.</div>
          <p className="mt-3 text-[15px] text-on-surface-variant">
            Try a driver surname, a constructor, a race location, or a season year.
            Press <kbd className="rounded-sm border border-outline-variant/60 px-1.5 py-0.5 font-data text-[11px]">Esc</kbd> to clear.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-outline-variant/30 border-y border-outline-variant/40">
          {filtered.slice(0, 80).map((r) => {
            const it = r.item;
            return (
              <li key={`${it.kind}-${it.slug}`}>
                <Link
                  href={it.href}
                  className="group flex items-center justify-between gap-4 px-2 py-4 transition-colors hover:bg-surface-container-low md:px-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-data text-telemetry-red">{KIND_LABEL[it.kind]}</div>
                    <div className="mt-1 truncate font-headline text-lg text-on-background md:text-xl">
                      {highlight(it.title, deferredQ)}
                    </div>
                    <div className="mt-1 truncate text-[14px] text-on-surface-variant">
                      {highlight(it.meta, deferredQ)}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[24px] text-outline transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
