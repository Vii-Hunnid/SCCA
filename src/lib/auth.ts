/**
 * NextAuth.js configuration for SCCA
 *
 * Features:
 * - Credential-based authentication (email/password)
 * - GitHub and Google OAuth
 * - PBKDF2-SHA512 for password hashing (OWASP iterations, legacy formats verify)
 * - Master key derived per request — never stored in the JWT
 * - User-isolated encryption keys
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { createAuditLog } from "./db/client";
import { randomBytes, pbkdf2Sync, createHash, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pbkdf2 as pbkdf2Callback } from "crypto";

const pbkdf2Async = promisify(pbkdf2Callback);

// OWASP-recommended iteration count for PBKDF2-SHA512 (2023+). The count is
// stored in the hash string, so verification of older 100k hashes still works.
const PBKDF2_ITERATIONS = 210_000;

// ═════════════════════════════════════════════════════════════════════════════
// PASSWORD HASHING
// ═════════════════════════════════════════════════════════════════════════════

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2Async(password, salt, PBKDF2_ITERATIONS, 32, "sha512");
  return `$pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Current format: $pbkdf2$<iterations>$<salt_b64>$<hash_b64>
  if (hash.startsWith("$")) {
    const parts = hash.split("$");
    if (parts.length !== 5 || parts[1] !== "pbkdf2") return false;

    const iterations = parseInt(parts[2], 10);
    const salt = Buffer.from(parts[3], "base64");
    const storedHash = Buffer.from(parts[4], "base64");
    if (!iterations || !salt.length || !storedHash.length) return false;

    const computed = await pbkdf2Async(
      password,
      salt,
      iterations,
      storedHash.length,
      "sha512"
    );
    return safeEqual(computed, storedHash);
  }

  // Legacy format: <iterations>:<salt_hex>:<hash_hex>
  const [iters, saltHex, hashHex] = hash.split(":");
  if (!iters || !saltHex || !hashHex) return false;
  const stored = Buffer.from(hashHex, "hex");
  if (!stored.length) return false;
  const computed = await pbkdf2Async(
    password,
    Buffer.from(saltHex, "hex"),
    parseInt(iters, 10),
    stored.length,
    "sha512"
  );
  return safeEqual(computed, stored);
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
// OAUTH USER PROVISIONING
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Find or create a user for an OAuth login.
 * If the email already exists, link to the existing account.
 * If not, create a new user with a generated masterKeySalt (no password).
 */
async function findOrCreateOAuthUser(
  email: string,
  name: string | null | undefined,
  image: string | null | undefined,
  provider: string
) {
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    // Update name/image if not set, and mark provider
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name || name || null,
        image: image || existing.image || null,
        oauthProvider: existing.oauthProvider || provider,
        lastLoginAt: new Date(),
      },
    });
    return existing;
  }

  // Create new user for OAuth login
  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: name || null,
      image: image || null,
      oauthProvider: provider,
      masterKeySalt: generateSalt(),
      lastLoginAt: new Date(),
    },
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// NEXTAUTH CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

// Build providers list dynamically based on env vars
const providers: NextAuthOptions["providers"] = [
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
        where: { email: credentials.email.toLowerCase() },
      });

      if (!user || !user.passwordHash || user.deletedAt) {
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

      // Backfill master key salt for legacy users missing one
      let { masterKeySalt } = user;
      if (!masterKeySalt) {
        masterKeySalt = generateSalt();
        await prisma.user.update({
          where: { id: user.id },
          data: { masterKeySalt },
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      createAuditLog({
        userId: user.id,
        action: "login",
        details: { provider: "credentials" },
      }).catch(() => {});

      // The master encryption key is intentionally NOT returned here — it
      // must never ride in the JWT. It is derived per request from
      // MASTER_KEY_SECRET + the user's salt in src/lib/session.ts.
      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  }),
];

// Add GitHub provider if configured
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      issuer: "https://github.com/login/oauth",
    })
  );
}

// Add Google provider if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,

  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, find or create the user in our DB
      if (account && account.provider !== "credentials") {
        if (!user.email) return false;

        try {
          await findOrCreateOAuthUser(
            user.email,
            user.name,
            user.image ?? null,
            account.provider
          );
        } catch (error) {
          console.error("OAuth user provisioning failed:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // Credentials login: user object present
      if (user && (!account || account.provider === "credentials")) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // OAuth login: look up user in DB to bind the token to our user record
      if (account && account.provider !== "credentials" && user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
          });

          if (dbUser && !dbUser.deletedAt) {
            token.sub = dbUser.id;
            token.email = dbUser.email;
            token.name = dbUser.name;
          }
        } catch (error) {
          console.error("OAuth JWT callback error:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.sub as string,
          email: token.email as string,
          name: token.name as string,
          // Epoch seconds — src/lib/session.ts rejects sessions issued
          // before the user's last password change
          sessionIssuedAt: token.iat as number | undefined,
        };
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
