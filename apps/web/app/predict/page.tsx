import type { Metadata } from 'next';
import Link from 'next/link';
import { jolpica, mapRace } from '@apex/api-client/jolpica';
import { PredictForm } from './predict-form';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Grid Predict',
  description:
    'Apex Grid Prediction Market — pick 5 questions every race weekend, build a league with friends, climb the global leaderboard.',
};

export default async function PredictPage() {
  const raw = await jolpica.getSchedule('current', { revalidate: 3600 });
  const races = raw.map(mapRace);
  const now = Date.now();
  const next = races.find((r) => new Date(r.raceStartIso).getTime() > now);

  if (!next) {
    return (
      <article className="mx-auto w-full max-w-[1600px] px-4 py-32 md:px-grid-margin">
        <h1 className="font-display text-5xl uppercase tracking-tight text-on-background">
          Grid Predict
        </h1>
        <p className="mt-6 font-editorial text-xl text-on-surface-variant">
          No upcoming race on the calendar.
        </p>
      </article>
    );
  }

  const lockMs = new Date(next.sessions.find((s) => s.kind === 'Q')?.iso ?? next.raceStartIso).getTime();
  const isLocked = lockMs < Date.now();

  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <span className="text-data text-telemetry-red">GRID PREDICT · {next.season}</span>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-8xl">
            5 picks.<br />
            One race.<br />
            Bragging rights.
          </h1>
          <p className="mt-6 max-w-3xl font-editorial text-xl leading-relaxed text-on-surface-variant md:text-2xl">
            Make 5 calls before qualifying locks. Score across the weekend. Build a league with
            your friends. Climb the global leaderboard across the season. Free, no signup
            required to play — sign in to track streaks.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/schedule/${next.season}/${next.slug}`}
              className="font-headline text-sm uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
            >
              Race details ↗
            </Link>
            <span className="text-data text-outline">
              Picks lock: {new Date(lockMs).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      <section className="border-b border-outline-variant/30">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin md:py-16">
          <PredictForm
            raceName={next.name}
            raceSlug={next.slug}
            season={next.season}
            isLocked={isLocked}
          />
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <h2 className="text-data text-telemetry-red">HOW IT WORKS</h2>
          <ol className="mt-8 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-4">
            {[
              { n: '01', t: 'Pick before quali', d: 'Make all 5 calls before qualifying starts. Late picks don\'t count.' },
              { n: '02', t: 'Score on Sunday', d: 'Each question scored against the live result. 1-point + 3-point + 5-point tiers.' },
              { n: '03', t: 'League with friends', d: 'Create a private league. Invite up to 50 mates. Season-long table.' },
              { n: '04', t: 'Streaks + badges', d: 'Streak on pole picks. Streak on winner picks. Unlocks on the badge wall.' },
            ].map((s) => (
              <li key={s.n} className="bg-background p-6 md:p-8">
                <div className="font-data text-3xl text-telemetry-red md:text-4xl">{s.n}</div>
                <h3 className="mt-4 font-headline text-lg text-on-background md:text-xl">{s.t}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{s.d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-xs text-outline">
            Persistence + login + private leagues land with Supabase Auth in Phase C. For now,
            picks save to your browser so you can compare against the real result.
          </p>
        </div>
      </section>
    </article>
  );
}
