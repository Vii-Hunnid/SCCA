/**
 * NextAuth.js configuration for SCCA
 *
 * Features:
 * - Credential-based authentication (email/password)
 * - PBKDF2 for password hashing (Argon2id recommended for production)
 * - Master key derivation stored in JWT session
 * - User-isolated encryption keys
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { randomBytes, pbkdf2Sync, createHash } from "crypto";
import { promisify } from "util";
import { pbkdf2 as pbkdf2Callback } from "crypto";

const pbkdf2Async = promisify(pbkdf2Callback);

// ═════════════════════════════════════════════════════════════════════════════
// PASSWORD HASHING
// ═════════════════════════════════════════════════════════════════════════════

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2Async(password, salt, 100000, 32, "sha512");
  return `$pbkdf2$100000$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const parts = hash.split("$");
  if (parts[1] !== "pbkdf2") return false;

  const iterations = parseInt(parts[2]);
  const salt = Buffer.from(parts[3], "base64");
  const storedHash = parts[4];

  const computed = await pbkdf2Async(
    password,
    salt,
    iterations,
    32,
    "sha512"
  );
  return computed.toString("base64") === storedHash;
}

// ═════════════════════════════════════════════════════════════════════════════
// MASTER KEY DERIVATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Derive 32-byte master encryption key from user's salt.
 * Uses MASTER_KEY_SECRET env var + user salt for HKDF-like construction.
 */
export function deriveMasterKeyForUser(userSalt: string): Buffer {
  const serverSecret = process.env.MASTER_KEY_SECRET;
  if (!serverSecret) {
    throw new Error("MASTER_KEY_SECRET not configured");
  }

  const masterKey = Buffer.from(serverSecret, "base64");
  const salt = Buffer.from(userSalt, "base64");

  const prk = pbkdf2Sync(masterKey, salt, 10000, 32, "sha512");

  return createHash("sha256")
    .update(Buffer.concat([prk, Buffer.from("scca-user-master-key-v1")]))
    .digest();
}

export function generateSalt(): string {
  return randomBytes(16).toString("base64");
}

// ═════════════════════════════════════════════════════════════════════════════
// NEXTAUTH CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          // Timing attack protection: do dummy hash
          await verifyPassword(
            credentials.password,
            "$pbkdf2$100000$c2FsdA==$aGFzaA=="
          );
          return null;
        }

        const valid = await verifyPassword(
          credentials.password,
          user.passwordHash
        );
        if (!valid) {
          return null;
        }

        // Derive master key for encryption operations
        const masterKey = deriveMasterKeyForUser(user.masterKeySalt);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          masterKey: masterKey.toString("base64"),
          masterKeySalt: user.masterKeySalt,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.masterKey = (user as any).masterKey;
        token.masterKeySalt = (user as any).masterKeySalt;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.sub as string,
          email: token.email as string,
          name: token.name as string,
          masterKey: token.masterKey as string,
          masterKeySalt: token.masterKeySalt as string,
        };
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Extract the user's master key Buffer from a NextAuth session.
 */
export function getMasterKeyFromSession(session: any): Buffer {
  if (!session?.user?.masterKey) {
    throw new Error("Master key not available in session");
  }
  return Buffer.from(session.user.masterKey, "base64");
}
