import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getDb, article } from '@apex/db';

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
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not set.' }, { status: 503 });
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

  const dek = body.dek?.trim() || null;
  const wordCount = bodyMd.split(/\s+/).filter(Boolean).length;

  try {
    const db = getDb();
    const [row] = await db
      .insert(article)
      .values({
        slug,
        title,
        dek,
        bodyMd,
        section: body.section?.trim() || null,
        excerpt: (dek ?? bodyMd).slice(0, 200),
        readTimeMinutes: Math.max(1, Math.round(wordCount / 200)),
        publishedAt: body.status === 'published' ? new Date() : null,
      })
      .returning({ id: article.id, slug: article.slug });

    // New / updated editorial shows on the homepage + /latest.
    revalidatePath('/latest');
    revalidatePath('/');

    return NextResponse.json({ ok: true, id: row?.id, slug: row?.slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ ok: false, error: 'slug already exists' }, { status: 409 });
    }
    // eslint-disable-next-line no-console
    console.error('[articles] insert failed:', msg);
    return NextResponse.json({ ok: false, error: 'insert failed' }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: 'POST only' }, { status: 405 });
}
