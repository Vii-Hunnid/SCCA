/**
 * AI Client - Groq API integration
 *
 * Provides streaming and non-streaming AI responses.
 * Uses Groq SDK for fast inference with Llama models.
 * Supports multimodal (vision) messages with image attachments.
 */

import Groq from "groq-sdk";

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is not configured.");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Image attachment to include in a vision request */
export interface ImageAttachment {
  base64: string; // base64-encoded image data
  mimeType: string; // e.g. "image/jpeg", "image/png"
}

// Vision-capable model for multimodal requests
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// Models clients may explicitly request. Values stored on existing
// conversations outside this set fall back to the default rather than
// failing. Override/extend via GROQ_EXTRA_MODELS (comma-separated).
export const ALLOWED_MODELS: ReadonlySet<string> = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  VISION_MODEL,
]);

export const DEFAULT_MODEL =
  process.env.DEFAULT_MODEL || "llama-3.3-70b-versatile";

export function isAllowedModel(model: string): boolean {
  if (ALLOWED_MODELS.has(model)) return true;
  const extra = (process.env.GROQ_EXTRA_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(model);
}

/** Resolve a stored/provided model to one Groq will accept. */
export function resolveModel(model?: string | null): string {
  if (model && isAllowedModel(model)) return model;
  return DEFAULT_MODEL;
}

const MAX_SYSTEM_PROMPT_LENGTH = 8000;

// Approximate context budget in characters (~1 token ≈ 4 chars). Kept well
// under the 128k-token window of the supported models so conversations can
// keep responding indefinitely.
const CONTEXT_BUDGET_CHARS = 120_000;

const TRIM_NOTICE =
  "[Earlier messages were trimmed to fit the context window. Continue based on the recent conversation.]";

/**
 * Trim conversation context to a character budget by dropping the oldest
 * turns. Exported for testing.
 */
export function trimContextToBudget(
  context: ChatMessage[],
  budgetChars: number = CONTEXT_BUDGET_CHARS
): { messages: ChatMessage[]; trimmed: boolean } {
  const total = context.reduce((n, m) => n + m.content.length, 0);
  if (total <= budgetChars) return { messages: context, trimmed: false };

  const kept: ChatMessage[] = [];
  let chars = 0;
  for (let i = context.length - 1; i >= 0; i--) {
    chars += context[i].content.length;
    if (chars > budgetChars && kept.length > 0) break;
    kept.unshift(context[i]);
  }
  return { messages: kept, trimmed: true };
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1_000;
const REQUEST_TIMEOUT_MS = 60_000;

function isRetryable(err: unknown): boolean {
  const status = (err as any)?.status ?? (err as any)?.statusCode;
  if (status && RETRYABLE_STATUS.has(Number(status))) return true;
  const name = (err as any)?.name;
  return name === "APIConnectionError" || name === "ConnectionError";
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Stream AI response tokens.
 * Returns an async generator yielding string tokens.
 *
 * When `images` is provided, automatically switches to a vision model
 * and sends the images as base64 data URIs alongside the text.
 */
export interface StreamOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  systemPrompt?: string;
  images?: ImageAttachment[];
  /** Abort the upstream Groq request (e.g. client disconnected) */
  signal?: AbortSignal;
  /** Called with real token usage when Groq reports it (final stream chunk) */
  onUsage?: (usage: { promptTokens: number; completionTokens: number }) => void;
}

export async function* streamAIResponse(
  context: ChatMessage[],
  userMessage: string,
  model: string = DEFAULT_MODEL,
  options: StreamOptions = {}
): AsyncGenerator<string> {
  const hasImages = options.images && options.images.length > 0;
  const actualModel = hasImages ? VISION_MODEL : model;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [];

  // Add system prompt if provided (capped)
  if (options.systemPrompt) {
    messages.push({
      role: "system",
      content: options.systemPrompt.slice(0, MAX_SYSTEM_PROMPT_LENGTH),
    });
  }

  // Cap the context so long conversations keep fitting the model window
  const { messages: trimmedContext, trimmed } = trimContextToBudget(context);
  if (trimmed) {
    messages.push({ role: "system", content: TRIM_NOTICE });
  }
  messages.push(...trimmedContext);

  // Build the user message — multimodal if images present
  if (hasImages) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [];

    // Add text content
    if (userMessage) {
      content.push({ type: "text", text: userMessage });
    }

    // Add image(s) as base64 data URIs (max 5 per Groq limit)
    for (const img of options.images!.slice(0, 5)) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
        },
      });
    }

    messages.push({ role: "user", content });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  const params = {
    model: actualModel,
    messages,
    temperature: clampNumber(options.temperature, 0, 2, 0.7),
    top_p: clampNumber(options.top_p, 0, 1, 1),
    max_tokens: clampNumber(options.max_tokens, 1, 32768, 8192),
    stream: true,
    stream_options: { include_usage: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  // Establish the stream with retries + timeout. Mid-stream failures are
  // NOT retried — resuming would duplicate content in the UI.
  let stream: AsyncIterable<any>;
  for (let attempt = 0; ; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    try {
      const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const signal = options.signal
        ? combineSignals([options.signal, timeoutSignal])
        : timeoutSignal;
      stream = (await getGroqClient().chat.completions.create(
        params,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { signal } as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as unknown as AsyncIterable<any>;
      break;
    } catch (err) {
      const aborted =
        options.signal?.aborted ||
        (err as any)?.name === "AbortError" ||
        (err as any)?.name === "TimeoutError";
      if (aborted || !isRetryable(err) || attempt >= MAX_RETRIES) {
        throw err;
      }
      await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt, options.signal);
    }
  }

  for await (const chunk of stream!) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const usage = (chunk as any).usage;
    if (usage && options.onUsage) {
      options.onUsage({
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
      });
    }
    const token = chunk.choices[0]?.delta?.content;
    if (token) {
      yield token;
    }
  }
}

function combineSignals(signals: AbortSignal[]): AbortSignal {
  const anySignal = (AbortSignal as any).any;
  if (typeof anySignal === "function") {
    return anySignal.call(AbortSignal, signals) as AbortSignal;
  }
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), {
      once: true,
    });
  }
  return controller.signal;
}

/**
 * Non-streaming AI response. Returns the full response string.
 */
export async function getAIResponse(
  context: ChatMessage[],
  userMessage: string,
  model: string = "llama-3.3-70b-versatile",
  options: {
    temperature?: number;
    max_tokens?: number;
    systemPrompt?: string;
  } = {}
): Promise<string> {
  const messages: ChatMessage[] = [];

  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  messages.push(...context);
  messages.push({ role: "user", content: userMessage });

  const completion = await getGroqClient().chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 8192,
  });

  return completion.choices[0]?.message?.content || "";
}

/**
 * Generate a short title for a conversation from its first message.
 */
export async function generateTitle(firstMessage: string): Promise<string> {
  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "Generate a short title (3-6 words) for a conversation that starts with the following message. Return only the title, no quotes or extra text.",
      },
      { role: "user", content: firstMessage },
    ],
    temperature: 0.3,
    max_tokens: 20,
  });

  return (
    completion.choices[0]?.message?.content?.trim().slice(0, 100) || "New Chat"
  );
}
