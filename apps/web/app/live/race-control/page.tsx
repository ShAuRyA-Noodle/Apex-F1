import type { Metadata } from 'next';
import Link from 'next/link';
import { openf1 } from '@apex/api-client/openf1';

export const revalidate = 15;

export const metadata: Metadata = {
  title: 'Race control',
  description: 'Live race control messages · direct from OpenF1.',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const FLAG_COLOR: Record<string, string> = {
  YELLOW: '#FFE600',
  DOUBLE_YELLOW: '#FFE600',
  RED: '#FF3333',
  GREEN: '#00C853',
  BLUE: '#0091EA',
  WHITE: '#FFFFFF',
  CLEAR: '#00C853',
  CHEQUERED: '#FFFFFF',
};

export default async function RaceControlPage() {
  const session = await openf1.getLatestSession({ revalidate: 30 });
  if (!session) {
    return (
      <article className="mx-auto w-full max-w-[1600px] px-4 py-32 md:px-grid-margin">
        <h1 className="font-display text-5xl uppercase tracking-tight text-on-background">
          Race control
        </h1>
        <p className="mt-6 font-editorial text-xl text-on-surface-variant">
          No active session.
        </p>
      </article>
    );
  }

  const messages = await openf1.getRaceControl(session.session_key, { revalidate: 15 });
  const sorted = messages.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <article className="mx-auto w-full max-w-[1600px] px-4 py-16 md:px-grid-margin md:py-24">
      <header>
        <Link
          href="/live/timing"
          className="text-data inline-flex items-center gap-1 text-outline transition-colors hover:text-on-background"
        >
          ← TIMING TOWER
        </Link>
        <span className="text-data mt-6 block text-telemetry-red">RACE CONTROL · OpenF1</span>
        <h1 className="mt-2 font-display text-5xl uppercase tracking-tight text-on-background md:text-7xl">
          {session.location} {session.session_name}
        </h1>
      </header>

      {sorted.length === 0 ? (
        <p className="mt-16 font-editorial text-xl text-on-surface-variant">
          No race-control messages for this session yet.
        </p>
      ) : (
        <ol className="mt-12 border-y border-outline-variant/40 divide-y divide-outline-variant/30">
          {sorted.map((m, i) => {
            const flagColor = m.flag ? FLAG_COLOR[m.flag.toUpperCase()] : undefined;
            return (
              <li key={`${m.date}-${i}`} className="grid grid-cols-[110px_8px_1fr_auto] items-start gap-4 p-4 md:p-5">
                <span className="font-data text-sm text-on-surface-variant">{fmtTime(m.date)}</span>
                <span
                  aria-hidden="true"
                  className="block h-full w-1.5"
                  style={{ backgroundColor: flagColor ?? '#444' }}
                />
                <div>
                  <div className="text-data text-outline">
                    {m.category}
                    {m.flag && ` · ${m.flag}`}
                    {m.lap_number ? ` · LAP ${m.lap_number}` : ''}
                    {m.sector ? ` · S${m.sector}` : ''}
                  </div>
                  <p className="mt-1 font-headline text-base text-on-background md:text-lg">
                    {m.message}
                  </p>
                </div>
                {m.scope && <span className="text-data text-outline">{m.scope}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
