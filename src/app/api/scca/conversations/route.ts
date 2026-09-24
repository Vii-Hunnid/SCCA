/**
 * GET  /api/scca/conversations - List user's conversations
 * POST /api/scca/conversations - Create new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import {
  createSCCAConversation,
  getSCCAConversationsByUser,
  createAuditLog,
} from "@/lib/db/client";
import { isAllowedModel, resolveModel } from "@/lib/ai/client";
import {
  getOrCreateBillingAccount,
  checkRateLimit,
  buildRateLimitExceededResponse,
  recordUsage,
} from "@/lib/rate-limit";

const MAX_TITLE_LENGTH = 200;

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await getSCCAConversationsByUser(auth.id);

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
  const startTime = Date.now();
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    if (body.title !== undefined && body.title !== null) {
      if (
        typeof body.title !== "string" ||
        body.title.trim().length === 0 ||
        body.title.trim().length > MAX_TITLE_LENGTH
      ) {
        return NextResponse.json(
          { error: `Title must be 1-${MAX_TITLE_LENGTH} characters` },
          { status: 400 }
        );
      }
    }

    if (body.model !== undefined && body.model !== null) {
      if (typeof body.model !== "string" || !isAllowedModel(body.model)) {
        return NextResponse.json(
          { error: "Unsupported model" },
          { status: 400 }
        );
      }
    }

    // Rate limit conversation creation by billing tier
    const billing = await getOrCreateBillingAccount(auth.id);
    const rateLimit = await checkRateLimit(auth.id, billing.tier);
    if (!rateLimit.allowed) {
      const resp = buildRateLimitExceededResponse(rateLimit);
      return NextResponse.json(resp.body, { status: resp.status, headers: resp.headers });
    }

    const title = (body.title as string | undefined)?.trim() || "New Chat";
    const model = body.model
      ? (body.model as string)
      : resolveModel(null);

    const conversation = await createSCCAConversation(auth.id, title, model);

    recordUsage({
      userId: auth.id,
      endpoint: "/api/scca/conversations",
      method: "POST",
      statusCode: 201,
      latencyMs: Date.now() - startTime,
      tier: billing.tier,
    }).catch((err) => console.error("[conversations] recordUsage failed:", err));

    await createAuditLog({
      userId: auth.id,
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
