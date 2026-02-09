/**
 * SCCA API Key Authentication
 *
 * Supports two auth methods:
 * 1. Bearer token: Authorization: Bearer scca_k_<hex>
 * 2. NextAuth session cookie (fallback)
 *
 * API keys are hashed with SHA-256 before storage.
 * The raw key is only shown once at creation time.
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { authOptions, deriveMasterKeyForUser } from "@/lib/auth";

const API_KEY_PREFIX = "scca_k_";

export interface AuthenticatedUser {
  id: string;
  email: string;
  masterKeySalt: string;
  masterKey: Buffer;
  authMethod: "api_key" | "session";
  apiKeyId?: string;
}

/**
 * Authenticate a request via API key or session.
 * Returns the authenticated user with derived master key, or null.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  // 1. Check for Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith(API_KEY_PREFIX)) {
      return authenticateApiKey(token);
    }
  }

  // 2. Fallback to NextAuth session
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session?.user?.masterKey) {
    return {
      id: session.user.id,
      email: session.user.email || "",
      masterKeySalt: session.user.masterKeySalt || "",
      masterKey: Buffer.from(session.user.masterKey, "base64"),
      authMethod: "session",
    };
  }

  return null;
}

/**
 * Authenticate via API key.
 * Looks up the key hash, resolves the user, derives master key.
 */
async function authenticateApiKey(
  rawKey: string
): Promise<AuthenticatedUser | null> {
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { select: { id: true, email: true, masterKeySalt: true } } },
  });

  if (!apiKey) return null;

  // Check if revoked
  if (apiKey.revokedAt) return null;

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used (fire-and-forget)
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  // Derive master key from user's salt
  const masterKey = deriveMasterKeyForUser(apiKey.user.masterKeySalt);

  return {
    id: apiKey.user.id,
    email: apiKey.user.email,
    masterKeySalt: apiKey.user.masterKeySalt,
    masterKey,
    authMethod: "api_key",
    apiKeyId: apiKey.id,
  };
}

/**
 * Generate a new API key.
 * Returns the raw key (only shown once) and the hash for storage.
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(32).toString("hex"); // 64 hex chars
  const rawKey = `${API_KEY_PREFIX}${randomPart}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12) + "...";

  return { rawKey, keyHash, keyPrefix };
}

/**
 * SHA-256 hash of an API key for secure storage.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
