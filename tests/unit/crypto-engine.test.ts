/**
 * Tests for SCCA Cryptographic Engine
 *
 * Covers:
 * - Key derivation (HKDF)
 * - Message packing/unpacking (AES-256-GCM)
 * - Header peek (without decryption)
 * - Merkle tree integrity
 * - Destructive edit/delete operations
 * - Edge cases and error handling
 */

import { randomBytes } from "crypto";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  packMessage,
  unpackMessage,
  peekMessageHeader,
  computeMerkleRoot,
  verifyMerkleRoot,
  appendMessage,
  decryptMessages,
  destructiveEdit,
  destructiveDelete,
  verifyIntegrity,
  estimateStorageSize,
} from "../../src/lib/crypto/engine";

// ── Test helpers ──

function randomKey(): Buffer {
  return randomBytes(32);
}

function randomId(): string {
  return randomBytes(16).toString("hex");
}

// ── Key Derivation ──

describe("Key Derivation", () => {
  const masterKey = randomKey();

  test("deriveUserKey produces 32-byte key", () => {
    const salt = randomBytes(16).toString("base64");
    const userKey = deriveUserKey(masterKey, salt);
    expect(userKey).toBeInstanceOf(Buffer);
    expect(userKey.length).toBe(32);
  });

  test("different salts produce different user keys", () => {
    const key1 = deriveUserKey(masterKey, "salt-a");
    const key2 = deriveUserKey(masterKey, "salt-b");
    expect(key1.equals(key2)).toBe(false);
  });

  test("deriveConversationKey is deterministic", () => {
    const userKey = deriveUserKey(masterKey, "user-salt");
    const convId = "conv-123";
    const key1 = deriveConversationKey(userKey, convId);
    const key2 = deriveConversationKey(userKey, convId);
    expect(key1.equals(key2)).toBe(true);
  });

  test("different conversations produce different keys", () => {
    const userKey = deriveUserKey(masterKey, "user-salt");
    const key1 = deriveConversationKey(userKey, "conv-1");
    const key2 = deriveConversationKey(userKey, "conv-2");
    expect(key1.equals(key2)).toBe(false);
  });

  test("integrity key differs from conversation key", () => {
    const userKey = deriveUserKey(masterKey, "user-salt");
    const convId = "conv-123";
    const convKey = deriveConversationKey(userKey, convId);
    const intKey = deriveIntegrityKey(userKey, convId);
    expect(convKey.equals(intKey)).toBe(false);
  });
});

// ── Message Packing/Unpacking ──

describe("Message Pack/Unpack", () => {
  const convKey = randomKey();

  test("pack and unpack a user message", async () => {
    const content = "Hello, world!";
    const token = await packMessage(content, "user", 0, convKey);

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    const msg = await unpackMessage(token, convKey);
    expect(msg.content).toBe(content);
    expect(msg.role).toBe("user");
    expect(msg.sequence).toBe(0);
  });

  test("pack and unpack an assistant message", async () => {
    const content = "I can help you with that.";
    const token = await packMessage(content, "assistant", 1, convKey);
    const msg = await unpackMessage(token, convKey);

    expect(msg.content).toBe(content);
    expect(msg.role).toBe("assistant");
    expect(msg.sequence).toBe(1);
  });

  test("pack and unpack a system message", async () => {
    const content = "You are a helpful assistant.";
    const token = await packMessage(content, "system", 0, convKey);
    const msg = await unpackMessage(token, convKey);

    expect(msg.content).toBe(content);
    expect(msg.role).toBe("system");
  });

  test("preserves unicode content", async () => {
    const content = "Hello 🌍! Привет мир. 你好世界。";
    const token = await packMessage(content, "user", 0, convKey);
    const msg = await unpackMessage(token, convKey);
    expect(msg.content).toBe(content);
  });

  test("preserves long content", async () => {
    const content = "a".repeat(10000);
    const token = await packMessage(content, "user", 0, convKey);
    const msg = await unpackMessage(token, convKey);
    expect(msg.content).toBe(content);
  });

  test("preserves multiline content", async () => {
    const content = "line1\nline2\nline3\n\ttabbed";
    const token = await packMessage(content, "user", 0, convKey);
    const msg = await unpackMessage(token, convKey);
    expect(msg.content).toBe(content);
  });

  test("timestamp round-trips correctly (to second precision)", async () => {
    const ts = new Date("2026-02-08T12:00:00Z");
    const token = await packMessage("test", "user", 0, convKey, ts);
    const msg = await unpackMessage(token, convKey);
    // Unix timestamp truncates to seconds
    expect(msg.timestamp.getTime()).toBe(
      Math.floor(ts.getTime() / 1000) * 1000
    );
  });

  test("wrong key fails decryption", async () => {
    const token = await packMessage("secret", "user", 0, convKey);
    const wrongKey = randomKey();
    await expect(unpackMessage(token, wrongKey)).rejects.toThrow(
      "Decryption failed"
    );
  });

  test("tampered token fails decryption", async () => {
    const token = await packMessage("secret", "user", 0, convKey);
    // Flip a byte in the middle
    const buf = Buffer.from(token, "base64url");
    buf[buf.length - 20] ^= 0xff;
    const tampered = buf.toString("base64url");
    await expect(unpackMessage(tampered, convKey)).rejects.toThrow();
  });

  test("expected sequence validation works", async () => {
    const token = await packMessage("test", "user", 5, convKey);
    await expect(unpackMessage(token, convKey, 3)).rejects.toThrow(
      "Sequence mismatch"
    );
    const msg = await unpackMessage(token, convKey, 5);
    expect(msg.sequence).toBe(5);
  });

  test("rejects empty content", async () => {
    await expect(packMessage("", "user", 0, convKey)).rejects.toThrow();
  });

  test("rejects content over 100KB", async () => {
    const big = "x".repeat(100001);
    await expect(packMessage(big, "user", 0, convKey)).rejects.toThrow(
      "exceeds maximum size"
    );
  });

  test("produces compact output (compression)", async () => {
    const content = "The quick brown fox ".repeat(50);
    const token = await packMessage(content, "user", 0, convKey);
    const tokenBytes = Buffer.from(token, "base64url").length;
    const rawBytes = Buffer.from(content, "utf-8").length;
    // Compressed + encrypted should be significantly smaller
    expect(tokenBytes).toBeLessThan(rawBytes);
  });
});

