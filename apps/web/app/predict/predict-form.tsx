'use client';

import { useState } from 'react';
import { PREDICT_QUESTIONS, PREDICT_MAX } from '@/lib/predict';

interface DriverOpt {
  id: string;
  name: string;
}

export function PredictForm({
  raceName,
  raceSlug,
  season,
  round,
  isLocked,
  drivers,
  initialPicks,
}: {
  raceName: string;
  raceSlug: string;
  season: number;
  round: number;
  isLocked: boolean;
  drivers: DriverOpt[];
  initialPicks: Record<string, string>;
}) {
  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save() {
    setState('saving');
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season, round, raceSlug, picks }),
      });
      setState(res.ok ? 'saved' : 'error');
      if (res.ok) window.setTimeout(() => setState('idle'), 3500);
    } catch {
      setState('error');
    }
  }

  function setPick(id: string, optId: string) {
    setPicks((p) => ({ ...p, [id]: optId }));
    setState('idle');
  }

  const filled = PREDICT_QUESTIONS.filter((q) => picks[q.id]).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-data text-telemetry-red">YOUR PICKS · {raceName}</h2>
          <p className="mt-2 font-editorial text-lg text-on-surface-variant md:text-xl">
            {filled} / {PREDICT_QUESTIONS.length} answered · {PREDICT_MAX} pts on the line
          </p>
        </div>
        {isLocked && (
          <span className="bg-telemetry-red px-4 py-2 text-data text-on-background">LOCKED</span>
        )}
      </div>

      <ol className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {PREDICT_QUESTIONS.map((q) => (
          <li key={q.id} className="border border-outline-variant/40 bg-surface-container-low p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="font-headline text-lg text-on-background">{q.label}</h3>
              <span className="text-data text-outline">{q.points} PTS</span>
            </div>
            <select
              value={picks[q.id] ?? ''}
              disabled={isLocked}
              onChange={(e) => setPick(q.id, e.target.value)}
              className="mt-4 w-full border border-outline-variant bg-background px-4 py-3 font-headline text-base text-on-background focus:border-telemetry-red focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Pick a driver…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={isLocked || filled === 0 || state === 'saving'}
          className="bg-telemetry-red px-7 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-on-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Locked in ✓' : 'Save my picks'}
        </button>
        {state === 'saved' && (
          <span className="text-data text-on-surface-variant">
            Saved across this browser. Scored automatically after the race.
          </span>
        )}
        {state === 'error' && (
          <span className="text-data text-telemetry-red">Could not save. Try again.</span>
        )}
      </div>
    </div>
  );
}
