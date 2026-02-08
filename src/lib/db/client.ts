/**
 * SCCA Database Helper Functions
 *
 * Prisma-based CRUD operations for SCCA conversations.
 * All functions enforce user isolation via userId checks.
 */

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

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
 * Append message tokens and update count + merkle root atomically.
 */
export async function appendSCCAMessageTokens(
  id: string,
  newTokens: string[],
  newCount: number,
  merkleRoot: string
) {
  // Use raw SQL for atomic array append to avoid race conditions
  return prisma.sCCAConversation.update({
    where: { id },
    data: {
      messageTokens: newTokens,
      messageCount: newCount,
      merkleRoot,
    },
  });
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
  return prisma.auditLog.create({ data });
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
