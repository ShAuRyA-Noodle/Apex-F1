'use client';

import { useEffect, useState } from 'react';

interface Q {
  id: string;
  label: string;
  options: string[];
  points: number;
}

const QUESTIONS: Q[] = [
  {
    id: 'pole',
    label: 'Pole position',
    options: ['Verstappen', 'Norris', 'Piastri', 'Leclerc', 'Hamilton', 'Russell', 'Antonelli', 'Other'],
    points: 3,
  },
  {
    id: 'winner',
    label: 'Race winner',
    options: ['Verstappen', 'Norris', 'Piastri', 'Leclerc', 'Hamilton', 'Russell', 'Other'],
    points: 5,
  },
  {
    id: 'fastest_lap',
    label: 'Fastest lap',
    options: ['Verstappen', 'Norris', 'Piastri', 'Leclerc', 'Hamilton', 'Russell', 'Other'],
    points: 1,
  },
  {
    id: 'first_dnf',
    label: 'First retirement (DNF)',
    options: ['No DNF', 'Backmarker', 'Midfield', 'Top 5', 'Other'],
    points: 3,
  },
  {
    id: 'safety_car',
    label: 'Safety car deployed?',
    options: ['Yes — VSC only', 'Yes — full SC', 'No'],
    points: 1,
  },
];

const KEY_PREFIX = 'apex.predict.v1';

function storageKey(raceSlug: string, season: number) {
  return `${KEY_PREFIX}.${season}.${raceSlug}`;
}

export function PredictForm({
  raceName,
  raceSlug,
  season,
  isLocked,
}: {
  raceName: string;
  raceSlug: string;
  season: number;
  isLocked: boolean;
}) {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(raceSlug, season));
      if (raw) setPicks(JSON.parse(raw));
    } catch {
      /* no-op */
    }
  }, [raceSlug, season]);

  function save() {
    try {
      window.localStorage.setItem(storageKey(raceSlug, season), JSON.stringify(picks));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      /* no-op */
    }
  }

  function setPick(id: string, opt: string) {
    setPicks((p) => ({ ...p, [id]: opt }));
    setSaved(false);
  }

  const total = QUESTIONS.reduce((acc, q) => acc + (picks[q.id] ? q.points : 0), 0);
  const max = QUESTIONS.reduce((acc, q) => acc + q.points, 0);
  const filled = Object.values(picks).filter(Boolean).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-data text-telemetry-red">YOUR PICKS · {raceName}</h2>
          <p className="mt-2 font-editorial text-lg text-on-surface-variant md:text-xl">
            {filled} / {QUESTIONS.length} answered · max {max} pts
          </p>
        </div>
        {isLocked && (
          <span className="bg-telemetry-red px-4 py-2 text-data text-on-background">LOCKED</span>
        )}
      </div>

      <ol className="space-y-8">
        {QUESTIONS.map((q) => (
          <li key={q.id}>
            <div className="flex items-baseline justify-between">
              <h3 className="font-headline text-lg text-on-background md:text-xl">{q.label}</h3>
              <span className="text-data text-outline">{q.points} PTS</span>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const active = picks[q.id] === opt;
                return (
                  <li key={opt}>
                    <button
                      type="button"
                      onClick={() => setPick(q.id, opt)}
                      disabled={isLocked}
                      className={
                        active
                          ? 'bg-telemetry-red px-4 py-2 text-sm font-semibold text-on-background'
                          : 'border border-outline-variant px-4 py-2 text-sm text-on-surface transition-colors hover:border-telemetry-red disabled:cursor-not-allowed disabled:opacity-50'
                      }
                    >
                      {opt}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={isLocked || filled === 0}
          className="bg-telemetry-red px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saved ? 'Saved ✓' : 'Save my picks'}
        </button>
        <span className="text-data text-outline">
          POTENTIAL: {total} / {max} PTS
        </span>
      </div>
    </div>
  );
}
