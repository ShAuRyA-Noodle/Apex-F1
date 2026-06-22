import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Body {
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Newsletter signup endpoint.
 *
 * Real path · POSTs the email into a Resend Audience so the operator can
 * blast the Race Week Briefing from the Resend dashboard or via a future
 * Vercel cron job that pulls from the audience.
 *
 * Required env (Vercel project → Settings → Environment Variables):
 *   RESEND_API_KEY        Resend API key (https://resend.com/api-keys)
 *   RESEND_AUDIENCE_ID    Audience UUID (https://resend.com/audiences)
 *
 * Until BOTH are set the endpoint logs the capture and returns 202 so the
 * client UX is never broken in dev. In production with the keys present the
 * route returns 200 with the Resend contact id.
 *
 * Free-tier reminder: Resend gives 3000 emails/month + 100 contacts on the
 * free plan, plenty of headroom for early Apex.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    // No provider configured · accept the email but flag the operator.
    // Returning 202 (Accepted) is the right semantics: the request is valid
    // and queued, just not yet forwarded to durable storage.
    // eslint-disable-next-line no-console
    console.warn(
      `[newsletter] capture queued locally: ${email} · set RESEND_API_KEY + RESEND_AUDIENCE_ID to forward`
    );
    return NextResponse.json(
      { ok: true, mode: 'local-queue', note: 'configure Resend env to persist' },
      { status: 202 }
    );
  }

  try {
    const r = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      }
    );

    if (r.ok) {
      const j = (await r.json()) as { id?: string };
      return NextResponse.json({ ok: true, mode: 'resend', id: j.id ?? null });
    }

    // 409 = already-subscribed · treat as success so the form thanks the
    // user instead of throwing an "already exists" error.
    if (r.status === 409) {
      return NextResponse.json({ ok: true, mode: 'resend', duplicate: true });
    }

    const text = await r.text();
    // eslint-disable-next-line no-console
    console.error(`[newsletter] resend error ${r.status}: ${text}`);
    return NextResponse.json(
      { error: 'newsletter provider error', status: r.status },
      { status: 502 }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[newsletter] resend transport error', err);
    return NextResponse.json(
      { error: 'newsletter provider unreachable' },
      { status: 503 }
    );
  }
}

// Block other methods.
export function GET() {
  return NextResponse.json({ error: 'POST only' }, { status: 405 });
}
