/**
 * SCCA Database Helper Functions
 *
 * Prisma-based CRUD operations for SCCA conversations.
 * Reads enforce user isolation via userId checks; mutating helpers take an
 * explicit expectedCount for optimistic concurrency — callers must verify
 * ownership before calling them.
 */

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import {
  packMessage,
  computeNextMerkleRoot,
} from "@/lib/crypto/engine";

// ═════════════════════════════════════════════════════════════════════════════
// CONVERSATION OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

export async function createSCCAConversation(
  userId: string,
  title?: string,
  model?: string
) {
  return prisma.sCCAConversation.create({
    data: {
      userId,
      title: title || "New Chat",
      model: model || process.env.DEFAULT_MODEL || "llama-3.3-70b-versatile",
      messageTokens: [],
      messageCount: 0,
    },
  });
}

export async function getSCCAConversationsByUser(userId: string) {
  return prisma.sCCAConversation.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      title: true,
      model: true,
      messageCount: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSCCAConversationById(id: string, userId: string) {
  return prisma.sCCAConversation.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

export async function updateSCCAConversation(
  id: string,
  data: {
    title?: string;
    model?: string;
    messageTokens?: string[];
    messageCount?: number;
    merkleRoot?: string | null;
  }
) {
  return prisma.sCCAConversation.update({
    where: { id },
    data,
  });
}

export async function deleteSCCAConversation(id: string, userId: string) {
  return prisma.sCCAConversation.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: userId,
    },
  });
}

/**
 * Atomically append a single message token.
 *
 * Uses optimistic concurrency: the update only lands if messageCount still
 * equals expectedCount, so two concurrent sends can never clobber each
 * other. Returns false on conflict — the caller re-reads and retries.
 */
export async function appendSCCAMessageTokenAtomic(
  id: string,
  token: string,
  expectedCount: number,
  merkleRoot: string
): Promise<boolean> {
  const result = await prisma.sCCAConversation.updateMany({
    where: { id, messageCount: expectedCount },
    data: {
      messageTokens: { push: token },
      messageCount: { increment: 1 },
      merkleRoot,
    },
  });
  return result.count === 1;
}

/**
 * Replace the token array (destructive edit/delete) with optimistic
 * concurrency on the expected message count. Returns false on conflict.
 */
export async function replaceSCCAMessageTokens(
  id: string,
  tokens: string[],
  newCount: number,
  merkleRoot: string,
  expectedCount: number
): Promise<boolean> {
  const result = await prisma.sCCAConversation.updateMany({
    where: { id, messageCount: expectedCount },
    data: {
      messageTokens: tokens,
      messageCount: newCount,
      merkleRoot,
    },
  });
  return result.count === 1;
}

/**
 * Pack and atomically append a single message. Re-reads and retries once on
 * optimistic-concurrency conflict. Returns the assigned sequence + new
 * merkle root, or null when the conversation vanished or conflicts twice.
 */
export async function appendMessageAtomically(
  id: string,
  content: string,
  role: "user" | "assistant" | "system",
  convKey: Buffer,
  intKey: Buffer
): Promise<{ sequence: number; root: string } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const conv = await prisma.sCCAConversation.findFirst({
      where: { id },
      select: { messageCount: true, merkleRoot: true },
    });
    if (!conv) return null;

    const token = await packMessage(content, role, conv.messageCount, convKey);
    const root = computeNextMerkleRoot(conv.merkleRoot, token, intKey);

    const ok = await appendSCCAMessageTokenAtomic(
      id,
      token,
      conv.messageCount,
      root
    );
    if (ok) return { sequence: conv.messageCount, root };
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═════════════════════════════════════════════════════════════════════════════

export async function createAuditLog(data: {
  userId: string;
  conversationId?: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      conversationId: data.conversationId,
      action: data.action,
      details: data.details as any,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// USER HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ensure a user has a master key salt. Generates one if missing.
 */
export async function ensureUserMasterKeySalt(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { masterKeySalt: true },
  });

  if (user?.masterKeySalt) {
    return user.masterKeySalt;
  }

  const salt = randomBytes(16).toString("base64");
  await prisma.user.update({
    where: { id: userId },
    data: { masterKeySalt: salt },
  });
  return salt;
}
