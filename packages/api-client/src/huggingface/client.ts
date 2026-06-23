/**
 * Hugging Face Inference API · low-level client.
 *
 * Stub-mode contract:
 *   - No HUGGINGFACE_TOKEN in env → every call returns null. No throw.
 *     The whole module activates the moment the token lands.
 *   - 30s hard timeout via AbortController.
 *   - 503 (model warming up) → exponential backoff, max 3 attempts.
 *     The HF Inference API returns 503 with `estimated_time` while a cold
 *     model spins up on shared infra; we respect that hint when present.
 *   - Network / parse errors → null.
 *   - Non-2xx (other than 503) → null.
 *
 * Provisioning (drop into apps/web/.env.local, server-side only):
 *   HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
 *
 *   1. Create an account at https://huggingface.co
 *   2. Settings → Access Tokens → New token
 *      Role: "Read" is enough for Inference API (no model uploads needed).
 *   3. Copy the hf_… string into HUGGINGFACE_TOKEN.
 *   4. Verify:
 *        curl -H "Authorization: Bearer $HUGGINGFACE_TOKEN" \
 *          https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest \
 *          -d '{"inputs":"Lewis Hamilton wins another Grand Prix"}'
 *      Expect a JSON array of label/score objects (or 503 once → 200 twice
 *      while the model warms · our backoff handles that).
 *
 * Endpoint shape:
 *   POST https://api-inference.huggingface.co/models/<model>
 *   Headers: Authorization: Bearer <token>, Content-Type: application/json
 *   Body:    { inputs: <string | object>, parameters?: object, options?: object }
 *   Body for image models returns binary (image/png), not JSON · see text2image.
 */

const ENDPOINT_BASE = 'https://api-inference.huggingface.co/models';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES_503 = 3;
const BASE_BACKOFF_MS = 1_500;
const MAX_BACKOFF_MS = 15_000;

/** Internal: read HUGGINGFACE_TOKEN, returning null when absent or empty. */
function getToken(explicit?: string): string | null {
  if (explicit && explicit.length > 0) return explicit;
  const t = process.env['HUGGINGFACE_TOKEN'];
  if (!t || t.length === 0) return null;
  return t;
}

/** Build the canonical inference URL for a given model id. */
function buildUrl(model: string): string {
  return `${ENDPOINT_BASE}/${model}`;
}

/** Parse the model's hinted wait time from the 503 envelope, clamped. */
function parseEstimatedWaitMs(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const maybe = (payload as { estimated_time?: unknown }).estimated_time;
  if (typeof maybe !== 'number' || !Number.isFinite(maybe) || maybe <= 0) return null;
  // estimated_time is seconds. Clamp to [0.5s, 20s] so a misbehaving model
  // can't park us forever inside one retry slot.
  const ms = Math.round(maybe * 1000);
  return Math.min(Math.max(ms, 500), 20_000);
}

/** Exponential backoff with full jitter, capped. */
function backoffMs(attempt: number): number {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
  return Math.floor(Math.random() * exp);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Public input contract. `inputs` may be string or arbitrary JSON. */
export interface HfInferenceInput<TInputs = unknown, TParams = unknown> {
  /** HF model id, e.g. "facebook/bart-large-cnn". */
  model: string;
  /** Request payload (`inputs` field on the wire). */
  inputs: TInputs;
  /** Optional model-specific parameters. */
  parameters?: TParams;
  /** Optional HF `options` (e.g. wait_for_model, use_cache). */
  options?: {
    /**
     * When true, HF blocks the connection server-side until the model has
     * loaded · eliminating 503 retries at the cost of a longer single
     * request. We default to true for batch jobs, false for hot paths.
     */
    wait_for_model?: boolean;
    /** Disable response cache (HF caches identical inputs by default). */
    use_cache?: boolean;
  };
  /** Override timeout in ms. Default 30000. */
  timeoutMs?: number;
  /**
   * When 'json' (default) we parse and return the JSON body.
   * When 'binary' we return a Buffer · needed for image / audio models
   * that respond with raw bytes.
   */
  responseKind?: 'json' | 'binary';
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
  /** Override token resolution. */
  token?: string;
}

/** Output union · binary path returns Buffer, json path returns generic T. */
export type HfInferenceResult<T> = T | Buffer;

/**
 * Core call. Returns null whenever the token is absent, the request fails
 * after retries, or the model never warms up within the timeout window.
 * Callers MUST handle null · there is no synthetic fallback.
 */
export async function hfInference<T = unknown>(
  input: HfInferenceInput,
): Promise<HfInferenceResult<T> | null> {
  const token = getToken(input.token);
  // Stub-mode short-circuit. No token, no call. The whole module flips
  // back on the moment HUGGINGFACE_TOKEN appears in env.
  if (!token) return null;

  const url = buildUrl(input.model);
  const fetchImpl = input.fetchImpl ?? fetch;
  const responseKind = input.responseKind ?? 'json';
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const body = JSON.stringify({
    inputs: input.inputs,
    ...(input.parameters !== undefined ? { parameters: input.parameters } : {}),
    ...(input.options !== undefined ? { options: input.options } : {}),
  });

  for (let attempt = 0; attempt <= MAX_RETRIES_503; attempt++) {
    // Fresh AbortController per attempt so a stalled retry can't poison the next.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: responseKind === 'binary' ? 'image/png, application/octet-stream' : 'application/json',
        },
        body,
        signal: controller.signal,
      });

      // 503 → model is warming. Read the envelope hint, sleep, retry.
      if (res.status === 503 && attempt < MAX_RETRIES_503) {
        let hinted: number | null = null;
        try {
          const peek = (await res.json()) as unknown;
          hinted = parseEstimatedWaitMs(peek);
        } catch {
          hinted = null;
        }
        const wait = hinted ?? backoffMs(attempt);
        clearTimeout(timer);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        clearTimeout(timer);
        return null;
      }

      if (responseKind === 'binary') {
        const ab = await res.arrayBuffer();
        clearTimeout(timer);
        return Buffer.from(ab);
      }

      const json = (await res.json()) as T;
      clearTimeout(timer);
      return json;
    } catch {
      // AbortError, network error, JSON parse failure · all collapse to null
      // for this attempt. If retries remain we loop; otherwise null bubbles.
      clearTimeout(timer);
      if (attempt >= MAX_RETRIES_503) return null;
      await sleep(backoffMs(attempt));
      continue;
    }
  }

  return null;
}

/** Re-export internals primarily for sibling modules + tests. */
export const __INTERNAL__ = {
  ENDPOINT_BASE,
  DEFAULT_TIMEOUT_MS,
  MAX_RETRIES_503,
  buildUrl,
  parseEstimatedWaitMs,
  backoffMs,
};
