/**
 * GET    /api/scca/conversations/[id] - Get conversation with decrypted messages
 * PATCH  /api/scca/conversations/[id] - Update title/model
 * DELETE /api/scca/conversations/[id] - Soft delete
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getMasterKeyFromSession } from "@/lib/auth";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await getSCCAConversationById(id, session.user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Derive keys for decryption
    const masterKey = getMasterKeyFromSession(session);
    const userKey = deriveUserKey(masterKey, session.user.masterKeySalt);
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await getSCCAConversationById(id, session.user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, string> = {};

    if (body.title) updates.title = body.title.trim();
    if (body.model) updates.model = body.model;

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await getSCCAConversationById(id, session.user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await deleteSCCAConversation(id, session.user.id);

    await createAuditLog({
      userId: session.user.id,
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
