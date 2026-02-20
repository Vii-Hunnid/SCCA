import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * POST /api/scca/account/password
 * Change user password
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
        oauthProvider: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // OAuth users can't change password here
    if (user.oauthProvider) {
      return NextResponse.json(
        { error: 'OAuth users must change password through their provider' },
        { status: 400 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'No password set for this account' },
        { status: 400 }
      );
    }

    // Parse stored hash (format: iterations:salt:hash)
    const [storedIter, storedSalt, storedHash] = user.passwordHash.split(':');
    if (!storedIter || !storedSalt || !storedHash) {
      return NextResponse.json(
        { error: 'Invalid password format' },
        { status: 500 }
      );
    }

    // Verify current password
    const currentKey = pbkdf2Sync(
      currentPassword,
      Buffer.from(storedSalt, 'hex'),
      parseInt(storedIter, 10),
      KEY_LENGTH,
      'sha512'
    );

    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    if (!timingSafeEqual(currentKey, storedHashBuffer)) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Generate new salt and hash
    const newSalt = randomBytes(SALT_LENGTH);
    const newKey = pbkdf2Sync(
      newPassword,
      newSalt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );

    const newPasswordHash = `${PBKDF2_ITERATIONS}:${newSalt.toString('hex')}:${newKey.toString('hex')}`;

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
}
