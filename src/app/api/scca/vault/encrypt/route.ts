/**
 * POST /api/scca/vault/encrypt
 *
 * Encrypt arbitrary data using SCCA's AES-256-GCM engine.
 * Each "context" gets its own derived encryption key (key isolation).
 *
 * Request:
 *   { data: string | string[], context: string }
 *
 * Response:
 *   { tokens: string[], merkleRoot: string, metadata: {...} }
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-key-auth";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  packMessage,
  computeMerkleRoot,
  estimateStorageSize,
} from "@/lib/crypto/engine";
import {
  checkRateLimit,
  recordUsage,
  getOrCreateBillingAccount,
  getRateLimitHeaders,
  estimateTokens,
  buildRateLimitExceededResponse,
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
      const resp = buildRateLimitExceededResponse(rateLimit);
      return NextResponse.json(resp.body, { status: resp.status, headers: resp.headers });
    }

    const body = await request.json();
    const { data, context } = body;

    if (!context || typeof context !== "string" || context.length < 1) {
      return NextResponse.json(
        {
          error:
            "Missing 'context' — a string identifier for key isolation (e.g. 'my-app', 'project-123')",
        },
        { status: 400 }
      );
    }

    if (context.length > 256) {
      return NextResponse.json(
        { error: "Context must be 256 characters or fewer" },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Missing 'data' — a string or array of strings to encrypt" },
        { status: 400 }
      );
    }

    // Normalize to array
    const items: string[] = Array.isArray(data) ? data : [data];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Data array must not be empty" },
        { status: 400 }
      );
    }

    if (items.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 items per request" },
        { status: 400 }
      );
    }

    for (let i = 0; i < items.length; i++) {
      if (typeof items[i] !== "string" || items[i].length === 0) {
        return NextResponse.json(
          { error: `Item at index ${i} must be a non-empty string` },
          { status: 400 }
        );
      }
      if (items[i].length > 100000) {
        return NextResponse.json(
          {
            error: `Item at index ${i} exceeds maximum size (100KB)`,
          },
          { status: 400 }
        );
      }
    }

    // Derive keys using context as the key isolation scope
    const userKey = deriveUserKey(user.masterKey, user.masterKeySalt);
    const encryptionKey = deriveConversationKey(userKey, context);
    const integrityKey = deriveIntegrityKey(userKey, context);

    // Encrypt each item
    const tokens: string[] = [];
    let totalOriginalBytes = 0;

    for (let i = 0; i < items.length; i++) {
      totalOriginalBytes += Buffer.byteLength(items[i], "utf-8");
      const token = await packMessage(items[i], "user", i, encryptionKey);
      tokens.push(token);
    }

    // Compute integrity hash
    const merkleRoot = computeMerkleRoot(tokens, integrityKey);

    // Calculate metrics
    const totalEncryptedBytes = estimateStorageSize(tokens);

    const responseBody = {
      tokens,
      merkleRoot,
      context,
      metadata: {
        itemCount: tokens.length,
        originalBytes: totalOriginalBytes,
        encryptedBytes: totalEncryptedBytes,
        compressionRatio:
          totalOriginalBytes > 0
            ? +(totalEncryptedBytes / totalOriginalBytes).toFixed(3)
            : 0,
        cipher: "AES-256-GCM",
        kdf: "HKDF-SHA256",
        integrity: "HMAC-SHA256-chain",
      },
    };

    const responseStr = JSON.stringify(responseBody);
    const bodyStr = JSON.stringify(body);

    // Record usage (fire-and-forget — don't block the response)
    recordUsage({
      userId: user.id,
      apiKeyId: user.apiKeyId,
      endpoint: "vault/encrypt",
      method: "POST",
      statusCode: 200,
      requestTokens: estimateTokens(bodyStr),
      responseTokens: estimateTokens(responseStr),
      bytesIn: Buffer.byteLength(bodyStr, "utf-8"),
      bytesOut: Buffer.byteLength(responseStr, "utf-8"),
      latencyMs: Date.now() - startTime,
      tier: billing.tier,
    }).catch((e) => console.error("[vault/encrypt] usage recording failed:", e));

    return NextResponse.json(responseBody, {
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (err: any) {
    console.error("[vault/encrypt]", err);
    return NextResponse.json(
      { error: err.message || "Encryption failed" },
      { status: 500 }
    );
  }
}
