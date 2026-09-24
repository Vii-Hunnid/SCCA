/**
 * Authenticated session resolution for API routes.
 *
 * requireUser() verifies the NextAuth session against the database and
 * returns the active user with a freshly derived master key. This gives us:
 * - Immediate revocation for soft-deleted users
 * - Session invalidation on password change (sessions issued before
 *   passwordChangedAt are rejected)
 * - No master key material in the JWT — the key is derived here per request
 *   from MASTER_KEY_SECRET + the user's salt
 */

import { getServerSession } from "next-auth/next";
import { authOptions, deriveMasterKeyForUser, generateSalt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface ActiveUser {
  id: string;
  email: string;
  name: string | null;
  masterKeySalt: string;
  masterKey: Buffer;
  /** Epoch seconds, for the password-change staleness check */
  sessionIssuedAt?: number;
  /** Set when authenticated via API key */
  authMethod: "session" | "api_key";
  apiKeyId?: string;
}

export async function loadActiveUser(
  userId: string,
  sessionIssuedAt?: number
): Promise<ActiveUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      masterKeySalt: true,
      passwordChangedAt: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) return null;

  // Reject sessions issued before the last password change
  if (
    user.passwordChangedAt &&
    sessionIssuedAt &&
    user.passwordChangedAt.getTime() > sessionIssuedAt * 1000
  ) {
    return null;
  }

  let { masterKeySalt } = user;
  if (!masterKeySalt) {
    // Legacy user without a salt — backfill so key derivation works
    masterKeySalt = (
      await prisma.user.update({
        where: { id: user.id },
        data: { masterKeySalt: generateSalt() },
        select: { masterKeySalt: true },
      })
    ).masterKeySalt;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    masterKeySalt,
    masterKey: deriveMasterKeyForUser(masterKeySalt),
    sessionIssuedAt,
    authMethod: "session",
  };
}

/**
 * Resolve the caller from the NextAuth session cookie, or null when the
 * session is missing, stale, or the user is deleted.
 */
export async function requireUser(): Promise<ActiveUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return loadActiveUser(
    session.user.id,
    session.user.sessionIssuedAt
  );
}
