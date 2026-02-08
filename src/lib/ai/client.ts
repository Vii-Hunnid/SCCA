/**
 * AI Client - Groq API integration
 *
 * Provides streaming and non-streaming AI responses.
 * Uses Groq SDK for fast inference with Llama models.
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

/**
 * Stream AI response tokens.
 * Returns an async generator yielding string tokens.
 */
export async function* streamAIResponse(
  context: ChatMessage[],
  userMessage: string,
  model: string = "llama-3.3-70b-versatile",
  options: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    systemPrompt?: string;
  } = {}
): AsyncGenerator<string> {
  const messages: ChatMessage[] = [];

  // Add system prompt if provided
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  // Add conversation context
  messages.push(...context);

  // Add the new user message
  messages.push({ role: "user", content: userMessage });

  const stream = await getGroqClient().chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    top_p: options.top_p ?? 1,
    max_tokens: options.max_tokens ?? 8192,
    stream: true,
  });

  for await (const chunk of stream) {
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
