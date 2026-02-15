/**
 * POST /api/scca/conversations/[id]/messages - Send message with SSE streaming
 *
 * Flow:
 * 1. Authenticate user
 * 2. Load & decrypt conversation context
 * 3. Pack user message into encrypted token
 * 4. Stream AI response via SSE
 * 5. Pack AI response, append both tokens, update DB
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getMasterKeyFromSession } from "@/lib/auth";
import { getSCCAConversationById, createAuditLog } from "@/lib/db/client";
import { prisma } from "@/lib/prisma";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  decryptMessages,
  appendMessage,
} from "@/lib/crypto/engine";
import { streamAIResponse, generateTitle } from "@/lib/ai/client";
import type { ImageAttachment } from "@/lib/ai/client";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
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
  } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  if (content.length > 100000) {
    return NextResponse.json(
      { error: "Content too long (max 100KB)" },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const conversation = await getSCCAConversationById(id, session.user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Derive encryption keys
    const masterKey = getMasterKeyFromSession(session);
    const userKey = deriveUserKey(masterKey, session.user.masterKeySalt);
    const convKey = deriveConversationKey(userKey, id);
    const intKey = deriveIntegrityKey(userKey, id);

    // Decrypt existing messages for AI context
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
      // Fetch attachment records (max 5 for Groq vision limit)
      const attachments = await prisma.mediaAttachment.findMany({
        where: {
          id: { in: attachmentIds.slice(0, 5) },
          userId: session.user.id,
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

    // Pack user message immediately
    const userSequence = conversation.messageCount;
    const userAppend = await appendMessage(
      conversation.messageTokens,
      content,
      "user",
      userSequence,
      convKey,
      intKey
    );

    // SSE streaming response
    const encoder = new TextEncoder();
    const aiModel = model || conversation.model;

    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = "";

        try {
          // Stream AI tokens — pass images for vision if available
          const stream = streamAIResponse(context, content, aiModel, {
            temperature,
            top_p,
            max_tokens,
            systemPrompt,
            images: images.length > 0 ? images : undefined,
          });

          for await (const token of stream) {
            fullResponse += token;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
            );
          }

          // Pack AI response
          const assistantSequence = userSequence + 1;
          const finalAppend = await appendMessage(
            userAppend.newTokens,
            fullResponse,
            "assistant",
            assistantSequence,
            convKey,
            intKey
          );

          // Auto-title from first message
          let title = conversation.title;
          if (conversation.messageCount === 0) {
            try {
              title = await generateTitle(content);
            } catch {
              title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
            }
          }

          // Update database
          await prisma.sCCAConversation.update({
            where: { id },
            data: {
              messageTokens: finalAppend.newTokens,
              messageCount: assistantSequence + 1,
              merkleRoot: finalAppend.merkleRoot,
              title,
            },
          });

          // Audit log
          await createAuditLog({
            userId: session.user.id,
            conversationId: id,
            action: "send",
            details: {
              promptLength: content.length,
              responseLength: fullResponse.length,
              messageCount: assistantSequence + 1,
            },
          });

          // Send done event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                messageCount: assistantSequence + 1,
                title,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error.message })}\n\n`
            )
          );
          controller.close();
        }
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
  } catch (error: any) {
    console.error("POST /api/scca/conversations/[id]/messages error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
