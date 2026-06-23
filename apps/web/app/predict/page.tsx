import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { jolpica, mapRace, mapDriverStanding } from '@apex/api-client/jolpica';
import {
  getConsensus,
  getLeaderboard,
  getPrediction,
  getRacePredictions,
  setPredictionScores,
} from '@apex/db';
import { PredictForm } from './predict-form';
import { PREDICT_QUESTIONS, PREDICT_MAX, scorePicks } from '@/lib/predict';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Grid Predict',
  description:
    'Apex Grid Predict · pick pole, winner, podium and fastest lap before lights out. Scored automatically against the real result. Climb the season leaderboard. Free, no signup.',
};

export default async function PredictPage() {
  const races = (await jolpica.getSchedule('current', { revalidate: 3600 })).map(mapRace);
  const now = Date.now();
  const next = races.find((r) => new Date(r.raceStartIso).getTime() > now);
  const lastDone = [...races].reverse().find((r) => new Date(r.raceStartIso).getTime() < now);
  const season = next?.season ?? lastDone?.season ?? new Date().getUTCFullYear();

  const standings = (await jolpica.getDriverStandings('current', { revalidate: 1800 })).map(
    mapDriverStanding,
  );
  const drivers = standings.map((s) => ({ id: s.driver.slug, name: s.driver.fullName }));
  const driverName = new Map(drivers.map((d) => [d.id, d.name] as const));

  const pid = (await cookies()).get('apex_pid')?.value ?? null;

  // ---- Upcoming race: form + live consensus ----------------------------------
  let nextLockMs = 0;
  let nextIsLocked = false;
  let initialPicks: Record<string, string> = {};
  let consensus: Awaited<ReturnType<typeof getConsensus>> = { total: 0, questions: {} };
  if (next) {
    nextLockMs = new Date(
      next.sessions.find((s) => s.kind === 'Q')?.iso ?? next.raceStartIso,
    ).getTime();
    nextIsLocked = nextLockMs < now;
    const [mine, c] = await Promise.all([
      pid ? getPrediction(pid, season, next.round) : Promise.resolve(null),
      getConsensus(season, next.round),
    ]);
    initialPicks = (mine?.picks ?? {}) as Record<string, string>;
    consensus = c;
  }

  // ---- Last completed race: auto-score + leaderboard -------------------------
  let lastBlock: {
    name: string;
    winnerName: string;
    leaderboard: Awaited<ReturnType<typeof getLeaderboard>>;
    myScore: ReturnType<typeof scorePicks> | null;
  } | null = null;
  if (lastDone) {
    const [rr, quali] = await Promise.all([
      jolpica.getRaceResults(lastDone.season, lastDone.round, { revalidate: 3600 }),
      jolpica.getQualifying(lastDone.season, lastDone.round, { revalidate: 3600 }),
    ]);
    if (rr && rr.results.length > 0) {
      const preds = await getRacePredictions(lastDone.season, lastDone.round);
      const unscored = preds.filter((p) => p.score === null);
      if (unscored.length > 0) {
        await setPredictionScores(
          unscored.map((p) => ({ id: p.id, score: scorePicks(p.picks, rr.results, quali).total })),
        );
      }
      const [leaderboard, mine] = await Promise.all([
        getLeaderboard(lastDone.season, 10),
        pid ? getPrediction(pid, lastDone.season, lastDone.round) : Promise.resolve(null),
      ]);
      const winnerId = rr.results.find((r) => r.position === '1')?.Driver.driverId ?? '';
      lastBlock = {
        name: lastDone.name,
        winnerName: driverName.get(winnerId) ?? winnerId,
        leaderboard,
        myScore: mine?.picks ? scorePicks(mine.picks, rr.results, quali) : null,
      };
    }
  }

  return (
    <article>
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <span className="text-data text-telemetry-red">GRID PREDICT · {season}</span>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-tight text-on-background md:text-8xl">
            Pole. Win.
            <br />
            Podium. Lap.
          </h1>
          <p className="mt-6 max-w-3xl font-editorial text-xl leading-relaxed text-on-surface-variant md:text-2xl">
            Four calls before lights out, worth {PREDICT_MAX} points. Scored automatically against
            the real result, then ranked on the season leaderboard. Free, no signup, no spam.
          </p>
          {next && (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={`/schedule/${next.season}/${next.slug}`}
                className="font-headline text-sm uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-on-background"
              >
                {next.name} details ↗
              </Link>
              <span className="text-data text-outline">
                Picks lock:{' '}
                {new Date(nextLockMs).toLocaleString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                })}{' '}
                UTC
              </span>
            </div>
          )}
        </div>
      </header>

      {next ? (
        <section className="border-b border-outline-variant/30">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-12 md:px-grid-margin md:py-16">
            <PredictForm
              raceName={next.name}
              raceSlug={next.slug}
              season={season}
              round={next.round}
              isLocked={nextIsLocked}
              drivers={drivers}
              initialPicks={initialPicks}
            />

            {consensus.total > 0 && (
              <div className="mt-14 border-t border-outline-variant/30 pt-10">
                <h2 className="text-data text-telemetry-red">
                  THE GRID THINKS · {consensus.total} {consensus.total === 1 ? 'fan' : 'fans'} in
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                  {PREDICT_QUESTIONS.map((q) => {
                    const top = consensus.questions[q.id]?.[0];
                    return (
                      <div
                        key={q.id}
                        className="border border-outline-variant/40 bg-surface-container-low p-5"
                      >
                        <div className="text-data text-outline">{q.label}</div>
                        {top ? (
                          <>
                            <div className="mt-3 font-headline text-lg text-on-background">
                              {driverName.get(top.value) ?? top.value}
                            </div>
                            <div className="mt-1 text-data text-telemetry-red">
                              {top.pct}% of fans
                            </div>
                          </>
                        ) : (
                          <div className="mt-3 text-data text-outline">No picks yet</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="border-b border-outline-variant/30">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin">
            <p className="font-editorial text-xl text-on-surface-variant">
              No upcoming race on the calendar. Last race results below.
            </p>
          </div>
        </section>
      )}

      {lastBlock && (
        <section className="border-b border-outline-variant/30">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-20">
            <h2 className="text-data text-telemetry-red">LAST RACE · {lastBlock.name}</h2>
            <p className="mt-3 font-display text-3xl uppercase tracking-tight text-on-background md:text-5xl">
              Winner: {lastBlock.winnerName}
            </p>

            {lastBlock.myScore && (
              <div className="mt-8 border border-telemetry-red/40 bg-surface-container-low p-6">
                <div className="text-data text-telemetry-red">
                  YOUR SCORE · {lastBlock.myScore.total} / {PREDICT_MAX} PTS
                </div>
                <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {lastBlock.myScore.questions.map((q) => (
                    <li key={q.id} className="flex items-center justify-between text-sm">
                      <span className="text-on-surface-variant">{q.label}</span>
                      <span className={q.correct ? 'text-telemetry-red' : 'text-outline'}>
                        {q.pick ? (driverName.get(q.pick) ?? q.pick) : '—'}
                        {q.correct ? ` ✓ +${q.awarded}` : ' ✗'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10">
              <h3 className="text-data text-telemetry-red">SEASON LEADERBOARD</h3>
              {lastBlock.leaderboard.length > 0 ? (
                <ol className="mt-5 divide-y divide-outline-variant/30 border-y border-outline-variant/40">
                  {lastBlock.leaderboard.map((row, i) => (
                    <li
                      key={row.clientId}
                      className="grid grid-cols-[40px_1fr_auto] items-center gap-4 px-2 py-4 md:px-4"
                    >
                      <span className="font-data text-xl text-on-background">{i + 1}</span>
                      <span className="font-headline text-on-background">
                        {row.handle ?? `Anon ${row.clientId.slice(0, 4)}`}
                      </span>
                      <span className="font-data text-lg text-telemetry-red">
                        {row.total} pts · {row.races} {row.races === 1 ? 'race' : 'races'}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-5 text-data text-outline">
                  No scored predictions yet. Be the first in next race.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
          <h2 className="text-data text-telemetry-red">HOW IT WORKS</h2>
          <ol className="mt-8 grid grid-cols-1 gap-px overflow-hidden bg-outline-variant/40 md:grid-cols-4">
            {[
              { n: '01', t: 'Pick before lights out', d: 'Four calls: pole, winner, podium, fastest lap. Locked at qualifying.' },
              { n: '02', t: 'Scored on the real result', d: 'Every pick checked against the live Jolpica classification. No manual grading.' },
              { n: '03', t: 'Climb the leaderboard', d: 'Points stack across the season. Saved to your browser, no signup.' },
              { n: '04', t: 'See the consensus', d: 'Watch what the rest of the grid is calling before you lock in.' },
            ].map((s) => (
              <li key={s.n} className="bg-background p-6 md:p-8">
                <div className="font-data text-3xl text-telemetry-red md:text-4xl">{s.n}</div>
                <h3 className="mt-4 font-headline text-lg text-on-background md:text-xl">{s.t}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </article>
  );
}
