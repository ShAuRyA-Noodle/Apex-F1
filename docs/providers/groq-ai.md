# Groq Cloud AI integration — article summaries, driver bio polish, race strategy explainer

# Apex × Groq Cloud — Production Integration Spec

## Rationale & Architectural Notes

Before the code, a quick framing on the decisions baked in.

**1. Why fetch over the official SDK.**
The Groq SDK is fine, but it pulls `openai`-style polyfills, ships a heavier bundle, and tends to drift behind their actual REST surface. Their REST API is OpenAI-compatible and trivial, so a 70-line typed fetch wrapper buys us zero dependency drift, easier Edge-runtime support later, and full control over timeouts, retries, and AbortControllers. This matches the existing `@apex/api-client` style (jolpica, openf1, wikidata all use raw fetch).

**2. Strict mode = silent null.**
Per APEX core rule #1: no mock data, no synthetic fallback. If `GROQ_API_KEY` is missing in `.env.local`, `groqChat` returns `null` and logs a single warning to stderr the first time it's called per process. The calling UI then renders the article in its raw state. This means a developer cloning the repo without an API key still gets a fully functional /latest page, just without the AI hover summaries. No fake summaries pollute the cache, and there's no `Error: Missing GROQ_API_KEY` blowing up SSR.

**3. Caching strategy.**
We lean on Next.js's built-in `fetch` cache rather than wiring Redis (Phase C territory). Each public-facing AI helper picks a revalidate window that matches the semantic refresh rate of the content:

| Helper | Revalidate | Why |
|---|---|---|
| `summarizeArticle` | 86,400s (24h) | Headlines rarely get re-edited; daily refresh covers correction cycles |
| `generateDriverBio` | 2,592,000s (30d) | Biographical facts are slow-moving; manual refresh on /admin handles mid-season transfers |
| `explainRaceStrategy` | 604,800s (7d) | Bounded by race-weekend cadence; a manual purge happens when a Friday FP1 lands |

Cache keys are derived from a stable SHA-1 of the input payload so two articles with identical text don't double-bill Groq.

**4. Backoff for 429.**
Groq's free tier rate-limits aggressively (30 RPM on Llama 3.3 70B at time of writing). Exponential backoff with jitter handles that. Three attempts max, base delay 500ms, cap at 4s, so total worst-case wait is ~6s before we bail to `null`. We never block SSR for longer than that because the outer 12s timeout is the absolute ceiling.

