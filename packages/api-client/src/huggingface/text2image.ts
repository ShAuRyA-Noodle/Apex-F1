/**
 * Hugging Face text-to-image — hero background fallback.
 *
 * Use case (priority chain in apps/web/lib/heroImage.ts):
 *   1. Wikidata image (canonical, free, copyright-clean)
 *   2. Unsplash search (curated, license-clean, requires UNSPLASH_ACCESS_KEY)
 *   3. Generated (this module) — only when both above are absent AND
 *      HUGGINGFACE_TOKEN is present.
 *
 * Model choice:
 *   Default → black-forest-labs/FLUX.1-schnell
 *     · 4-step distilled FLUX, ~3s warm, ~25s cold.
 *     · Far better quality / latency tradeoff than SDXL on the free tier.
 *   Override → stabilityai/stable-diffusion-xl-base-1.0 (kept selectable
 *     for cases where FLUX is rate-limited or the user wants the SDXL
 *     aesthetic).
 *
 * Output:
 *   { pngBuffer: Buffer, url?: string }
 *     · In dev (NODE_ENV !== 'production') we write the PNG to /tmp and
 *       return a `file://` url so the renderer can pick it up locally.
 *     · In prod (Phase C) the route handler at /api/ai/generate-image
 *       uploads pngBuffer to R2 and returns the public URL — this module
 *       stays storage-agnostic.
 *
 * Stub-mode contract: returns null when token absent. Same as every other
 * HF module — CORE RULE #1, no synthetic fallback.
 */

import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hfInference } from './client';

export type T2IModelId =
  | 'black-forest-labs/FLUX.1-schnell'
  | 'stabilityai/stable-diffusion-xl-base-1.0';

/** Aspect → (width, height) at SDXL/FLUX-friendly multiples of 64. */
export type T2IAspect = '16:9' | '21:9' | '4:3' | '1:1' | '9:16';

interface Dims { width: number; height: number; }

function aspectToDims(aspect: T2IAspect): Dims {
  switch (aspect) {
    case '21:9':  return { width: 1344, height: 576 };
    case '16:9':  return { width: 1216, height: 704 };
    case '4:3':   return { width: 1152, height: 896 };
    case '1:1':   return { width: 1024, height: 1024 };
    case '9:16':  return { width: 704,  height: 1216 };
  }
}

/** Optional style hint appended to the prompt to push consistency. */
export type T2IStyle =
  | 'cinematic-telemetry'
  | 'editorial-monochrome'
  | 'high-contrast-pitlane'
  | 'soft-paddock-portrait'
  | 'raw';

const STYLE_SUFFIX: Record<T2IStyle, string> = {
  'cinematic-telemetry':
    'cinematic, dramatic rim lighting, telemetry-red highlights (#E10600), deep blacks, 35mm grain, shot on Arri Alexa, ultra-detailed, professional motorsport photography',
  'editorial-monochrome':
    'editorial, monochrome, high contrast, large negative space, magazine spread aesthetic, photographed on medium-format film',
  'high-contrast-pitlane':
    'pit lane at night, hot wet asphalt, sodium glow, motion-blurred crew, neon timing wall, ultra detailed',
  'soft-paddock-portrait':
    'shallow depth of field, golden hour paddock light, Leica 50mm, subtle film grain',
  raw: '',
};

export interface GenerateImageInput {
  /** Natural-language description. Required, non-empty after trim. */
  prompt: string;
  /** Visual treatment hint. Default 'cinematic-telemetry'. */
  style?: T2IStyle;
  /** Aspect ratio. Default '16:9' for hero rails. */
  aspect?: T2IAspect;
  /** Override the default model. */
  model?: T2IModelId;
  /** Override timeout (cold start can be slow). Default 30s. */
  timeoutMs?: number;
  /**
   * Negative prompt to push the model away from common motorsport AI
   * artefacts (blurry tires, mangled cockpits, fake sponsor logos).
   * SDXL respects this; FLUX-schnell mostly ignores it but it's harmless.
   */
  negativePrompt?: string;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
  /** Override token resolution. */
  token?: string;
  /**
   * When true, also write the PNG to /tmp and return a `file://` url.
   * Defaults to true outside production so dev pages can render it
   * without an R2 round-trip. In production this is forced to false —
   * the API route handles upload.
   */
  writeToTmp?: boolean;
}

export interface GenerateImageResult {
  /** Raw PNG bytes. Always present on success. */
  pngBuffer: Buffer;
  /**
   * Convenience URL.
   *   · dev → file:///tmp/<uuid>.png (if writeToTmp)
   *   · prod → undefined; caller uploads + assigns.
   */
  url?: string;
  /** Echoes back so callers can log / cache by model. */
  model: T2IModelId;
  /** Echoes back so the renderer can reserve the right aspect. */
  width: number;
  height: number;
}

const DEFAULT_MODEL: T2IModelId = 'black-forest-labs/FLUX.1-schnell';
const DEFAULT_NEGATIVE =
  'low quality, blurry, watermark, text, fake sponsor logos, mangled wheels, distorted cockpit, oversaturated';

/**
 * Build the body params block. FLUX-schnell wants `num_inference_steps: 4`
 * (it's a 4-step distillation). SDXL wants 25-40. We branch on model.
 */
function buildParameters(
  model: T2IModelId,
  dims: Dims,
  negativePrompt: string,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    width: dims.width,
    height: dims.height,
    guidance_scale: 0, // FLUX-schnell — 0 is intentional; SDXL overrides below.
    negative_prompt: negativePrompt,
  };
  if (model === 'stabilityai/stable-diffusion-xl-base-1.0') {
    base['num_inference_steps'] = 30;
    base['guidance_scale'] = 7.5;
  } else {
    base['num_inference_steps'] = 4;
  }
  return base;
}

/**
 * Generate one image. Returns null on missing token, network failure,
 * empty prompt, or model-stays-cold-past-timeout.
 */
export async function generateImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult | null> {
  const prompt = input.prompt.trim();
  if (prompt.length === 0) return null;

  const model = input.model ?? DEFAULT_MODEL;
  const aspect = input.aspect ?? '16:9';
  const style = input.style ?? 'cinematic-telemetry';
  const dims = aspectToDims(aspect);
  const negativePrompt = input.negativePrompt ?? DEFAULT_NEGATIVE;

  const styledPrompt =
    style === 'raw' ? prompt : `${prompt}. ${STYLE_SUFFIX[style]}`;

  const buf = await hfInference<unknown>({
    model,
    inputs: styledPrompt,
    parameters: buildParameters(model, dims, negativePrompt),
    options: { wait_for_model: true, use_cache: false },
    responseKind: 'binary',
    timeoutMs: input.timeoutMs ?? 30_000,
    fetchImpl: input.fetchImpl,
    token: input.token,
  });

  if (!buf || !(buf instanceof Buffer)) return null;

  const result: GenerateImageResult = {
    pngBuffer: buf,
    model,
    width: dims.width,
    height: dims.height,
  };

  const writeToTmp =
    input.writeToTmp ?? process.env['NODE_ENV'] !== 'production';

  if (writeToTmp) {
    try {
      const filename = `apex-${randomUUID()}.png`;
      const path = join(tmpdir(), filename);
      await writeFile(path, buf);
      result.url = `file://${path}`;
    } catch {
      // Filesystem failure must not break image generation. Caller still
      // has pngBuffer and can upload directly.
    }
  }

  return result;
}
