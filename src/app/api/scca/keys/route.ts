/**
 * GET  /api/scca/keys — List user's API keys (no secrets exposed)
 * POST /api/scca/keys — Generate a new API key (raw key returned once)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: session.user.id, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keys });
  } catch (err: any) {
    console.error("[keys/GET]", err);
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, expiresInDays } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing 'name' — a label for this API key" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or fewer" },
        { status: 400 }
      );
    }

    // Limit keys per user
    const existingCount = await prisma.apiKey.count({
      where: { userId: session.user.id, revokedAt: null },
    });

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 active API keys per account" },
        { status: 400 }
      );
    }

    // Generate the key
    const { rawKey, keyHash, keyPrefix } = generateApiKey();

    // Calculate expiry
    let expiresAt: Date | null = null;
    if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Store in DB
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        keyHash,
        keyPrefix,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned ONCE at creation
        keyPrefix: apiKey.keyPrefix,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        warning:
          "Save this key now. It will not be shown again.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[keys/POST]", err);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
