/**
 * POST /api/scca/vault/verify
 *
 * Verify the integrity of a set of SCCA tokens using the Merkle-HMAC chain.
 * Detects any tampering, reordering, or modification of encrypted data.
 *
 * Request:
 *   { tokens: string[], merkleRoot: string, context: string }
 *
 * Response:
 *   { valid: boolean, computedRoot: string, errors: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-key-auth";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  computeMerkleRoot,
  verifyIntegrity,
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
    const { tokens, merkleRoot, context } = body;

    if (!context || typeof context !== "string") {
      return NextResponse.json(
        {
          error:
            "Missing 'context' — must match the context used during encryption",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(tokens)) {
      return NextResponse.json(
        { error: "Missing 'tokens' — array of encrypted SCCA tokens" },
        { status: 400 }
      );
    }

    if (!merkleRoot || typeof merkleRoot !== "string") {
      return NextResponse.json(
        {
          error:
            "Missing 'merkleRoot' — the root hash returned from /vault/encrypt",
        },
        { status: 400 }
      );
    }

    if (tokens.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 tokens per verification request" },
        { status: 400 }
      );
    }

    // Derive keys
    const userKey = deriveUserKey(user.masterKey, user.masterKeySalt);
    const encryptionKey = deriveConversationKey(userKey, context);
    const integrityKey = deriveIntegrityKey(userKey, context);

    // Compute and compare Merkle root
    const computedRoot = computeMerkleRoot(tokens, integrityKey);
    const rootValid = computedRoot === merkleRoot;

    // Full integrity verification (decrypts each token, checks sequences)
    const integrity = await verifyIntegrity(
      tokens,
      merkleRoot,
      encryptionKey,
      integrityKey
    );

    const responseBody = {
      valid: rootValid && integrity.valid,
      merkleRootMatch: rootValid,
      computedRoot,
      tokenCount: tokens.length,
      errors: integrity.errors,
      lastValidSequence: integrity.lastValidSequence,
    };

    const responseStr = JSON.stringify(responseBody);
    const bodyStr = JSON.stringify(body);

    // Record usage (fire-and-forget)
    recordUsage({
      userId: user.id,
      apiKeyId: user.apiKeyId,
      endpoint: "vault/verify",
      method: "POST",
      statusCode: 200,
      requestTokens: estimateTokens(bodyStr),
      responseTokens: estimateTokens(responseStr),
      bytesIn: Buffer.byteLength(bodyStr, "utf-8"),
      bytesOut: Buffer.byteLength(responseStr, "utf-8"),
      latencyMs: Date.now() - startTime,
      tier: billing.tier,
    }).catch((e) => console.error("[vault/verify] usage recording failed:", e));

    return NextResponse.json(responseBody, {
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (err: any) {
    console.error("[vault/verify]", err);
    return NextResponse.json(
      { error: err.message || "Verification failed" },
      { status: 500 }
    );
  }
}
