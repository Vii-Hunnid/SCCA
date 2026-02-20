import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pbkdf2Sync, randomBytes } from 'crypto';

/**
 * GET /api/scca/account
 * Get current user's profile and sessions
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        oauthProvider: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        masterKeySalt: true,
        billingAccount: {
          select: {
            tier: true,
            monthlySpendMicro: true,
            totalSpendMicro: true,
          },
        },
        sessions: {
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            token: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Format billing account
    const billingAccount = user.billingAccount ? {
      tier: user.billingAccount.tier,
      monthlySpendDisplay: `$${(Number(user.billingAccount.monthlySpendMicro) / 1_000_000).toFixed(2)}`,
      totalSpendDisplay: `$${(Number(user.billingAccount.totalSpendMicro) / 1_000_000).toFixed(2)}`,
    } : null;

    // Mark current session
    const sessions = user.sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      isCurrent: s.token === (session as any).sessionToken,
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        oauthProvider: user.oauthProvider,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        masterKeySalt: user.masterKeySalt,
        billingAccount,
      },
      sessions,
    });
  } catch (error: any) {
    console.error('Account GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/scca/account
 * Update user profile (name only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
      return NextResponse.json(
        { error: 'Invalid name. Must be a string under 100 characters.' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name || null },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      name: updatedUser.name,
    });
  } catch (error: any) {
    console.error('Account PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scca/account
 * Delete user account and all associated data
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user (cascades to all related data via Prisma relations)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Account DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
