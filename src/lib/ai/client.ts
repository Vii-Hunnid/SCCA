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

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
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

  // Add conversation context (text-only for history)
  messages.push(...context);

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

  const stream = (await getGroqClient().chat.completions.create(
    {
      model: actualModel,
      messages,
      temperature: clampNumber(options.temperature, 0, 2, 0.7),
      top_p: clampNumber(options.top_p, 0, 1, 1),
      max_tokens: clampNumber(options.max_tokens, 1, 32768, 8192),
      stream: true,
      stream_options: { include_usage: true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { signal: options.signal } as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )) as unknown as AsyncIterable<any>;

  for await (const chunk of stream) {
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
