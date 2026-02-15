/**
 * GET    /api/scca/media/[id] — Decrypt and return media file
 * DELETE /api/scca/media/[id] — Delete media attachment
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getMasterKeyFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deriveUserKey,
  deriveConversationKey,
} from "@/lib/crypto/engine";
import { decryptMedia } from "@/lib/media/processor";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attachment = await prisma.mediaAttachment.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Derive key
    const masterKey = getMasterKeyFromSession(session);
    const userKey = deriveUserKey(masterKey, session.user.masterKeySalt);
    const convKey = deriveConversationKey(userKey, attachment.conversationId);

    // Decrypt
    const sccaBuffer = Buffer.from(attachment.encryptedData, "base64");
    const { data, mimeType } = await decryptMedia(sccaBuffer, convKey);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${attachment.originalName}"`,
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: any) {
    console.error("[media/[id]/GET]", err);
    return NextResponse.json(
      { error: "Failed to decrypt media" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attachment = await prisma.mediaAttachment.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.mediaAttachment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[media/[id]/DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
