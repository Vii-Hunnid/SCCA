/**
 * POST /api/scca/media — Upload and encrypt media file
 * GET  /api/scca/media?conversationId=xxx — List media for a conversation
 *
 * Upload flow:
 *   1. Authenticate user
 *   2. Validate file type & size
 *   3. Derive conversation encryption key
 *   4. Process through SCCA media pipeline (compress → encrypt)
 *   5. Store encrypted data + metadata in DB
 *   6. Return media metadata for chat integration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getMasterKeyFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deriveUserKey,
  deriveConversationKey,
} from "@/lib/crypto/engine";
import {
  encryptMedia,
  decryptMedia,
  getMimeFromFilename,
  getMediaCategory,
  getMaxFileSize,
  isSupported,
} from "@/lib/media/processor";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    const messageSequence = formData.get("messageSequence") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId required" },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    const conversation = await prisma.sCCAConversation.findFirst({
      where: { id: conversationId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Detect and validate mime type
    const mimeType = file.type || getMimeFromFilename(file.name);
    if (!isSupported(mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${mimeType}`,
          supported: "png, jpg, webp, gif, svg, mp4, webm, mp3, wav, pdf, txt, md, json",
        },
        { status: 400 }
      );
    }

    // Validate size
    const maxSize = getMaxFileSize(mimeType);
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB for ${getMediaCategory(mimeType)}`,
        },
        { status: 400 }
      );
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Derive conversation encryption key
    const masterKey = getMasterKeyFromSession(session);
    const userKey = deriveUserKey(masterKey, session.user.masterKeySalt);
    const convKey = deriveConversationKey(userKey, conversationId);

    // Process through SCCA media pipeline
    const { sccaBuffer, result, compressionMethod } = await encryptMedia(
      buffer,
      mimeType,
      convKey
    );

    // Store in database
    const attachment = await prisma.mediaAttachment.create({
      data: {
        conversationId,
        userId: session.user.id,
        originalName: file.name,
        mimeType,
        originalSize: buffer.length,
        encryptedSize: sccaBuffer.length,
        compressionRatio: result.ratio,
        compressionMethod,
        checksum: result.checksum,
        category: getMediaCategory(mimeType),
        encryptedData: sccaBuffer.toString("base64"),
        messageSequence: messageSequence ? parseInt(messageSequence) : null,
      },
    });

    return NextResponse.json({
      id: attachment.id,
      originalName: file.name,
      mimeType,
      originalSize: buffer.length,
      encryptedSize: sccaBuffer.length,
      compressionRatio: result.ratio,
      compressionMethod,
      category: getMediaCategory(mimeType),
      checksum: result.checksum,
    });
  } catch (err: any) {
    console.error("[media/POST]", err);
    return NextResponse.json(
      { error: "Failed to process media" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const conversation = await prisma.sCCAConversation.findFirst({
      where: { id: conversationId, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const attachments = await prisma.mediaAttachment.findMany({
      where: { conversationId, userId: session.user.id },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        originalSize: true,
        encryptedSize: true,
        compressionRatio: true,
        compressionMethod: true,
        checksum: true,
        category: true,
        messageSequence: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute totals for metrics
    const totals = attachments.reduce(
      (acc, a) => ({
        originalBytes: acc.originalBytes + a.originalSize,
        encryptedBytes: acc.encryptedBytes + a.encryptedSize,
        count: acc.count + 1,
      }),
      { originalBytes: 0, encryptedBytes: 0, count: 0 }
    );

    return NextResponse.json({
      attachments,
      totals: {
        ...totals,
        avgCompressionRatio:
          totals.originalBytes > 0
            ? totals.encryptedBytes / totals.originalBytes
            : 1,
      },
    });
  } catch (err: any) {
    console.error("[media/GET]", err);
    return NextResponse.json(
      { error: "Failed to list media" },
      { status: 500 }
    );
  }
}
