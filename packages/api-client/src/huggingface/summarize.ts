/**
 * Hugging Face summarization — Groq backup.
 *
 * Model: facebook/bart-large-cnn
 *   · BART encoder-decoder pretrained on CNN/DailyMail.
 *   · Strong on news-shaped prose. Average inference ~1.5s warm, ~12s
 *     cold start.
 *   · Returns abstractive summaries (rewords; does not extract
 *     verbatim). Good for hover-cards and /latest list deks.
 *
 * Use case:
 *   Primary summarizer is Groq Llama 3.3 70B (much higher quality,
 *   instruction-tunable). This module activates only when the Groq
 *   quota is hit or GROQ_API_KEY is missing — pure backup path.
 *
 * Stub-mode contract: null when token absent.
 */

import { hfInference } from './client';

const MODEL = 'facebook/bart-large-cnn';

/** BART's `max_length` is in TOKENS, not characters. ~1 token ≈ 4 chars. */
const DEFAULT_MAX_TOKENS = 130;
const DEFAULT_MIN_TOKENS = 40;

/** Hard ceiling on input — BART's encoder caps at 1024 tokens. */
const INPUT_CHAR_CEILING = 3800; // ~950 tokens, safe margin.

interface RawSummary {
  summary_text: string;
}

/**
 * Summarize a chunk of news prose into a short abstract.
 *
 * @param text       The article body. Headline + dek + first 1-2 paragraphs
 *                   is the sweet spot — BART degrades past ~1000 tokens.
 * @param maxLength  Soft target length, in CHARACTERS, of the output.
 *                   We translate to BART's token budget internally.
 *                   Pass undefined for default ~130-token (~500-char) length.
 *
 * Returns null on missing token, empty input, or malformed response.
 */
export async function summarize(
  text: string,
  maxLength?: number,
  opts: {
    fetchImpl?: typeof fetch;
    token?: string;
    /** Minimum length floor, in characters. Default ~160. */
    minLength?: number;
  } = {},
): Promise<string | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const input =
    trimmed.length > INPUT_CHAR_CEILING ? trimmed.slice(0, INPUT_CHAR_CEILING) : trimmed;

  // Translate user-facing CHAR targets to BART's TOKEN budget.
  const charsToTokens = (c: number): number => Math.max(20, Math.round(c / 4));
  const maxTokens = maxLength !== undefined ? charsToTokens(maxLength) : DEFAULT_MAX_TOKENS;
  const minTokens =
    opts.minLength !== undefined
      ? Math.min(charsToTokens(opts.minLength), maxTokens - 5)
      : Math.min(DEFAULT_MIN_TOKENS, maxTokens - 5);

  const raw = await hfInference<RawSummary[] | RawSummary>({
    model: MODEL,
    inputs: input,
    parameters: {
      max_length: maxTokens,
      min_length: minTokens,
      do_sample: false,
      // truncation:'longest_first' protects us from over-long inputs at
      // the HF side too — defense in depth alongside our char ceiling.
      truncation: 'longest_first',
    },
    options: { wait_for_model: true, use_cache: true },
    fetchImpl: opts.fetchImpl,
    token: opts.token,
  });

  if (!raw) return null;
  if (raw instanceof Buffer) return null;

  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row.summary_text !== 'string') return null;
  const out = row.summary_text.trim();
  return out.length > 0 ? out : null;
}