// ── Header Peek ──

describe("Header Peek", () => {
  const convKey = randomKey();

  test("reads header without decryption", async () => {
    const token = await packMessage("Hello", "user", 42, convKey);
    const header = peekMessageHeader(token);
    expect(header).not.toBeNull();
    expect(header!.sequence).toBe(42);
    expect(header!.role).toBe("user");
    expect(header!.version).toBe(1);
  });

  test("returns null for invalid token", () => {
    const header = peekMessageHeader("invalid");
    expect(header).toBeNull();
  });

  test("returns null for too-short token", () => {
    const header = peekMessageHeader(
      Buffer.alloc(5).toString("base64url")
    );
    expect(header).toBeNull();
  });
});

// ── Merkle Tree ──

describe("Merkle Tree", () => {
  const convKey = randomKey();
  const intKey = randomKey();

  test("empty tokens produce all-zeros root", () => {
    const root = computeMerkleRoot([], intKey);
    expect(root).toBe("0".repeat(64));
  });

  test("same tokens produce same root", async () => {
    const t1 = await packMessage("msg1", "user", 0, convKey);
    const t2 = await packMessage("msg2", "assistant", 1, convKey);
    const tokens = [t1, t2];

    const root1 = computeMerkleRoot(tokens, intKey);
    const root2 = computeMerkleRoot(tokens, intKey);
    expect(root1).toBe(root2);
  });

  test("different tokens produce different root", async () => {
    const t1 = await packMessage("msg1", "user", 0, convKey);
    const t2 = await packMessage("msg2", "assistant", 1, convKey);
    const t3 = await packMessage("msg3", "user", 2, convKey);

    const root1 = computeMerkleRoot([t1, t2], intKey);
    const root2 = computeMerkleRoot([t1, t3], intKey);
    expect(root1).not.toBe(root2);
  });

  test("verifyMerkleRoot detects match", async () => {
    const t1 = await packMessage("hello", "user", 0, convKey);
    const tokens = [t1];
    const root = computeMerkleRoot(tokens, intKey);
    expect(verifyMerkleRoot(tokens, root, intKey)).toBe(true);
  });

  test("verifyMerkleRoot detects tampering", async () => {
    const t1 = await packMessage("hello", "user", 0, convKey);
    const tokens = [t1];
    const root = computeMerkleRoot(tokens, intKey);
    expect(verifyMerkleRoot(tokens, "wrong_root", intKey)).toBe(false);
  });
});

// ── Conversation Operations ──

describe("appendMessage", () => {
  const convKey = randomKey();
  const intKey = randomKey();

  test("appends a message and computes merkle root", async () => {
    const result = await appendMessage(
      [],
      "Hello!",
      "user",
      0,
      convKey,
      intKey
    );
    expect(result.newTokens).toHaveLength(1);
    expect(result.merkleRoot).not.toBe("0".repeat(64));
  });

  test("builds a conversation incrementally", async () => {
    let tokens: string[] = [];
    let merkle: string;

    const r1 = await appendMessage(tokens, "Hi", "user", 0, convKey, intKey);
    tokens = r1.newTokens;

    const r2 = await appendMessage(
      tokens,
      "Hello! How can I help?",
      "assistant",
      1,
      convKey,
      intKey
    );
    tokens = r2.newTokens;

    expect(tokens).toHaveLength(2);

    // Decrypt and verify
    const msgs = await decryptMessages(tokens, convKey);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe("Hi");
    expect(msgs[0].role).toBe("user");
    expect(msgs[1].content).toBe("Hello! How can I help?");
    expect(msgs[1].role).toBe("assistant");
  });
});

