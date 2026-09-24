/**
 * GET    /api/scca/media/[id] — Decrypt and return media file
 * DELETE /api/scca/media/[id] — Delete media attachment
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  deriveUserKey,
  deriveConversationKey,
} from "@/lib/crypto/engine";
import { decryptMedia, sanitizeFilename } from "@/lib/media/processor";

// Raster images are safe to render inline; anything else (notably SVG,
// which can contain scripts) must be downloaded as an attachment
const INLINE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attachment = await prisma.mediaAttachment.findFirst({
      where: { id, userId: auth.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Derive key
    const userKey = deriveUserKey(auth.masterKey, auth.masterKeySalt);
    const convKey = deriveConversationKey(userKey, attachment.conversationId);

    // Decrypt
    const sccaBuffer = Buffer.from(attachment.encryptedData, "base64");
    const { data, mimeType } = await decryptMedia(sccaBuffer, convKey);

    const dispositionType = INLINE_IMAGE_TYPES.has(mimeType)
      ? "inline"
      : "attachment";
    const safeName = sanitizeFilename(attachment.originalName);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${dispositionType}; filename="${safeName}"`,
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
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
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const attachment = await prisma.mediaAttachment.findFirst({
      where: { id, userId: auth.id },
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
