/**
 * GET    /api/scca/conversations/[id] - Get conversation with decrypted messages
 * PATCH  /api/scca/conversations/[id] - Update title/model
 * DELETE /api/scca/conversations/[id] - Soft delete
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import {
  getSCCAConversationById,
  updateSCCAConversation,
  deleteSCCAConversation,
  createAuditLog,
} from "@/lib/db/client";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  decryptMessages,
  verifyMerkleRoot,
} from "@/lib/crypto/engine";

function parseViewportParams(request: NextRequest): {
  offset: number;
  limit: number;
} | null {
  const { searchParams } = new URL(request.url);
  const rawOffset = searchParams.get("offset");
  const rawLimit = searchParams.get("limit");

  const offset = rawOffset === null ? 0 : Number.parseInt(rawOffset, 10);
  const limit = rawLimit === null ? 100 : Number.parseInt(rawLimit, 10);

  if (
    !Number.isInteger(offset) ||
    !Number.isInteger(limit) ||
    offset < 0 ||
    limit < 1 ||
    limit > 500
  ) {
    return null;
  }
  return { offset, limit };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewport = parseViewportParams(request);
    if (!viewport) {
      return NextResponse.json(
        { error: "Invalid offset/limit parameters" },
        { status: 400 }
      );
    }
    const { offset, limit } = viewport;

    const { id } = await params;
    const conversation = await getSCCAConversationById(id, auth.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Derive keys for decryption
    const userKey = deriveUserKey(auth.masterKey, auth.masterKeySalt);
    const convKey = deriveConversationKey(userKey, id);
    const intKey = deriveIntegrityKey(userKey, id);

    // Decrypt viewport messages
    const messages = await decryptMessages(
      conversation.messageTokens,
      convKey,
      offset,
      limit
    );

    // Verify integrity
    const integrityValid = verifyMerkleRoot(
      conversation.messageTokens,
      conversation.merkleRoot,
      intKey
    );

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      messageCount: conversation.messageCount,
      merkleRoot: conversation.merkleRoot,
      integrity: { valid: integrityValid },
      messages: messages.map((m) => ({
        id: `msg-${m.sequence}`,
        role: m.role,
        content: m.content,
        sequence: m.sequence,
        timestamp: m.timestamp.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("GET /api/scca/conversations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 }
    );
  }
}

const MAX_TITLE_LENGTH = 200;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await getSCCAConversationById(id, auth.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const updates: Record<string, string> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string") {
        return NextResponse.json(
          { error: "Title must be a string" },
          { status: 400 }
        );
      }
      const title = body.title.trim();
      if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
        return NextResponse.json(
          { error: `Title must be 1-${MAX_TITLE_LENGTH} characters` },
          { status: 400 }
        );
      }
      updates.title = title;
    }

    if (body.model !== undefined) {
      if (typeof body.model !== "string" || body.model.length > 100) {
        return NextResponse.json(
          { error: "Invalid model" },
          { status: 400 }
        );
      }
      updates.model = body.model;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    await updateSCCAConversation(id, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/scca/conversations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await getSCCAConversationById(id, auth.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await deleteSCCAConversation(id, auth.id);

    await createAuditLog({
      userId: auth.id,
      conversationId: id,
      action: "delete",
      details: { messageCount: conversation.messageCount },
    });

    return NextResponse.json({
      success: true,
      deletedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("DELETE /api/scca/conversations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
