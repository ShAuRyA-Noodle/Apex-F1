import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { upsertPrediction } from '@apex/db';
import { PREDICT_QUESTIONS } from '@/lib/predict';

export const runtime = 'nodejs';

const VALID_IDS = new Set(PREDICT_QUESTIONS.map((q) => q.id));

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: 'db unset' }, { status: 503 });
  }

  let body: {
    season?: number;
    round?: number;
    raceSlug?: string;
    picks?: Record<string, string>;
    handle?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const { season, round, raceSlug, picks, handle } = body;
  if (
    !Number.isInteger(season) ||
    !Number.isInteger(round) ||
    typeof raceSlug !== 'string' ||
    !picks ||
    typeof picks !== 'object'
  ) {
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }

  // Keep only the known question keys with string values (no junk in the DB).
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(picks)) {
    if (VALID_IDS.has(k as never) && typeof v === 'string' && v) clean[k] = v.slice(0, 64);
  }
  if (Object.keys(clean).length === 0) {
    return NextResponse.json({ ok: false, error: 'no picks' }, { status: 400 });
  }

  const jar = await cookies();
  const pid = jar.get('apex_pid')?.value ?? randomUUID();

  const ok = await upsertPrediction({
    clientId: pid,
    handle: typeof handle === 'string' && handle.trim() ? handle.trim().slice(0, 24) : null,
    season: season as number,
    round: round as number,
    raceSlug,
    picks: clean,
  });

  const res = NextResponse.json({ ok });
  res.cookies.set('apex_pid', pid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return res;
}
