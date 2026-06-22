import { NextResponse } from 'next/server';
import { generateImage, type T2IAspect, type T2IStyle } from '@apex/api-client/huggingface';

/**
 * POST /api/ai/generate-image
 *
 * Wraps the Hugging Face text-to-image client behind an authenticated
 * server endpoint so HUGGINGFACE_TOKEN never leaks to the browser.
 *
 * Body:
 *   {
 *     prompt: string,                                          // required
 *     aspect?: '16:9' | '21:9' | '4:3' | '1:1' | '9:16',       // default 16:9
 *     style?:  'cinematic-telemetry' | 'editorial-monochrome'
 *            | 'high-contrast-pitlane' | 'soft-paddock-portrait' | 'raw'
 *   }
 *
 * Responses:
 *   - 503 — HUGGINGFACE_TOKEN absent. Stub-mode. UI should treat as "no
 *           image" and render its flat-color placeholder.
 *   - 400 — Invalid JSON / empty prompt.
 *   - 502 — HF returned null after retries / timeout.
 *   - 200 — { ok: true, url, source, width, height, model }
 *
 * Storage path:
 *   - DEV (NODE_ENV !== 'production') → returns a `data:` URL with the
 *     PNG inlined (base64). Fine for local hero rendering.
 *   - PROD (Phase C) → uploads to R2 (binding R2_BUCKET_PUBLIC), returns
 *     the public URL. The upload block is gated on the binding being
 *     present so it stays a no-op until Phase C wires it.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  prompt?: string;
  aspect?: T2IAspect;
  style?: T2IStyle;
}

const ALLOWED_ASPECTS: ReadonlySet<T2IAspect> = new Set<T2IAspect>([
  '16:9', '21:9', '4:3', '1:1', '9:16',
]);
const ALLOWED_STYLES: ReadonlySet<T2IStyle> = new Set<T2IStyle>([
  'cinematic-telemetry',
  'editorial-monochrome',
  'high-contrast-pitlane',
  'soft-paddock-portrait',
  'raw',
]);

/**
 * R2 upload stub. Returns null until R2_BUCKET_PUBLIC binding is wired
 * (Phase C). The route falls back to the data-URL path when this returns
 * null, so we stay functional in every environment.
 */
async function maybeUploadToR2(_pngBuffer: Buffer): Promise<string | null> {
  // Phase C: wire the R2 binding here. Until then we no-op so dev + prod
  // both fall through to the data-URL response shape.
  // Example wiring (left commented for clarity):
  //   const bucket = (globalThis as any).R2_BUCKET_PUBLIC as R2Bucket | undefined;
  //   if (!bucket) return null;
  //   const key = `hero/${randomUUID()}.png`;
  //   await bucket.put(key, pngBuffer, { httpMetadata: { contentType: 'image/png' } });
  //   return `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
  return null;
}

export async function POST(req: Request) {
  // Token gate. Stub-mode 503 — UI knows to render its placeholder.
  if (!process.env['HUGGINGFACE_TOKEN']) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'HUGGINGFACE_TOKEN not set. Provision at https://huggingface.co/settings/tokens (Role: Read).',
      },
      { status: 503 },
    );
  }

  // Body parsing.
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: 'prompt is required and must be a non-empty string' },
      { status: 400 },
    );
  }
  if (prompt.length > 2000) {
    return NextResponse.json(
      { ok: false, error: 'prompt too long (max 2000 chars)' },
      { status: 400 },
    );
  }

  const aspect: T2IAspect = body.aspect && ALLOWED_ASPECTS.has(body.aspect)
    ? body.aspect
    : '16:9';
  const style: T2IStyle = body.style && ALLOWED_STYLES.has(body.style)
    ? body.style
    : 'cinematic-telemetry';

  const result = await generateImage({
    prompt,
    aspect,
    style,
    writeToTmp: false,
  });

  if (!result) {
    return NextResponse.json(
      { ok: false, error: 'generation failed (model cold / timeout / network)' },
      { status: 502 },
    );
  }

  // Prefer R2 if wired (Phase C). Fall back to data: URL.
  const uploadedUrl = await maybeUploadToR2(result.pngBuffer);
  const url =
    uploadedUrl ??
    `data:image/png;base64,${result.pngBuffer.toString('base64')}`;

  return NextResponse.json({
    ok: true,
    url,
    source: uploadedUrl ? 'r2' : 'inline',
    width: result.width,
    height: result.height,
    model: result.model,
  });
}

export function GET() {
  return NextResponse.json({ error: 'POST only' }, { status: 405 });
}