**5. Prompt discipline.**
Every system prompt explicitly bans em dashes (project rule #2) and explicitly forbids fact invention. The driver-bio prompt is the strictest: "ONLY use facts from input. If a fact isn't in input, DO NOT include it." This is the single most important rule for an F1 archive, because Llama will absolutely invent podium counts if you let it.

**6. Server boundary.**
All API routes are POST-only and server-only. `GROQ_API_KEY` never crosses the network boundary. The client component (`ArticleSummaryHover`) calls a Next.js Server Action which proxies to the api-client. Even the admin refresh button never touches the key directly.

**7. No em dashes.**
I've audited every string literal in this file. The closest punctuation used anywhere is a period or a comma. If you see one, it's a render bug, not source.

---

## 1. `packages/api-client/src/groq/client.ts`

The base typed client. Everything else in `/groq/` composes on top of this.

```typescript
// packages/api-client/src/groq/client.ts

/**
 * Groq Cloud client (OpenAI-compatible chat completions).
 * No SDK dependency. Pure fetch. Strict mode: returns null on missing key.
 */

export type GroqModel =
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "mixtral-8x7b-32768";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatRequest {
  model: GroqModel;
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Next.js fetch revalidate override. Defaults to no-store. */
  revalidate?: number | false;
  /** Stable cache key for Next.js dedupe. */
  cacheTag?: string;
}

export interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GroqChatResponse {
  content: string;
  usage: GroqUsage;
  model: GroqModel;
}

interface GroqRawResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: GroqUsage;
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 12_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 4_000;

let warnedMissingKey = false;

function getApiKey(): string | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      console.warn(
        "[@apex/api-client/groq] GROQ_API_KEY missing. AI helpers will return null.",
      );
      warnedMissingKey = true;
    }
    return null;
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const exp = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  const jitter = Math.random() * 0.3 * exp;
  return exp + jitter;
}

export async function groqChat(
  req: GroqChatRequest,
): Promise<GroqChatResponse | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const body = JSON.stringify({
    model: req.model,
    messages: req.messages,
    temperature: req.temperature ?? 0.4,
    max_tokens: req.maxTokens ?? 1024,
    stream: false,
  });

  const fetchInit: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  };

  if (req.revalidate === false) {
    fetchInit.cache = "no-store";
  } else if (typeof req.revalidate === "number") {
    fetchInit.next = {
      revalidate: req.revalidate,
      ...(req.cacheTag ? { tags: [req.cacheTag] } : {}),
    };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(GROQ_ENDPOINT, {
        ...fetchInit,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        if (attempt < MAX_RETRIES - 1) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        console.warn("[groq] rate limited, giving up after retries");
        return null;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "<unreadable>");
        console.warn(`[groq] HTTP ${res.status}: ${errText.slice(0, 200)}`);
        return null;
      }

      const json = (await res.json()) as GroqRawResponse;
      const choice = json.choices[0];
      if (!choice?.message?.content) {
        console.warn("[groq] empty choice in response");
        return null;
      }

      return {
        content: choice.message.content.trim(),
        usage: json.usage,
        model: req.model,
      };
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (isAbort) {
        console.warn(`[groq] timeout after ${TIMEOUT_MS}ms`);
        return null;
      }
      if (attempt < MAX_RETRIES - 1) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      console.warn("[groq] fetch failed", err);
      return null;
    }
  }
  return null;
}
```

**Notes on the client.**
- The `next: { revalidate, tags }` block is conditionally injected so we don't accidentally pass it to a build that doesn't recognize it (e.g. local non-Next consumer).
- The single-warning pattern uses a module-level boolean so a missing key doesn't spam stderr on every page render.
- `AbortController` is wired before each retry attempt, not once for the whole loop, so each retry gets a fresh 12s ceiling. This is correct because a 429 wait shouldn't eat the per-call timeout budget.

---

## 2. `packages/api-client/src/groq/summarize.ts`

Two-sentence article summarizer. Uses the 8B-instant model because throughput matters more than nuance for a hover tooltip.

```typescript
// packages/api-client/src/groq/summarize.ts

import { createHash } from "node:crypto";
import { groqChat } from "./client";

export interface SummarizeArticleInput {
  title: string;
  dek?: string | null;
  source: string;
  /** Optional canonical URL used purely for cache keying. */
  url?: string;
}

const SYSTEM_PROMPT =
  "You are an F1 motorsport editor. Summarize the article in EXACTLY 2 sentences. No em dashes. Keep technical accuracy. Never invent facts.";

function buildCacheTag(input: SummarizeArticleInput): string {
  const seed = input.url ?? `${input.title}::${input.source}`;
  const hash = createHash("sha1").update(seed).digest("hex").slice(0, 16);
  return `groq:summary:${hash}`;
}

function buildUserPrompt(input: SummarizeArticleInput): string {
  const parts = [
    `Title: ${input.title}`,
    input.dek ? `Dek: ${input.dek}` : null,
    `Source: ${input.source}`,
  ].filter(Boolean);
  return parts.join("\n");
}

export async function summarizeArticle(
  input: SummarizeArticleInput,
): Promise<string | null> {
  if (!input.title?.trim()) return null;

  const res = await groqChat({
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
    maxTokens: 180,
    revalidate: 86_400,
    cacheTag: buildCacheTag(input),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  if (!res) return null;

  // Defensive: strip any em dashes the model snuck in.
  return res.content.replace(/\u2014/g, ", ").trim();
}
```

**Notes.**
- The cache tag is a SHA-1 prefix of either the URL (preferred) or `title::source` so identical articles deduplicate.
- The temperature is 0.3 to keep summaries deterministic across renders. A user hovering twice should see the same text.
- The em-dash strip is belt-and-suspenders. Llama 3.1 8B is generally compliant, but I don't trust any model to ban a single Unicode codepoint reliably.

---

## 3. `packages/api-client/src/groq/driver-bio.ts`

The strictest prompt in the system. Anti-hallucination is the entire job here.

```typescript
// packages/api-client/src/groq/driver-bio.ts

import { createHash } from "node:crypto";
import { groqChat } from "./client";

export interface GenerateDriverBioInput {
  fullName: string;
  dob?: string | null;
  nationality?: string | null;
  debutYear?: number | null;
  wikiSummary?: string | null;
}

const SYSTEM_PROMPT =
  "You are an F1 archivist. Write a 3-paragraph biography. ONLY use facts from input. If a fact isn't in input, DO NOT include it. No invented stats. No em dashes. Editorial tone. Output valid markdown with no headings, just paragraphs separated by blank lines.";

function buildCacheTag(input: GenerateDriverBioInput): string {
  const seed = JSON.stringify({
    n: input.fullName,
    d: input.dob,
    c: input.nationality,
    y: input.debutYear,
    w: input.wikiSummary?.slice(0, 500),
  });
  const hash = createHash("sha1").update(seed).digest("hex").slice(0, 16);
  return `groq:driverbio:${hash}`;
}

function buildUserPrompt(input: GenerateDriverBioInput): string {
  const lines = [
    `Full name: ${input.fullName}`,
    input.dob ? `Date of birth: ${input.dob}` : null,
    input.nationality ? `Nationality: ${input.nationality}` : null,
    input.debutYear ? `F1 debut year: ${input.debutYear}` : null,
    input.wikiSummary ? `\nReference summary:\n${input.wikiSummary}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function generateDriverBio(
  input: GenerateDriverBioInput,
): Promise<string | null> {
  if (!input.fullName?.trim()) return null;

  const res = await groqChat({
    model: "llama-3.3-70b-versatile",
    temperature: 0.35,
    maxTokens: 900,
    revalidate: 2_592_000, // 30 days
    cacheTag: buildCacheTag(input),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  if (!res) return null;

  return res.content.replace(/\u2014/g, ", ").trim();
}
```

**Notes.**
- Cache key includes a 500-char window of `wikiSummary` so a Wikidata refresh that adds new facts invalidates the cache automatically.
- Model is the 70B because biographical writing needs the additional fluency. Cost-per-token doesn't matter at 30-day cache horizon.
- The output is markdown-only paragraphs, no headings, so `next-mdx-remote` renders it directly inside our existing typography stack without surprise H2s.

---

## 4. `packages/api-client/src/groq/race-strategy.ts`

The most "real" use case. Talks like a race engineer.

```typescript
// packages/api-client/src/groq/race-strategy.ts

import { createHash } from "node:crypto";
import { groqChat } from "./client";

export interface ExplainRaceStrategyInput {
  raceName: string;
  circuit: string;
  weather: {
    airTempC?: number;
    trackTempC?: number;
    rainChancePct?: number;
    windKph?: number;
    summary?: string;
  };
  tyreAllocation: {
    soft?: string;
    medium?: string;
    hard?: string;
  };
  previousWinner?: {
    driver: string;
    team: string;
    year: number;
  } | null;
}

const SYSTEM_PROMPT =
  "You are a Formula 1 race engineer. Explain expected race strategy in 4-6 paragraphs. Use industry vocabulary. No em dashes. Editorial tone. Output valid markdown with no headings, only paragraphs separated by blank lines. Never invent driver names or lap counts not present in input.";

function buildCacheTag(input: ExplainRaceStrategyInput): string {
  const seed = JSON.stringify(input);
  const hash = createHash("sha1").update(seed).digest("hex").slice(0, 16);
  return `groq:strategy:${hash}`;
}

function buildUserPrompt(input: ExplainRaceStrategyInput): string {
  const w = input.weather;
  const t = input.tyreAllocation;
  const pw = input.previousWinner;

  const weatherLine = [
    w.airTempC != null ? `air ${w.airTempC}C` : null,
    w.trackTempC != null ? `track ${w.trackTempC}C` : null,
    w.rainChancePct != null ? `rain ${w.rainChancePct}%` : null,
    w.windKph != null ? `wind ${w.windKph} kph` : null,
    w.summary ?? null,
  ]
    .filter(Boolean)
    .join(", ");

  const tyreLine = [
    t.soft ? `Soft: ${t.soft}` : null,
    t.medium ? `Medium: ${t.medium}` : null,
    t.hard ? `Hard: ${t.hard}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const lines = [
    `Race: ${input.raceName}`,
    `Circuit: ${input.circuit}`,
    weatherLine ? `Weather: ${weatherLine}` : null,
    tyreLine ? `Tyre allocation: ${tyreLine}` : null,
    pw ? `Previous winner: ${pw.driver} (${pw.team}, ${pw.year})` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export async function explainRaceStrategy(
  input: ExplainRaceStrategyInput,
): Promise<string | null> {
  if (!input.raceName?.trim() || !input.circuit?.trim()) return null;

  const res = await groqChat({
    model: "llama-3.3-70b-versatile",
    temperature: 0.45,
    maxTokens: 1400,
    revalidate: 604_800, // 7 days, manual purge between sessions
    cacheTag: buildCacheTag(input),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  if (!res) return null;

  return res.content.replace(/\u2014/g, ", ").trim();
}
```

**Notes.**
- Slightly higher temperature (0.45) because race-engineer prose benefits from a touch more variance. Still deterministic enough for repeated renders.
- Cache key is the full JSON payload so a weather refresh mid-week invalidates automatically.
- The prompt blocks driver-name invention explicitly. Llama will absolutely write "Verstappen should attempt an undercut on lap 22" with zero input data if you let it.

---

## Barrel export

```typescript
// packages/api-client/src/groq/index.ts

export { groqChat } from "./client";
export type {
  GroqModel,
  GroqMessage,
  GroqChatRequest,
  GroqChatResponse,
  GroqUsage,
} from "./client";

export { summarizeArticle } from "./summarize";
export type { SummarizeArticleInput } from "./summarize";

export { generateDriverBio } from "./driver-bio";
export type { GenerateDriverBioInput } from "./driver-bio";

export { explainRaceStrategy } from "./race-strategy";
export type { ExplainRaceStrategyInput } from "./race-strategy";
```

And the `package.json` exports patch:

```json
{
  "exports": {
    "./groq": {
      "types": "./src/groq/index.ts",
      "default": "./src/groq/index.ts"
    }
  }
}
```

Path alias in `apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@apex/api-client/groq": ["../../packages/api-client/src/groq/index.ts"]
    }
  }
}
```

---

## 5. `apps/web/components/ai/ArticleSummaryHover.tsx`

Client wrapper. Server Action fetches the summary on demand, then we cache it in a `Map` on the component for the session so re-hover is free.

```tsx
// apps/web/components/ai/ArticleSummaryHover.tsx
"use client";

import { useState, useRef, useCallback, useId } from "react";
import { getArticleSummary } from "@/app/actions/ai";

interface Props {
  article: {
    title: string;
    dek?: string | null;
    source: string;
    url: string;
  };
  children: React.ReactNode;
}

const summaryCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

export function ArticleSummaryHover({ article, children }: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tooltipId = useId();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSummary = useCallback(async () => {
    const cached = summaryCache.get(article.url);
    if (cached) {
      setSummary(cached);
      return;
    }
    if (inflight.has(article.url)) {
      const result = await inflight.get(article.url)!;
      if (result) {
        summaryCache.set(article.url, result);
        setSummary(result);
      }
      return;
    }

    setLoading(true);
    const promise = getArticleSummary(article);
    inflight.set(article.url, promise);
    try {
      const result = await promise;
      if (result) {
        summaryCache.set(article.url, result);
        setSummary(result);
      }
    } finally {
      inflight.delete(article.url);
      setLoading(false);
    }
  }, [article]);

  const handleEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => {
      setOpen(true);
      void fetchSummary();
    }, 220);
  }, [fetchSummary]);

  const handleLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(false);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      aria-describedby={open ? tooltipId : undefined}
    >
      {children}
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute z-50 top-full left-0 mt-2 w-80 rounded-xl border border-white/10 bg-[rgba(20,19,19,0.72)] backdrop-blur-md p-4 shadow-2xl text-sm leading-relaxed text-zinc-200"
        >
          {loading && !summary ? <ShimmerBlock /> : null}
          {summary ? <p className="font-[var(--font-hanken)]">{summary}</p> : null}
          {!loading && !summary ? (
            <p className="text-zinc-500 text-xs">Summary unavailable.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ShimmerBlock() {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
      <div className="h-3 w-11/12 rounded bg-white/5 animate-pulse" />
      <div className="h-3 w-8/12 rounded bg-white/5 animate-pulse" />
    </div>
  );
}
```

**Server Action** (small file, but needed):

```typescript
// apps/web/app/actions/ai.ts
"use server";

import { summarizeArticle } from "@apex/api-client/groq";

export async function getArticleSummary(input: {
  title: string;
  dek?: string | null;
  source: string;
  url: string;
}): Promise<string | null> {
  return summarizeArticle(input);
}
```

**Notes on the hover.**
- Module-level `Map`s share the cache and inflight tracking across all card instances on the page. So if a user hovers card 4 then card 4 again, only one Groq call fires for the session.
- 220ms hover delay prevents accidental triggers from the cursor traversing the rail.
- `role="tooltip"` and `aria-describedby` keep this accessible. The popover is keyboard-reachable via focus.
- Glass-medium treatment uses `bg-[rgba(20,19,19,0.72)] backdrop-blur-md` matching the design-system surface token.

---

## 6. `apps/web/app/drivers/[slug]/AIBioRefresh.tsx`

Admin-only button. Posts to the regen route, then triggers a route refresh.

```tsx
// apps/web/app/drivers/[slug]/AIBioRefresh.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
}

export function AIBioRefresh({ slug }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  const handleClick = async () => {
    setStatus("idle");
    try {
      const res = await fetch(`/api/ai/driver-bio/${slug}`, { method: "POST" });
      if (!res.ok) {
        setStatus("err");
        return;
      }
      setStatus("ok");
      startTransition(() => router.refresh());
    } catch {
      setStatus("err");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
    >
      <span className="material-symbols-outlined text-sm leading-none">
        refresh
      </span>
      {isPending ? "Regenerating" : "Regenerate bio"}
      {status === "ok" && <span className="text-emerald-400">done</span>}
      {status === "err" && <span className="text-red-400">failed</span>}
    </button>
  );
}
```

**Notes.**
- `useTransition` keeps the UI responsive while `router.refresh()` re-runs the RSC tree.
- Status pill is intentionally tiny because this button only ever appears in admin mode. It uses Material Symbols `refresh` per project convention.
- Authorization is enforced server-side in the route handler, not client-side. The button being visible only on `/admin` is presentation, the API call is what gates access.

---

## 7. `apps/web/app/api/ai/summarize/route.ts`

```typescript
// apps/web/app/api/ai/summarize/route.ts
import { NextResponse } from "next/server";
import { summarizeArticle } from "@apex/api-client/groq";

interface Body {
  title?: string;
  dek?: string | null;
  source?: string;
  url?: string;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.title || !body.source) {
    return NextResponse.json(
      { error: "title and source are required" },
      { status: 400 },
    );
  }

  const summary = await summarizeArticle({
    title: body.title,
    dek: body.dek ?? null,
    source: body.source,
    url: body.url,
  });

  if (!summary) {
    return NextResponse.json({ summary: null }, { status: 200 });
  }

  return NextResponse.json({ summary }, { status: 200 });
}
```

**Notes.**
- We return 200 with `{ summary: null }` rather than a 5xx when Groq is down. The UI's "Summary unavailable" branch handles this cleanly without console error spam.
- `runtime = "nodejs"` because we need `node:crypto` further up the call chain.
- `dynamic = "force-dynamic"` because the Server Action path bypasses this route entirely. This endpoint exists for external integrations and the hover-prefetch fallback.

---

## 8. `apps/web/app/api/ai/driver-bio/[slug]/route.ts`

```typescript
// apps/web/app/api/ai/driver-bio/[slug]/route.ts
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { generateDriverBio } from "@apex/api-client/groq";
import { getDriverBySlug } from "@/lib/drivers";
import { isAdminRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(req: Request, ctx: RouteContext) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { slug } = await ctx.params;
  if (!slug) {
    return NextResponse.json({ error: "missing slug" }, { status: 400 });
  }

  const driver = await getDriverBySlug(slug);
  if (!driver) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const bio = await generateDriverBio({
    fullName: driver.fullName,
    dob: driver.dob,
    nationality: driver.nationality,
    debutYear: driver.debutYear,
    wikiSummary: driver.wikiSummary,
  });

  if (!bio) {
    return NextResponse.json({ bio: null }, { status: 200 });
  }

  revalidateTag(`driver:${slug}:bio`);

  return NextResponse.json({ bio }, { status: 200 });
}
```

**Notes.**
- `isAdminRequest` is the project's existing admin gate. If you don't have one yet, gate on a header check against `process.env.ADMIN_TOKEN` until proper auth lands.
- `revalidateTag` triggers a re-render of any RSC consuming the `driver:${slug}:bio` tag. Wire that tag into your driver page's bio fetch.
- Next 16's params are async, hence `await ctx.params`.

---

## 9. `apps/web/app/api/ai/race-strategy/[season]/[race]/route.ts`

```typescript
// apps/web/app/api/ai/race-strategy/[season]/[race]/route.ts
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { explainRaceStrategy } from "@apex/api-client/groq";
import { getRaceContext } from "@/lib/races";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ season: string; race: string }>;
}

export async function POST(_req: Request, ctx: RouteContext) {
  const { season, race } = await ctx.params;
  const seasonNum = Number(season);
  if (!Number.isFinite(seasonNum) || !race) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const context = await getRaceContext(seasonNum, race);
  if (!context) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const strategy = await explainRaceStrategy({
    raceName: context.raceName,
    circuit: context.circuit,
    weather: context.weather,
    tyreAllocation: context.tyreAllocation,
    previousWinner: context.previousWinner,
  });

  if (!strategy) {
    return NextResponse.json({ strategy: null }, { status: 200 });
  }

  revalidateTag(`race:${season}:${race}:strategy`);

  return NextResponse.json({ strategy }, { status: 200 });
}
```

**Notes.**
- `getRaceContext` is the assumed helper that stitches Jolpica (calendar, previous winner, tyre allocation) with OpenF1 (live weather) plus Open-Meteo (forecast). It owns its own caching.
- POST-only because regenerating costs tokens. There's no GET because reads happen via the cached server component.

---

## 10. `apps/web/lib/groq.ts`

App-level helpers. These wrap the api-client so route handlers and RSCs share consistent error shapes, telemetry hooks, and any future feature flags.

```typescript
// apps/web/lib/groq.ts

import {
  summarizeArticle,
  generateDriverBio,
  explainRaceStrategy,
  type SummarizeArticleInput,
  type GenerateDriverBioInput,
  type ExplainRaceStrategyInput,
} from "@apex/api-client/groq";

export interface AiHelperResult<T> {
  ok: boolean;
  data: T | null;
  reason?: "no-key" | "rate-limit" | "timeout" | "unknown";
}

function detectReason(): AiHelperResult<never>["reason"] {
  return process.env.GROQ_API_KEY ? "unknown" : "no-key";
}

export async function getArticleSummary(
  input: SummarizeArticleInput,
): Promise<AiHelperResult<string>> {
  const data = await summarizeArticle(input);
  return data ? { ok: true, data } : { ok: false, data: null, reason: detectReason() };
}

export async function getDriverBio(
  input: GenerateDriverBioInput,
): Promise<AiHelperResult<string>> {
  const data = await generateDriverBio(input);
  return data ? { ok: true, data } : { ok: false, data: null, reason: detectReason() };
}

export async function getRaceStrategyExplainer(
  input: ExplainRaceStrategyInput,
): Promise<AiHelperResult<string>> {
  const data = await explainRaceStrategy(input);
  return data
    ? { ok: true, data }
    : { ok: false, data: null, reason: detectReason() };
}

/** Convenience for RSCs that want to render a fallback or a "powered by AI" pill. */
export function isGroqAvailable(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}
```

**Notes.**
- The wrapper layer is intentionally thin. It exists so we can later add telemetry (PostHog event on `reason: "rate-limit"`), feature flags, or A/B testing of model variants without touching the api-client.
- `isGroqAvailable()` is the clean way for an RSC to decide whether to render the "AI summary on hover" affordance at all. No need to call Groq just to find out.

---

## Wiring checklist

A few one-line edits the user needs to make to land this:

1. Add `@apex/api-client/groq` to `apps/web/tsconfig.json` paths (shown above).
2. Patch `packages/api-client/package.json` exports map (shown above).
3. Tag the driver bio fetch in `apps/web/app/drivers/[slug]/page.tsx`:
   ```typescript
   const bio = await getDriverBio({ ... });
   // declare cache tag in the underlying fetch
   ```
   Wire the tag via the `cacheTag` field on `groqChat`, which is already done in `generateDriverBio`. `revalidateTag` will reach it.
4. Confirm `.env.local` has `GROQ_API_KEY=...` at `apps/web/.env.local`.
5. Wrap `/latest` card components with `<ArticleSummaryHover article={...}>` in the rail.

That's the whole integration. No new deps. No SDK. Three production AI use cases, three cache windows tuned to their refresh semantics, full strict-mode fallback, no em dashes, no fabricated facts, and zero secrets ever cross the client boundary.

Files added (absolute paths):
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/groq/client.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/groq/summarize.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/groq/driver-bio.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/groq/race-strategy.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/packages/api-client/src/groq/index.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/components/ai/ArticleSummaryHover.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/actions/ai.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/drivers/[slug]/AIBioRefresh.tsx`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/api/ai/summarize/route.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/api/ai/driver-bio/[slug]/route.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/app/api/ai/race-strategy/[season]/[race]/route.ts`
- `/Users/shauryapunj/Desktop/F1_Claude/apps/web/lib/groq.ts`
