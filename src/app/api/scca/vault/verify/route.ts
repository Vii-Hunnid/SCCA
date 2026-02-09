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
import { getServerSession } from "next-auth/next";
import { authOptions, getMasterKeyFromSession } from "@/lib/auth";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  computeMerkleRoot,
  verifyIntegrity,
} from "@/lib/crypto/engine";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const masterKey = getMasterKeyFromSession(session);
    const userKey = deriveUserKey(masterKey, session.user.masterKeySalt);
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

    return NextResponse.json({
      valid: rootValid && integrity.valid,
      merkleRootMatch: rootValid,
      computedRoot,
      tokenCount: tokens.length,
      errors: integrity.errors,
      lastValidSequence: integrity.lastValidSequence,
    });
  } catch (err: any) {
    console.error("[vault/verify]", err);
    return NextResponse.json(
      { error: err.message || "Verification failed" },
      { status: 500 }
    );
  }
}
