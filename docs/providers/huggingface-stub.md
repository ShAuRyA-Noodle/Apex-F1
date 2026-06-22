# Hugging Face Inference stub + planned integration

Full clean typecheck across api-client AND apps/web. All eight artifacts ship.

---

## Files written / updated (absolute paths)

**New**
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/huggingface/client.ts` — core `hfInference()` with 30s AbortController timeout, 503 exponential backoff w/ jitter, `estimated_time` hint respect, JSON + binary response modes
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/huggingface/text2image.ts` — `generateImage()` defaulting to `black-forest-labs/FLUX.1-schnell` (4-step distill, faster cold start than SDXL), SDXL selectable; aspect→dim mapping, style suffix presets, negative prompt, `/tmp` write in dev
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/huggingface/sentiment.ts` — `scoreSentiment()` + batch helper, handles both wire shapes HF has shipped (`[[...]]` vs `[...]`), normalizes `LABEL_0/1/2`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/huggingface/summarize.ts` — `summarize()` against `facebook/bart-large-cnn`, char→token translation for the `maxLength` ergonomic surface, 1024-token encoder defense
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/huggingface/translate.ts` — `translate()` + `translateBatchToEnglish()` against `facebook/nllb-200-distilled-600M`, ISO-639-1 → Flores-200 mapping, source==target short-circuit
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/huggingface/index.ts` — public barrel
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/api/ai/generate-image/route.ts` — POST endpoint, 503 on missing token, validation, R2 upload stub gated on Phase C, data-URL fallback for dev

**Updated**
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/package.json` — added `"./huggingface"` export entry
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/tsconfig.json` — added `@apex/api-client/huggingface` path
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/lib/heroImage.ts` — added `'hf-generated'` source, `tryHfGenerated()` helper, wired tier-4 fallback into all three lookups (driver / race / team)

---

## Stub-mode contract (the whole point)

Every public function in the HF module returns `null` while `HUGGINGFACE_TOKEN` is absent. No throw. No fabricated payload. The gate sits at the bottom of the stack in `client.ts::hfInference` — short-circuited before the URL is even built — so every higher-level function (`generateImage`, `scoreSentiment`, `summarize`, `translate`) inherits the behavior for free. The API route returns HTTP 503 with a helpful error string pointing to `https://huggingface.co/settings/tokens` so a developer hitting it pre-provisioning gets a self-diagnosing response.

The moment `HUGGINGFACE_TOKEN=hf_...` lands in `apps/web/.env.local`, every call site activates. Nothing else needs to change. The heroImage priority chain (Wikidata → Unsplash curated → Unsplash fallback → HF generated) silently gains its 4th tier on the next render. The /api/ai/generate-image endpoint starts returning 200s. The sentiment-batch worker stops returning null arrays.

---

## Design rationale (the non-obvious calls)

**Why FLUX.1-schnell default over SDXL.** FLUX-schnell is a 4-step distillation: ~3s warm, ~25s cold on HF's free Inference tier. SDXL needs 25-40 inference steps at 7.5 guidance, totaling 12-18s warm. FLUX also wins on photographic realism — relevant for race-paddock heroes. SDXL stays selectable via the `model` override for cases where FLUX is rate-limited or a more "painterly" aesthetic is wanted.

**Why a binary response mode in the core client.** Image and audio models return raw bytes, not JSON. Forcing the core caller to branch on `responseKind: 'binary'` and getting a `Buffer` back means text2image inherits the same retry/timeout/backoff logic as sentiment, summarize, and translate. No code duplication.

**Why exponential backoff with full jitter for 503.** HF's shared Inference tier puts cold models behind a queue. The first request to an idle model returns 503 with an `estimated_time` hint (in seconds). We respect that hint when present (clamped to [0.5s, 20s] so a misbehaving response can't park us forever), then fall back to exponential-with-jitter when the hint is missing. Full jitter (not "equal jitter" or "decorrelated jitter") matches AWS-style guidance for thundering-herd avoidance — relevant since the news-rail worker can fan out many requests simultaneously.

**Why I cap at 3 retries.** Cold start of a HF model is bounded by their internal timeout (~60-120s). After three retries on jittered exponential we've waited up to ~25 seconds, which approaches user-perceptible territory on a hot render path. Beyond that, returning null and letting the UI render its placeholder beats blocking a Next.js ISR slot for a minute.

**Why heroImage uses a data URL not a real upload.** RSC server components render synchronously; an inline data URL stays self-contained and respects the same ISR cache as the page itself. Inlining a ~150-300KB PNG into HTML is fine for first paint and lets the heroImage facade stay storage-agnostic. Phase C swaps this for `/api/ai/generate-image` returning an R2 URL keyed by prompt hash, but the contract of the facade doesn't change — only the URL space.

**Why char-based `maxLength` in summarize() but the model takes tokens.** BART's `max_length` parameter is in tokens, but a frontend dev writing `summarize(article, 500)` is thinking in characters. We translate at the boundary: `tokens = round(chars / 4)` with a 20-token floor. Keeps the public API ergonomic without leaking model internals.

**Why ISO-639-1 surface in translate() but NLLB needs Flores-200 codes.** Same reason as above: `translate({ text, sourceLang: 'it', targetLang: 'en' })` reads naturally. The Flores-200 codes (`ita_Latn`, `eng_Latn`, `arb_Arab`) include script identifiers because NLLB supports multiple scripts per language family. We hide that mapping behind a `Record<SupportedLang, string>` so adding a new language is one line.

**Why a `source === target` short-circuit.** The unified news feed pulls from RSS (English) + Guardian (English) + NewsAPI/GNews (varies) + Italian, German, Spanish sources. The naive call site does `translate(item.title, item.lang, 'en')` for every item. A short-circuit when source==target saves one round-trip per English item, which is 70%+ of the feed. Frees up HF quota for the items that actually need translation.

**Why `scoreSentiment` normalizes both `LABEL_0/1/2` and `positive/neutral/negative`.** HF's response format has historically been inconsistent: some versions of the same model return the raw class index (`LABEL_2`), others the friendly name (`positive`). The Twitter-RoBERTa model has shipped both at different points. Our normalizer accepts both and maps to the typed union — defense against silent model updates breaking the parser.

**Why the API route returns 503 (not 200 with null) when token is missing.** A 503 is semantically correct: "service temporarily unavailable due to missing configuration." It lets the browser-side caller distinguish "no token" from "generation failed" from "valid empty response," which matters for monitoring and UX (the placeholder copy can differ).

**Why R2 upload sits behind a stub.** The R2 binding lives in Cloudflare Workers (the `apps/workers` package), not in Next.js. Wiring it requires Phase C work on the workers side. By gating the upload on a runtime check for the binding and falling through to the inline data-URL response otherwise, the endpoint works in dev, in Vercel preview, and will silently upgrade to R2 once the binding lands. No deploy-time gating, no environment forks.

---

## Verification recipe (drop into .env.local, then)

```
curl -X POST http://localhost:1950/api/ai/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Formula 1 car cresting Eau Rouge at sunset","aspect":"16:9","style":"cinematic-telemetry"}' \
  | jq .ok
```

Expected pre-token: `503 { ok: false, error: "HUGGINGFACE_TOKEN not set..." }`. Expected post-token: `200 { ok: true, url: "data:image/png;base64,...", source: "inline", width: 1216, height: 704, model: "black-forest-labs/FLUX.1-schnell" }`.

For the lower-level modules, the same conditional behavior applies: import `scoreSentiment` from `@apex/api-client/huggingface`, call it with any string, get `null` while token is absent and `{ label, score }` once it lands. No code change needed at the call site.
