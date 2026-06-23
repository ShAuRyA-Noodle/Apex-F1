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
      await sendWelcomeEmail(email, RESEND_API_KEY);
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

/**
 * Welcome email on signup. Dormant until RESEND_FROM_EMAIL is set on a verified
 * domain (mail.shauryapunj.com) · Resend will not deliver to arbitrary inboxes
 * from the resend.dev sandbox sender. Never throws; signup succeeds either way.
 */
async function sendWelcomeEmail(email: string, apiKey: string): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return;
  const fromName = process.env.RESEND_FROM_NAME ?? 'Apex';
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${fromName} <${from}>`,
        to: [email],
        subject: "You're on the Apex pit wall",
        html: WELCOME_HTML,
      }),
    });
  } catch {
    /* non-fatal */
  }
}

const WELCOME_HTML = `
<div style="background:#0f0f0f;color:#e9e9e9;font-family:Helvetica,Arial,sans-serif;padding:40px 24px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="color:#e10600;font-size:12px;letter-spacing:3px;font-weight:700;">APEX · RACE WEEK BRIEFING</div>
    <h1 style="font-size:30px;line-height:1.1;margin:18px 0 0;color:#fff;">You're on the pit wall.</h1>
    <p style="font-size:16px;line-height:1.6;color:#b8b8b8;margin-top:18px;">
      Welcome to Apex. One concise edition every race week: strategy preview, tyre intel,
      paddock corner, standings recap. No spam, no ads, ever.
    </p>
    <p style="font-size:16px;line-height:1.6;color:#b8b8b8;">
      First briefing lands the next race week. Until then, the live ticker, the archive,
      and the deep dives are all waiting at apex-f1-five.vercel.app.
    </p>
    <p style="font-size:13px;color:#777;margin-top:28px;">
      Built by one person who watches every session. Unsubscribe anytime.
    </p>
  </div>
</div>`;

// Block other methods.
export function GET() {
  return NextResponse.json({ error: 'POST only' }, { status: 405 });
}