describe("decryptMessages", () => {
  const convKey = randomKey();
  const intKey = randomKey();

  test("decrypts with offset and limit (viewport)", async () => {
    const tokens: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await appendMessage(
        tokens.length > 0 ? tokens : [],
        `Message ${i}`,
        i % 2 === 0 ? "user" : "assistant",
        i,
        convKey,
        intKey
      );
      tokens.push(r.newTokens[r.newTokens.length - 1]);
    }

    // Load only messages 2-3
    const viewport = await decryptMessages(tokens, convKey, 2, 2);
    expect(viewport).toHaveLength(2);
    expect(viewport[0].content).toBe("Message 2");
    expect(viewport[1].content).toBe("Message 3");
  });
});

// ── Destructive Edit ──

describe("destructiveEdit", () => {
  const convKey = randomKey();
  const intKey = randomKey();

  async function buildConversation(count: number): Promise<string[]> {
    let tokens: string[] = [];
    for (let i = 0; i < count; i++) {
      const r = await appendMessage(
        tokens,
        `Message ${i}`,
        i % 2 === 0 ? "user" : "assistant",
        i,
        convKey,
        intKey
      );
      tokens = r.newTokens;
    }
    return tokens;
  }

  test("replaces message and truncates all after", async () => {
    const tokens = await buildConversation(6);
    expect(tokens).toHaveLength(6);

    const result = await destructiveEdit(
      tokens,
      2, // Edit message at sequence 2
      "Edited content",
      convKey,
      intKey
    );

    expect(result.newTokens).toHaveLength(3); // 0, 1, edited-2
    expect(result.deletedCount).toBe(3); // 3, 4, 5 deleted

    // Verify the edited message
    const msgs = await decryptMessages(result.newTokens, convKey);
    expect(msgs[2].content).toBe("Edited content");
    expect(msgs[2].sequence).toBe(2);
    expect(msgs[2].role).toBe("user"); // Preserves original role
  });

  test("editing last message deletes nothing", async () => {
    const tokens = await buildConversation(3);
    const result = await destructiveEdit(
      tokens,
      2,
      "New last message",
      convKey,
      intKey
    );

    expect(result.newTokens).toHaveLength(3);
    expect(result.deletedCount).toBe(0);
  });

  test("merkle root changes after edit", async () => {
    const tokens = await buildConversation(4);
    const originalRoot = computeMerkleRoot(tokens, intKey);

    const result = await destructiveEdit(
      tokens,
      1,
      "Changed",
      convKey,
      intKey
    );

    expect(result.merkleRoot).not.toBe(originalRoot);
  });

  test("throws for non-existent sequence", async () => {
    const tokens = await buildConversation(3);
    await expect(
      destructiveEdit(tokens, 99, "text", convKey, intKey)
    ).rejects.toThrow("not found");
  });
});

// ── Destructive Delete ──

describe("destructiveDelete", () => {
  const convKey = randomKey();
  const intKey = randomKey();

  test("removes target and all after", async () => {
    let tokens: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await appendMessage(
        tokens,
        `Msg ${i}`,
        i % 2 === 0 ? "user" : "assistant",
        i,
        convKey,
        intKey
      );
      tokens = r.newTokens;
    }

    const result = await destructiveDelete(tokens, 2, intKey);
    expect(result.newTokens).toHaveLength(2); // Only 0, 1 remain
    expect(result.deletedCount).toBe(3); // 2, 3, 4 deleted
  });

  test("deleting first message clears everything", async () => {
    let tokens: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await appendMessage(
        tokens,
        `Msg ${i}`,
        "user",
        i,
        convKey,
        intKey
      );
      tokens = r.newTokens;
    }

    const result = await destructiveDelete(tokens, 0, intKey);
    expect(result.newTokens).toHaveLength(0);
    expect(result.merkleRoot).toBe("0".repeat(64));
  });
});

// ── Integrity Verification ──

describe("verifyIntegrity", () => {
  const convKey = randomKey();
  const intKey = randomKey();

  test("valid conversation passes integrity check", async () => {
    let tokens: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await appendMessage(
        tokens,
        `Msg ${i}`,
        i % 2 === 0 ? "user" : "assistant",
        i,
        convKey,
        intKey
      );
      tokens = r.newTokens;
    }

    const merkleRoot = computeMerkleRoot(tokens, intKey);
    const result = await verifyIntegrity(tokens, merkleRoot, convKey, intKey);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("tampered merkle root fails", async () => {
    const r = await appendMessage([], "Hello", "user", 0, convKey, intKey);
    const result = await verifyIntegrity(r.newTokens, "bad_root", convKey, intKey);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ── Storage Estimation ──

describe("estimateStorageSize", () => {
  test("estimates non-zero for tokens", async () => {
    const convKey = randomKey();
    const token = await packMessage("Hello", "user", 0, convKey);
    const size = estimateStorageSize([token]);
    expect(size).toBeGreaterThan(0);
  });

  test("empty array has only overhead", () => {
    const size = estimateStorageSize([]);
    expect(size).toBe(1024); // Row overhead only
  });
});
