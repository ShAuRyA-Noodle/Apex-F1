import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;

interface Body {
  title?: string;
  slug?: string;
  dek?: string;
  section?: string;
  bodyMd?: string;
  status?: 'draft' | 'published';
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL not set. Provision Supabase + set DATABASE_URL.' },
      { status: 503 },
    );
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const title = body.title?.trim();
  const slug = body.slug?.trim() ?? '';
  const bodyMd = body.bodyMd ?? '';
  if (!title || !bodyMd) {
    return NextResponse.json({ ok: false, error: 'title + body required' }, { status: 400 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid slug' }, { status: 400 });
  }

  // Phase C wires the Drizzle insert + revalidatePath. Until then persistence
  // is a no-op, so we must NOT report success — return 501 so the editor shows
  // "not saved" instead of a green check that lies. Validation + slug-check
  // above still run, so editors can pre-vet copy before the DB is live.
  // eslint-disable-next-line no-console
  console.log(`[articles] draft validated (not persisted): ${slug} (${title.length} chars title)`);

  return NextResponse.json(
    { ok: false, error: 'persistence not implemented yet (Phase C: Drizzle insert)' },
    { status: 501 },
  );
}

export function GET() {
  return NextResponse.json({ error: 'POST only' }, { status: 405 });
}
