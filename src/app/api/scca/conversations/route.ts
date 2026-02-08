/**
 * GET  /api/scca/conversations - List user's conversations
 * POST /api/scca/conversations - Create new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  createSCCAConversation,
  getSCCAConversationsByUser,
  createAuditLog,
} from "@/lib/db/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await getSCCAConversationsByUser(session.user.id);

    return NextResponse.json(conversations);
  } catch (error: any) {
    console.error("GET /api/scca/conversations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = body.title?.trim() || "New Chat";
    const model = body.model || undefined;

    const conversation = await createSCCAConversation(
      session.user.id,
      title,
      model
    );

    await createAuditLog({
      userId: session.user.id,
      conversationId: conversation.id,
      action: "create",
      details: { title: conversation.title, model: conversation.model },
    });

    return NextResponse.json(
      {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        messageCount: 0,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/scca/conversations error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
