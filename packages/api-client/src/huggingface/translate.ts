/**
 * Hugging Face translation — multilingual /latest feed.
 *
 * Model: facebook/nllb-200-distilled-600M
 *   · No Language Left Behind, 200-language distilled checkpoint.
 *   · Sweet spot for the F1 news feed: Italian (Gazzetta, Autosprint),
 *     German (Auto Motor und Sport, F1-Insider.com), Spanish (Marca,
 *     SoyMotor), French (L'Equipe), Dutch (De Telegraaf) all map cleanly.
 *   · ~600M params — fits comfortably on HF's free Inference tier.
 *
 * Use case:
 *   When Italian / German / Spanish / French / Dutch items land in the
 *   unified news rail, translate dek + headline to English at fetch
 *   time, cache the result for 7 days (handled by the caller via the
 *   shared revalidate window). Items are tagged with source language so
 *   the UI can show a "Translated from Italian" badge.
 *
 * Stub-mode contract: null when token absent.
 */

import { hfInference } from './client';

const MODEL = 'facebook/nllb-200-distilled-600M';

/**
 * NLLB uses Flores-200 language codes (e.g. `ita_Latn`, `deu_Latn`).
 * We expose a friendly ISO-639-1 surface and translate internally.
 */
export type SupportedLang =
  | 'en' | 'it' | 'de' | 'es' | 'fr' | 'nl' | 'pt' | 'ja' | 'ar' | 'zh';

const ISO_TO_NLLB: Record<SupportedLang, string> = {
  en: 'eng_Latn',
  it: 'ita_Latn',
  de: 'deu_Latn',
  es: 'spa_Latn',
  fr: 'fra_Latn',
  nl: 'nld_Latn',
  pt: 'por_Latn',
  ja: 'jpn_Jpan',
  ar: 'arb_Arab',
  zh: 'zho_Hans',
};

export interface TranslateInput {
  /** Text to translate. Trim happens internally. */
  text: string;
  /** ISO-639-1 source language. */
  sourceLang: SupportedLang;
  /** ISO-639-1 target language. */
  targetLang: SupportedLang;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
  /** Override token resolution. */
  token?: string;
}

/** NLLB returns `[{ translation_text: string }]` for the simple form. */
interface RawTranslation { translation_text: string; }

/**
 * Translate text source → target.
 *
 * Behaviour:
 *   · Empty / whitespace input → null.
 *   · Source equals target → return the trimmed input verbatim, no API
 *     call. Saves one round-trip per English-source rail item.
 *   · Token missing / network fail / malformed response → null.
 *
 * Length policy:
 *   NLLB's encoder caps at 1024 tokens (~4000 chars). Headlines + deks
 *   are always under that. We hard-truncate at 3800 chars defensively
 *   so a malformed RSS body can't crash the rail.
 */
export async function translate(
  input: TranslateInput,
): Promise<string | null> {
  const text = input.text.trim();
  if (text.length === 0) return null;

  if (input.sourceLang === input.targetLang) return text;

  const src = ISO_TO_NLLB[input.sourceLang];
  const tgt = ISO_TO_NLLB[input.targetLang];
  if (!src || !tgt) return null;

  const truncated = text.length > 3800 ? text.slice(0, 3800) : text;

  const raw = await hfInference<RawTranslation[] | RawTranslation>({
    model: MODEL,
    inputs: truncated,
    parameters: {
      src_lang: src,
      tgt_lang: tgt,
    },
    options: { wait_for_model: true, use_cache: true },
    fetchImpl: input.fetchImpl,
    token: input.token,
  });

  if (!raw) return null;
  if (raw instanceof Buffer) return null;

  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row.translation_text !== 'string') return null;
  const out = row.translation_text.trim();
  return out.length > 0 ? out : null;
}

/**
 * Convenience for the news rail: translate an array of strings to
 * English, preserving order, swallowing individual failures as null.
 * Common shape — title + dek pairs are translated this way.
 */
export async function translateBatchToEnglish(
  items: ReadonlyArray<{ text: string; sourceLang: SupportedLang }>,
  opts: { fetchImpl?: typeof fetch; token?: string } = {},
): Promise<Array<string | null>> {
  return Promise.all(
    items.map((i) =>
      translate({
        text: i.text,
        sourceLang: i.sourceLang,
        targetLang: 'en',
        fetchImpl: opts.fetchImpl,
        token: opts.token,
      }),
    ),
  );
}
