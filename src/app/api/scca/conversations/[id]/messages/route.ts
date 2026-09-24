/**
 * POST /api/scca/conversations/[id]/messages - Send message with SSE streaming
 *
 * Flow:
 * 1. Authenticate (session verified against DB — deleted users/stale sessions rejected)
 * 2. Rate-limit by billing tier
 * 3. Validate input
 * 4. Pack + PERSIST the user message atomically (before any AI call, so a
 *    Groq failure never loses the user's message)
 * 5. Stream AI response via SSE, propagating client aborts upstream
 * 6. Persist the assistant token atomically on success
 * 7. Record usage for metering/billing
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getSCCAConversationById, createAuditLog, appendMessageAtomically } from "@/lib/db/client";
import { prisma } from "@/lib/prisma";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  decryptMessages,
} from "@/lib/crypto/engine";
import {
  streamAIResponse,
  generateTitle,
  isAllowedModel,
  resolveModel,
} from "@/lib/ai/client";
import type { ImageAttachment } from "@/lib/ai/client";
import {
  getOrCreateBillingAccount,
  checkRateLimit,
  buildRateLimitExceededResponse,
  recordUsage,
  estimateTokens,
} from "@/lib/rate-limit";
import { decryptMedia } from "@/lib/media/processor";

// Image MIME types that can be sent to vision models
const VISION_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

// Max image size for vision API (4MB base64 ≈ 3MB raw)
const MAX_VISION_IMAGE_SIZE = 3 * 1024 * 1024;

const MAX_CONTENT_LENGTH = 100_000;
const MAX_SYSTEM_PROMPT_LENGTH = 8_000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  const auth = await requireUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    content,
    temperature,
    top_p,
    max_tokens,
    model,
    systemPrompt,
    attachmentIds,
  } = body as Record<string, unknown>;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: "Content too long (max 100KB)" },
      { status: 400 }
    );
  }

  for (const [key, value] of [
    ["temperature", temperature],
    ["top_p", top_p],
    ["max_tokens", max_tokens],
  ] as const) {
    if (value !== undefined && value !== null && typeof value !== "number") {
      return NextResponse.json(
        { error: `${key} must be a number` },
        { status: 400 }
      );
    }
  }

  if (systemPrompt !== undefined && systemPrompt !== null) {
    if (
      typeof systemPrompt !== "string" ||
      systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH
    ) {
      return NextResponse.json(
        { error: `systemPrompt must be a string ≤ ${MAX_SYSTEM_PROMPT_LENGTH} characters` },
        { status: 400 }
      );
    }
  }

  const { id } = await params;

  const conversation = await getSCCAConversationById(id, auth.id);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Resolve model: explicit client model must be allowlisted; stored models
  // fall back to the default if no longer supported.
  if (model !== undefined && model !== null) {
    if (typeof model !== "string" || !isAllowedModel(model)) {
      return NextResponse.json({ error: "Unsupported model" }, { status: 400 });
    }
  }
  const aiModel = model ? (model as string) : resolveModel(conversation.model);

  // Rate limit by billing tier
  const billing = await getOrCreateBillingAccount(auth.id);
  const rateLimit = await checkRateLimit(auth.id, billing.tier);
  if (!rateLimit.allowed) {
    const resp = buildRateLimitExceededResponse(rateLimit);
    return NextResponse.json(resp.body, { status: resp.status, headers: resp.headers });
  }

  // Derive encryption keys
  const userKey = deriveUserKey(auth.masterKey, auth.masterKeySalt);
  const convKey = deriveConversationKey(userKey, id);
  const intKey = deriveIntegrityKey(userKey, id);

  // Decrypt existing messages for AI context (pre-append state)
  const existingMessages = await decryptMessages(
    conversation.messageTokens,
    convKey
  );
  const context = existingMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // ── Resolve image attachments for vision ──
  const images: ImageAttachment[] = [];

  if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
    const ids = (attachmentIds as unknown[]).filter(
      (v): v is string => typeof v === "string"
    );

    if (ids.length > 0) {
      // Fetch attachment records (max 5 for Groq vision limit)
      const attachments = await prisma.mediaAttachment.findMany({
        where: {
          id: { in: ids.slice(0, 5) },
          userId: auth.id,
          conversationId: id,
        },
        select: {
          id: true,
          mimeType: true,
          originalSize: true,
          encryptedData: true,
        },
      });

      for (const att of attachments) {
        // Only send images that the vision model can process
        if (!VISION_MIME_TYPES.has(att.mimeType)) continue;
        // Skip images too large for the vision API
        if (att.originalSize > MAX_VISION_IMAGE_SIZE) continue;

        try {
          const sccaBuffer = Buffer.from(att.encryptedData, "base64");
          const { data, mimeType } = await decryptMedia(sccaBuffer, convKey);
          images.push({
            base64: data.toString("base64"),
            mimeType,
          });
        } catch (err) {
          console.error(`[messages] Failed to decrypt attachment ${att.id}:`, err);
        }
      }
    }
  }

  // ── Persist the user message BEFORE streaming ──
  const userPersist = await appendMessageAtomically(id, content, "user", convKey, intKey);
  if (!userPersist) {
    return NextResponse.json(
      { error: "Concurrent modification — please retry" },
      { status: 409 }
    );
  }
  const userSequence = userPersist.sequence;

  // ── SSE streaming response ──
  const encoder = new TextEncoder();
  const contextChars = context.reduce((n, m) => n + m.content.length, 0);
  const isFirstExchange = conversation.messageCount === 0;

  const upstream = new AbortController();
  const onRequestAbort = () => upstream.abort();
  if (request.signal) {
    request.signal.addEventListener("abort", onRequestAbort, { once: true });
  }

  const readable = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
          );
        } catch {
          // Client disconnected — stream already closed
        }
      };

      let fullResponse = "";
      let usage: { promptTokens: number; completionTokens: number } | null =
        null;

      const record = async (statusCode: number) => {
        // Awaited (not fire-and-forget) so the insert lands before a
        // serverless function can freeze after the stream closes.
        await recordUsage({
          userId: auth.id,
          endpoint: "/api/scca/conversations/[id]/messages",
          method: "POST",
          statusCode,
          requestTokens: usage?.promptTokens ?? Math.ceil((contextChars + content.length) / 4),
          responseTokens: usage?.completionTokens ?? estimateTokens(fullResponse),
          bytesIn: content.length,
          bytesOut: fullResponse.length,
          latencyMs: Date.now() - startTime,
          tier: billing.tier,
        }).catch((err) => console.error("[messages] recordUsage failed:", err));
      };

      try {
        const stream = streamAIResponse(context, content, aiModel, {
          temperature: temperature as number | undefined,
          top_p: top_p as number | undefined,
          max_tokens: max_tokens as number | undefined,
          systemPrompt: systemPrompt as string | undefined,
          images: images.length > 0 ? images : undefined,
          signal: upstream.signal,
          onUsage: (u) => {
            usage = u;
          },
        });

        for await (const token of stream) {
          fullResponse += token;
          send({ token });
        }

        // Client cancelled — discard the partial response
        if (upstream.signal.aborted) {
          void record(499);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }

        // ── Persist assistant response ──
        const assistantPersist = await appendMessageAtomically(
          id,
          fullResponse,
          "assistant",
          convKey,
          intKey
        );
        if (!assistantPersist) {
          send({ error: "Failed to save the response — please retry" });
          await record(500);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }

        // Auto-title from first message
        let title = conversation.title;
        if (isFirstExchange) {
          try {
            title = await generateTitle(content);
          } catch {
            title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
          }
          await prisma.sCCAConversation.update({
            where: { id },
            data: { title },
          });
        }

        await createAuditLog({
          userId: auth.id,
          conversationId: id,
          action: "send",
          details: {
            promptLength: content.length,
            responseLength: fullResponse.length,
            messageCount: assistantPersist.sequence + 1,
          },
        });

        send({
          done: true,
          messageCount: assistantPersist.sequence + 1,
          title,
        });

        await record(200);

        try {
          controller.close();
        } catch {
          /* already closed */
        }
      } catch (error: any) {
        const aborted =
          upstream.signal.aborted || error?.name === "AbortError";
        if (!aborted) {
          console.error("[messages] stream error:", error);
          send({ error: "AI request failed — please try again" });
          await record(500);
        } else {
          void record(499);
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      upstream.abort();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
