import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/scca/account/sessions/[id]
 * Revoke a specific session
 */
export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;

    // Verify the session belongs to the current user
    const targetSession = await prisma.session.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!targetSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Don't allow revoking the current session through this endpoint
    if (targetSession.token === (session as any).sessionToken) {
      return NextResponse.json(
        { error: 'Cannot revoke current session. Use Sign Out instead.' },
        { status: 400 }
      );
    }

    // Delete the session
    await prisma.session.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Session revoke error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
