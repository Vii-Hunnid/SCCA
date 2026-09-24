/**
 * Tests for src/lib/session.ts revocation rules:
 * - deleted users lose access immediately
 * - sessions issued before the last password change are rejected
 * - active users get a derived master key
 */

process.env.MASTER_KEY_SECRET = require("crypto")
  .randomBytes(32)
  .toString("base64");

const mockFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: jest.fn().mockResolvedValue({ masterKeySalt: "c2FsdA==" }),
    },
  },
}));

import { loadActiveUser } from "../../src/lib/session";

const baseUser = {
  id: "u1",
  email: "u@example.com",
  name: null,
  masterKeySalt: "c2FsdA==",
  passwordChangedAt: null as Date | null,
  deletedAt: null as Date | null,
};

describe("loadActiveUser", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns active user with derived master key", async () => {
    mockFindUnique.mockResolvedValue(baseUser);
    const user = await loadActiveUser("u1", 1_700_000_000);
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u1");
    expect(user!.masterKey).toBeInstanceOf(Buffer);
    expect(user!.masterKey.length).toBe(32);
  });

  test("rejects deleted users", async () => {
    mockFindUnique.mockResolvedValue({ ...baseUser, deletedAt: new Date() });
    const user = await loadActiveUser("u1", 1_700_000_000);
    expect(user).toBeNull();
  });

  test("rejects sessions issued before the password change", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseUser,
      passwordChangedAt: new Date("2026-01-01T00:00:00Z"),
    });
    // Session issued BEFORE the password change
    const stale = await loadActiveUser("u1", Math.floor(new Date("2025-12-01T00:00:00Z").getTime() / 1000));
    expect(stale).toBeNull();

    // Session issued AFTER the password change is fine
    const fresh = await loadActiveUser("u1", Math.floor(new Date("2026-02-01T00:00:00Z").getTime() / 1000));
    expect(fresh).not.toBeNull();
  });

  test("rejects unknown users", async () => {
    mockFindUnique.mockResolvedValue(null);
    const user = await loadActiveUser("nope", 1_700_000_000);
    expect(user).toBeNull();
  });
});
