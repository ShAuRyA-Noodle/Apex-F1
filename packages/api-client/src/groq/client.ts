const BASE = 'https://api.groq.com/openai/v1/chat/completions';

/** Llama 3.3 70B · best prose quality on Groq's free tier. */
export const GROQ_MODEL_QUALITY = 'llama-3.3-70b-versatile';
/** Llama 3.1 8B · fastest, for high-volume / low-stakes paths. */
export const GROQ_MODEL_FAST = 'llama-3.1-8b-instant';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatOpts {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * Next.js ISR revalidate seconds. NOTE: Next does not data-cache POST, so for
   * real token reuse callers should ALSO wrap the call in `unstable_cache` keyed
   * by the input. Kept here for completeness / future GET-proxy support.
   */
  revalidate?: number;
  fetchImpl?: typeof fetch;
}

const MAX_RETRIES = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One Groq chat completion (OpenAI-compatible endpoint). Returns the assistant
 * text, or `null` on a missing key / rate-limit / any error · never throws,
 * never fabricates (CORE RULE #1). Retries 429/5xx with backoff.
 */
export async function groqChat(
  messages: GroqMessage[],
  opts: GroqChatOpts = {},
): Promise<string | null> {
  const apiKey = process.env['GROQ_API_KEY'];
  if (!apiKey) return null;

  const fetchImpl = opts.fetchImpl ?? fetch;
  const body = JSON.stringify({
    model: opts.model ?? GROQ_MODEL_QUALITY,
    messages,
    temperature: opts.temperature ?? 0.6,
    max_tokens: opts.maxTokens ?? 320,
    stream: false,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchImpl(BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
        next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
      } as RequestInit);

      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_RETRIES) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        return null;
      }
      if (!res.ok) return null;

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      return text && text.length > 0 ? text : null;
    } catch {
      if (attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return null;
    }
  }
  return null;
}
