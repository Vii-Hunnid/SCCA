/**
 * Seed script - creates a demo user for development
 *
 * Usage: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes, pbkdf2 } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);
const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2Async(password, salt, 100000, 32, "sha512");
  return `$pbkdf2$100000$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function main() {
  console.log("Seeding database...");

  const passwordHash = await hashPassword("password123");
  const masterKeySalt = randomBytes(16).toString("base64");

  const user = await prisma.user.upsert({
    where: { email: "demo@scca.dev" },
    update: {},
    create: {
      email: "demo@scca.dev",
      name: "Demo User",
      passwordHash,
      masterKeySalt,
    },
  });

  console.log(`Created demo user: ${user.email} (password: password123)`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
