/**
 * POST /api/scca/conversations/[id]/edit - Destructive edit or delete
 *
 * Edit: Replace message at sequence, truncate all after, optionally regenerate.
 * Delete: Remove message at sequence and all after.
 *
 * WARNING: These operations permanently delete messages. No undo.
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
  destructiveEdit,
  destructiveDelete,
  decryptMessages,
  appendMessage,
} from "@/lib/crypto/engine";
import { streamAIResponse } from "@/lib/ai/client";

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

  const { id } = await params;

  try {
    const conversation = await getSCCAConversationById(id, session.user.id);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Derive keys
    const masterKey = getMasterKeyFromSession(session);
    const userKey = deriveUserKey(masterKey, session.user.masterKeySalt);
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

      const result = await destructiveDelete(
        conversation.messageTokens,
        sequence,
        intKey
      );

      await prisma.sCCAConversation.update({
        where: { id },
        data: {
          messageTokens: result.newTokens,
          messageCount: result.newTokens.length,
          merkleRoot: result.merkleRoot,
        },
      });

      await createAuditLog({
        userId: session.user.id,
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
    const { sequence, content, regenerate, temperature, systemPrompt } = body;

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

    // Execute destructive edit (truncate + replace)
    const editResult = await destructiveEdit(
      conversation.messageTokens,
      sequence,
      content,
      convKey,
      intKey
    );

    // If no regeneration requested, just save
    if (!regenerate) {
      await prisma.sCCAConversation.update({
        where: { id },
        data: {
          messageTokens: editResult.newTokens,
          messageCount: editResult.newTokens.length,
          merkleRoot: editResult.merkleRoot,
        },
      });

      await createAuditLog({
        userId: session.user.id,
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

    // ── REGENERATION with SSE streaming ──
    const encoder = new TextEncoder();

    // Decrypt the post-edit context for AI
    const postEditMessages = await decryptMessages(editResult.newTokens, convKey);
    const context = postEditMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const readable = new ReadableStream({
      async start(controller) {
        let fullResponse = "";

        try {
          const stream = streamAIResponse(
            context.slice(0, -1), // context without the edited message
            content, // the edited message as the user input
            conversation.model,
            { temperature, systemPrompt }
          );

          for await (const token of stream) {
            fullResponse += token;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
            );
          }

          // Pack AI response
          const assistantSequence = editResult.newTokens.length;
          const finalAppend = await appendMessage(
            editResult.newTokens,
            fullResponse,
            "assistant",
            assistantSequence,
            convKey,
            intKey
          );

          // Update database
          await prisma.sCCAConversation.update({
            where: { id },
            data: {
              messageTokens: finalAppend.newTokens,
              messageCount: finalAppend.newTokens.length,
              merkleRoot: finalAppend.merkleRoot,
            },
          });

          await createAuditLog({
            userId: session.user.id,
            conversationId: id,
            action: "edit",
            details: {
              sequence,
              deletedCount: editResult.deletedCount,
              regenerate: true,
              responseLength: fullResponse.length,
            },
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                messageCount: finalAppend.newTokens.length,
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
    console.error("POST /api/scca/conversations/[id]/edit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to edit message" },
      { status: 500 }
    );
  }
}
