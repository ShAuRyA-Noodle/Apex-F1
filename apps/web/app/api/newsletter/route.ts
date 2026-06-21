import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Body {
  email?: string;
}

const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !RE.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }

  // Phase C: forward to Resend audience or write to Supabase.
  // For now: log the capture and accept. The client also queues into
  // localStorage so emails are not lost if this endpoint is unavailable.
  // eslint-disable-next-line no-console
  console.log(`[newsletter] capture: ${email}`);

  return NextResponse.json({ ok: true });
}

// Block other methods.
export function GET() {
  return NextResponse.json({ error: 'POST only' }, { status: 405 });
}
