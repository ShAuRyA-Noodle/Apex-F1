/**
 * Hugging Face Inference API — public surface.
 *
 * Stub-mode behaviour: every export below resolves to null while
 * HUGGINGFACE_TOKEN is absent. The module fully activates the moment
 * the token lands in env. No fabricated fallback. Ever.
 *
 * Token provisioning: see ./client.ts header for the curl verification
 * recipe and HF account walk-through.
 */

export { hfInference } from './client';
export type {
  HfInferenceInput,
  HfInferenceResult,
} from './client';

export { generateImage } from './text2image';
export type {
  GenerateImageInput,
  GenerateImageResult,
  T2IAspect,
  T2IStyle,
  T2IModelId,
} from './text2image';

export { scoreSentiment, scoreSentimentBatch } from './sentiment';
export type { SentimentResult, SentimentLabel } from './sentiment';

export { summarize } from './summarize';

export { translate, translateBatchToEnglish } from './translate';
export type { SupportedLang, TranslateInput } from './translate';
