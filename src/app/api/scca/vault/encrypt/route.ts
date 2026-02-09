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

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({
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
    });
  } catch (err: any) {
    console.error("[vault/encrypt]", err);
    return NextResponse.json(
      { error: err.message || "Encryption failed" },
      { status: 500 }
    );
  }
}
