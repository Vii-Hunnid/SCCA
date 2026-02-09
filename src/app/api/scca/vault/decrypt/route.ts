/**
 * POST /api/scca/vault/decrypt
 *
 * Decrypt SCCA tokens back to plaintext.
 * Must use the same context that was used during encryption.
 *
 * Request:
 *   { tokens: string[], context: string }
 *
 * Response:
 *   { data: [{ content, sequence, timestamp, contentHash }], context }
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-key-auth";
import {
  deriveUserKey,
  deriveConversationKey,
  unpackMessage,
} from "@/lib/crypto/engine";
import {
  checkRateLimit,
  recordUsage,
  getOrCreateBillingAccount,
  getRateLimitHeaders,
  estimateTokens,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check rate limits
    const billing = await getOrCreateBillingAccount(user.id);
    const rateLimit = await checkRateLimit(user.id, billing.tier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rateLimit.retryAfterMs },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { tokens, context } = body;

    if (!context || typeof context !== "string") {
      return NextResponse.json(
        {
          error:
            "Missing 'context' — must match the context used during encryption",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: "Missing 'tokens' — array of encrypted SCCA tokens" },
        { status: 400 }
      );
    }

    if (tokens.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 tokens per request" },
        { status: 400 }
      );
    }

    // Derive the same encryption key using context
    const userKey = deriveUserKey(user.masterKey, user.masterKeySalt);
    const encryptionKey = deriveConversationKey(userKey, context);

    // Decrypt each token
    const data: {
      content: string;
      sequence: number;
      timestamp: string;
      contentHash: string;
    }[] = [];

    for (let i = 0; i < tokens.length; i++) {
      if (typeof tokens[i] !== "string") {
        return NextResponse.json(
          { error: `Token at index ${i} must be a string` },
          { status: 400 }
        );
      }

      try {
        const msg = await unpackMessage(tokens[i], encryptionKey);
        data.push({
          content: msg.content,
          sequence: msg.sequence,
          timestamp: msg.timestamp.toISOString(),
          contentHash: msg.contentHash,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            error: `Failed to decrypt token at index ${i}: ${err.message}`,
            index: i,
          },
          { status: 422 }
        );
      }
    }

    const responseBody = { data, context };
    const responseStr = JSON.stringify(responseBody);
    const bodyStr = JSON.stringify(body);

    // Record usage (fire-and-forget)
    recordUsage({
      userId: user.id,
      apiKeyId: user.apiKeyId,
      endpoint: "vault/decrypt",
      method: "POST",
      statusCode: 200,
      requestTokens: estimateTokens(bodyStr),
      responseTokens: estimateTokens(responseStr),
      bytesIn: Buffer.byteLength(bodyStr, "utf-8"),
      bytesOut: Buffer.byteLength(responseStr, "utf-8"),
      latencyMs: Date.now() - startTime,
      tier: billing.tier,
    }).catch((e) => console.error("[vault/decrypt] usage recording failed:", e));

    return NextResponse.json(responseBody, {
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (err: any) {
    console.error("[vault/decrypt]", err);
    return NextResponse.json(
      { error: err.message || "Decryption failed" },
      { status: 500 }
    );
  }
}
