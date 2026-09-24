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

import { createCipheriv, randomBytes } from "crypto";
import { deflate } from "zlib";
import { promisify } from "util";
import {
  deriveUserKey,
  deriveConversationKey,
  deriveIntegrityKey,
  packMessage,
  unpackMessage,
  peekMessageHeader,
  computeMerkleRoot,
  computeNextMerkleRoot,
  verifyMerkleRoot,
  appendMessage,
  decryptMessages,
  destructiveEdit,
  destructiveDelete,
  verifyIntegrity,
  estimateStorageSize,
} from "../../src/lib/crypto/engine";

const deflateAsync = promisify(deflate);

/**
 * Build a legacy format-v1 packet (uint16 ciphertext length) exactly as
 * engine.ts did before the v2 format, to prove v1 data stays readable.
 */
async function packMessageV1(
  content: string,
  role: "user" | "assistant" | "system",
  sequence: number,
  conversationKey: Buffer
): Promise<string> {
  const ROLE_MAP = { user: 0, assistant: 1, system: 2 };
  const header = Buffer.alloc(10);
  header.writeUInt8(1, 0);
  header.writeUInt8(ROLE_MAP[role], 1);
  header.writeUInt32BE(sequence, 2);
  header.writeUInt32BE(Math.floor(Date.now() / 1000), 6);

  const compressed = await deflateAsync(Buffer.from(content, "utf-8"), { level: 9 });
  const nonce = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", conversationKey, nonce);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const ciphertext = Buffer.concat([encrypted, cipher.getAuthTag()]);

  const lengthBuf = Buffer.alloc(2);
  lengthBuf.writeUInt16BE(ciphertext.length, 0);

  return Buffer.concat([header, lengthBuf, ciphertext, nonce]).toString("base64url");
}

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
    expect(header!.version).toBe(2);
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


// ── Format v2 (uint32 length) & legacy v1 compatibility ──

describe("packet format versions", () => {
  const convKey = randomKey();

  test("packMessage writes format version 2", async () => {
    const token = await packMessage("Hello", "user", 0, convKey);
    const header = peekMessageHeader(token);
    expect(header?.version).toBe(2);
  });

  test("round-trips large incompressible content without overflow", async () => {
    // Random data barely compresses — ciphertext (~80KB+tag) far exceeds the
    // old uint16 length field (~65KB max) and would have thrown a RangeError.
    const bigContent = randomBytes(60 * 1024).toString("base64");
    const token = await packMessage(bigContent, "user", 7, convKey);
    const msg = await unpackMessage(token, convKey, 7);
    expect(msg.content).toBe(bigContent);
    expect(msg.sequence).toBe(7);
  });

  test("reads legacy v1 packets (uint16 length)", async () => {
    const content = "legacy format message";
    const token = await packMessageV1(content, "assistant", 3, convKey);
    expect(peekMessageHeader(token)?.version).toBe(1);

    const msg = await unpackMessage(token, convKey, 3);
    expect(msg.content).toBe(content);
    expect(msg.role).toBe("assistant");
    expect(msg.sequence).toBe(3);
  });

  test("rejects unsupported versions", async () => {
    const token = await packMessage("Hello", "user", 0, convKey);
    const blob = Buffer.from(token, "base64url");
    blob.writeUInt8(99, 0);
    await expect(
      unpackMessage(blob.toString("base64url"), convKey)
    ).rejects.toThrow(/Unsupported version/);
  });
});

// ── Incremental Merkle root ──

describe("computeNextMerkleRoot", () => {
  const intKey = randomKey();

  test("matches full recompute across many appends", async () => {
    const tokens: string[] = [];
    let incremental: string | null = null;

    for (let i = 0; i < 10; i++) {
      const packed = await packMessage(`message ${i}`, i % 2 ? "assistant" : "user", i, randomKey());
      tokens.push(packed);
      incremental = computeNextMerkleRoot(incremental, packed, intKey);
    }

    expect(incremental).toBe(computeMerkleRoot(tokens, intKey));
  });

  test("appendMessage with prevRoot matches full recompute of its own tokens", async () => {
    const convKey = randomKey();
    const first = await appendMessage([], "one", "user", 0, convKey, intKey);
    const second = await appendMessage(
      first.newTokens, "two", "assistant", 1, convKey, intKey, first.merkleRoot
    );
    // The root returned when passing prevRoot must equal a full recompute
    // over exactly the tokens it returned.
    expect(second.merkleRoot).toBe(
      computeMerkleRoot(second.newTokens, intKey)
    );
  });

  test("first append from null root matches two-message chain", async () => {
    const convKey = randomKey();
    const packed = await packMessage("only", "user", 0, convKey);
    expect(computeNextMerkleRoot(null, packed, intKey)).toBe(
      computeMerkleRoot([packed], intKey)
    );
  });
});
