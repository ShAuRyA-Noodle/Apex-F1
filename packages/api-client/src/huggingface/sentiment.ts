/**
 * Hugging Face sentiment scorer — news article tone.
 *
 * Model: cardiffnlp/twitter-roberta-base-sentiment-latest
 *   · 3-way classifier: positive / neutral / negative
 *   · Trained on 124M tweets, then fine-tuned on the 2022 TweetEval
 *     sentiment slice. Robust to short, headline-style text.
 *   · Token-light enough that the free Inference tier handles burst loads
 *     for the news rail without backing off.
 *
 * Use case:
 *   NewsData.io ships a sentiment field on its enterprise tier only. On
 *   the free tier we score in-house. Triggered when NewsData quota is
 *   exhausted or when an item comes from a source without sentiment
 *   (RSS, Guardian, NewsAPI, GNews, Reddit).
 *
 * Stub-mode contract: returns null when token absent.
 */

import { hfInference } from './client';

const MODEL = 'cardiffnlp/twitter-roberta-base-sentiment-latest';

/** HF returns labels lowercased; we keep them so. */
export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
  label: SentimentLabel;
  /** Confidence of the winning label, in [0, 1]. */
  score: number;
}

/**
 * Wire shape: the model returns either
 *   [[{label, score}, {label, score}, {label, score}]]   (default)
 * or
 *   [{label, score}, ...]                                 (single-item mode)
 * We accept both — HF has flip-flopped on this in the past.
 */
type RawRow = { label: string; score: number };
type RawResponse = RawRow[] | RawRow[][];

function normalizeLabel(raw: string): SentimentLabel | null {
  const v = raw.trim().toLowerCase();
  if (v === 'positive' || v === 'label_2') return 'positive';
  if (v === 'neutral'  || v === 'label_1') return 'neutral';
  if (v === 'negative' || v === 'label_0') return 'negative';
  return null;
}

function pickWinner(rows: RawRow[]): SentimentResult | null {
  let best: SentimentResult | null = null;
  for (const r of rows) {
    const label = normalizeLabel(r.label);
    if (!label) continue;
    if (typeof r.score !== 'number' || !Number.isFinite(r.score)) continue;
    if (!best || r.score > best.score) best = { label, score: r.score };
  }
  return best;
}

/**
 * Score the sentiment of a single piece of text — headline + dek works
 * well; pass the article body if you want a holistic read (the model
 * truncates to 512 tokens server-side).
 *
 * Returns null on missing token, network failure, empty text, or
 * malformed model output.
 */
export async function scoreSentiment(
  text: string,
  opts: {
    fetchImpl?: typeof fetch;
    token?: string;
    /**
     * When true we let HF block until the model warms — eliminates 503
     * retries. Default true because sentiment is usually called in a
     * batch from a worker, not on a hot render path.
     */
    waitForModel?: boolean;
  } = {},
): Promise<SentimentResult | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  // The model has a 512-token cap; we shave to ~2000 chars to stay under
  // it without paying for tokenization on the client.
  const truncated = trimmed.length > 2000 ? trimmed.slice(0, 2000) : trimmed;

  const raw = await hfInference<RawResponse>({
    model: MODEL,
    inputs: truncated,
    options: {
      wait_for_model: opts.waitForModel ?? true,
      use_cache: true,
    },
    fetchImpl: opts.fetchImpl,
    token: opts.token,
  });

  if (!raw) return null;
  if (raw instanceof Buffer) return null;

  // Flatten the two possible shapes.
  const rows: RawRow[] = Array.isArray(raw[0]) ? (raw[0] as RawRow[]) : (raw as RawRow[]);
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return pickWinner(rows);
}

/**
 * Convenience: score an array of texts in parallel, preserving order.
 * Each slot is independent — if one item fails (e.g. transient 503 past
 * retries), its slot in the output array is null. The other slots survive.
 *
 * Caller should respect HF's gentle rate hints: at the free tier, batches
 * over ~25 items at a time will start to see 429s.
 */
export async function scoreSentimentBatch(
  texts: readonly string[],
  opts: { fetchImpl?: typeof fetch; token?: string } = {},
): Promise<Array<SentimentResult | null>> {
  return Promise.all(texts.map((t) => scoreSentiment(t, opts)));
}
