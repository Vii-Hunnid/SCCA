/**
 * POST /api/scca/conversations/[id]/edit - Destructive edit or delete
 *
 * Edit: Replace message at sequence, truncate all after, optionally regenerate.
 * Delete: Remove message at sequence and all after.
 *
 * WARNING: These operations permanently delete messages. No undo.
 *
 * All token-array writes use optimistic concurrency (expected message count)
 * so concurrent operations fail with 409 instead of silently clobbering.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import {
  getSCCAConversationById,
  createAuditLog,
  appendMessageAtomically,
  replaceSCCAMessageTokens,
} from "@/lib/db/client";
import { prisma } from "@/lib/prisma";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  destructiveEdit,
  destructiveDelete,
  decryptMessages,
  peekMessageHeader,
} from "@/lib/crypto/engine";
import { streamAIResponse, isAllowedModel, resolveModel } from "@/lib/ai/client";
import {
  getOrCreateBillingAccount,
  checkRateLimit,
  buildRateLimitExceededResponse,
  recordUsage,
  estimateTokens,
} from "@/lib/rate-limit";

const MAX_CONTENT_LENGTH = 100_000;

/**
 * Replace the conversation token array, re-reading and retrying once on
 * optimistic-concurrency conflict.
 */
async function replaceWithRetry(
  id: string,
  tokens: string[],
  newCount: number,
  merkleRoot: string
): Promise<boolean> {
  // Ownership was verified by the caller before streaming; here we only
  // need the current count for the optimistic-concurrency check.
  for (let attempt = 0; attempt < 2; attempt++) {
    const conv = await prisma.sCCAConversation.findFirst({
      where: { id },
      select: { messageCount: true },
    });
    if (!conv) return false;
    if (
      await replaceSCCAMessageTokens(id, tokens, newCount, merkleRoot, conv.messageCount)
    ) {
      return true;
    }
  }
  return false;
}

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

  const { id } = await params;

  const conversation = await getSCCAConversationById(id, auth.id);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Derive keys
  const userKey = deriveUserKey(auth.masterKey, auth.masterKeySalt);
  const convKey = deriveConversationKey(userKey, id);
  const intKey = deriveIntegrityKey(userKey, id);

  // ── DELETE operation ──
  if (body.action === "delete") {
    const { sequence } = body;

    if (!Number.isInteger(sequence) || sequence < 0) {
      return NextResponse.json(
        { error: "Invalid sequence number" },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await destructiveDelete(
        conversation.messageTokens,
        sequence,
        intKey
      );
    } catch (err: any) {
      if (err?.message?.includes("not found")) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 }
        );
      }
      throw err;
    }

    const saved = await replaceWithRetry(
      id,
      result.newTokens,
      result.newTokens.length,
      result.merkleRoot
    );
    if (!saved) {
      return NextResponse.json(
        { error: "Concurrent modification — please retry" },
        { status: 409 }
      );
    }

    await createAuditLog({
      userId: auth.id,
      conversationId: id,
      action: "delete_message",
      details: { sequence, deletedCount: result.deletedCount },
    });

    return NextResponse.json({
      success: true,
      messageCount: result.newTokens.length,
      deletedCount: result.deletedCount,
    });
  }

  // ── EDIT operation ──
  const { sequence, content, regenerate, temperature, top_p, max_tokens, model, systemPrompt } =
    body as Record<string, any>;

  if (!Number.isInteger(sequence) || sequence < 0) {
    return NextResponse.json(
      { error: "Invalid sequence number" },
      { status: 400 }
    );
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "Content required for edit" },
      { status: 400 }
    );
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: "Content too long (max 100KB)" },
      { status: 400 }
    );
  }

  if (model !== undefined && model !== null) {
    if (typeof model !== "string" || !isAllowedModel(model)) {
      return NextResponse.json({ error: "Unsupported model" }, { status: 400 });
    }
  }
  const aiModel = model ? (model as string) : resolveModel(conversation.model);

  // Locate the target and reject regeneration of assistant messages:
  // the model cannot regenerate from an assistant turn.
  let targetRole: "user" | "assistant" | "system" = "user";
  for (const token of conversation.messageTokens) {
    const header = peekMessageHeader(token);
    if (header && header.sequence === sequence) {
      targetRole = header.role;
      break;
    }
  }

  if (regenerate && targetRole !== "user") {
    return NextResponse.json(
      { error: "Only user messages can be regenerated" },
      { status: 400 }
    );
  }

  // Execute destructive edit (truncate + replace)
  let editResult;
  try {
    editResult = await destructiveEdit(
      conversation.messageTokens,
      sequence,
      content,
      convKey,
      intKey
    );
  } catch (err: any) {
    if (err?.message?.includes("not found")) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    throw err;
  }

  // If no regeneration requested, just save
  if (!regenerate) {
    const saved = await replaceWithRetry(
      id,
      editResult.newTokens,
      editResult.newTokens.length,
      editResult.merkleRoot
    );
    if (!saved) {
      return NextResponse.json(
        { error: "Concurrent modification — please retry" },
        { status: 409 }
      );
    }

    await createAuditLog({
      userId: auth.id,
      conversationId: id,
      action: "edit",
      details: {
        sequence,
        deletedCount: editResult.deletedCount,
        regenerate: false,
      },
    });

    return NextResponse.json({
      success: true,
      messageCount: editResult.newTokens.length,
      deletedCount: editResult.deletedCount,
      needsRegeneration: false,
    });
  }

  // ── REGENERATION: rate-limit, persist edited state, then stream ──
  const billing = await getOrCreateBillingAccount(auth.id);
  const rateLimit = await checkRateLimit(auth.id, billing.tier);
  if (!rateLimit.allowed) {
    const resp = buildRateLimitExceededResponse(rateLimit);
    return NextResponse.json(resp.body, { status: resp.status, headers: resp.headers });
  }

  // Persist the edited conversation BEFORE streaming so the edit survives
  // a Groq failure.
  const editSaved = await replaceWithRetry(
    id,
    editResult.newTokens,
    editResult.newTokens.length,
    editResult.merkleRoot
  );
  if (!editSaved) {
    return NextResponse.json(
      { error: "Concurrent modification — please retry" },
      { status: 409 }
    );
  }

  const encoder = new TextEncoder();

  // Decrypt the post-edit context for AI
  const postEditMessages = await decryptMessages(editResult.newTokens, convKey);
  const context = postEditMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const contextChars = context.reduce((n, m) => n + m.content.length, 0);

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
          // Client disconnected
        }
      };

      let fullResponse = "";
      let usage: { promptTokens: number; completionTokens: number } | null =
        null;

      const record = async (statusCode: number) => {
        // Awaited so the insert lands before a serverless function can
        // freeze after the stream closes.
        await recordUsage({
          userId: auth.id,
          endpoint: "/api/scca/conversations/[id]/edit",
          method: "POST",
          statusCode,
          requestTokens: usage?.promptTokens ?? Math.ceil((contextChars + content.length) / 4),
          responseTokens: usage?.completionTokens ?? estimateTokens(fullResponse),
          bytesIn: content.length,
          bytesOut: fullResponse.length,
          latencyMs: Date.now() - startTime,
          tier: billing.tier,
        }).catch((err) => console.error("[edit] recordUsage failed:", err));
      };

      try {
        const stream = streamAIResponse(
          context.slice(0, -1), // context without the edited message
          content, // the edited message as the user input
          aiModel,
          {
            temperature,
            top_p,
            max_tokens,
            systemPrompt,
            signal: upstream.signal,
            onUsage: (u) => {
              usage = u;
            },
          }
        );

        for await (const token of stream) {
          fullResponse += token;
          send({ token });
        }

        if (upstream.signal.aborted) {
          void record(499);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }

        // Persist the regenerated response
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

        await createAuditLog({
          userId: auth.id,
          conversationId: id,
          action: "edit",
          details: {
            sequence,
            deletedCount: editResult.deletedCount,
            regenerate: true,
            responseLength: fullResponse.length,
          },
        });

        send({
          done: true,
          messageCount: assistantPersist.sequence + 1,
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
          console.error("[edit] stream error:", error);
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
