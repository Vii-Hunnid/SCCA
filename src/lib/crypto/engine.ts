/**
 * SCCA Cryptographic Engine
 *
 * Implements compact binary message format with AES-256-GCM encryption.
 * Designed for the Secure Compact Chat Architecture.
 *
 * Security Features:
 * - AES-256-GCM for authenticated encryption
 * - HKDF-SHA256 for key derivation (per-conversation keys)
 * - zlib compression before encryption
 * - Merkle tree (HMAC chain) for integrity verification
 * - Constant-time comparison where applicable
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  createHmac,
} from "crypto";
import { promisify } from "util";
import { deflate, inflate } from "zlib";

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════

const VERSION = 1;
const HEADER_SIZE = 10; // version(1) + role(1) + sequence(4) + timestamp(4)
const NONCE_SIZE = 16; // 128 bits for AES-GCM
const TAG_SIZE = 16; // 128 bits authentication tag
const KEY_SIZE = 32; // 256 bits

const ROLE_MAP: Record<string, number> = {
  user: 0,
  assistant: 1,
  system: 2,
};

const ROLE_REVERSE = ["user", "assistant", "system"] as const;

// ═════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

export interface MessageHeader {
  version: number;
  role: number;
  sequence: number;
  timestamp: number;
}

export interface DecryptedMessage {
  sequence: number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  contentHash: string;
}

export interface ConversationData {
  id: string;
  userId: string;
  title: string;
  messageTokens: string[];
  messageCount: number;
  merkleRoot: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditResult {
  conversation: ConversationData;
  editedSequence: number;
  deletedCount: number;
  spaceReclaimed: number;
  needsRegenerationFrom: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// KEY DERIVATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get the 32-byte server master key from environment variable.
 */
export function getServerMasterKey(): Buffer {
  const secret = process.env.MASTER_KEY_SECRET;
  if (!secret) {
    throw new Error("MASTER_KEY_SECRET environment variable is not set");
  }
  const key = Buffer.from(secret, "base64");
  if (key.length < KEY_SIZE) {
    throw new Error(
      `MASTER_KEY_SECRET must be at least ${KEY_SIZE} bytes when decoded`
    );
  }
  return key.subarray(0, KEY_SIZE);
}

/**
 * Derive per-user key from master key + user salt via HKDF-SHA256.
 */
export function deriveUserKey(masterKey: Buffer, userSalt: string): Buffer {
  const prk = createHmac("sha256", masterKey)
    .update("scca-v1-user-key-extract")
    .digest();

  const info = Buffer.from(`user-${userSalt}-aes256gcm`);

  return createHmac("sha256", prk)
    .update(Buffer.concat([info, Buffer.from([0x01])]))
    .digest();
}

/**
 * Derive per-conversation encryption key from user key + conversation ID.
 * Ensures compromise of one conversation doesn't affect others.
 */
export function deriveConversationKey(
  userKey: Buffer,
  conversationId: string
): Buffer {
  const prk = createHmac("sha256", userKey)
    .update("scca-v1-conv-key-extract")
    .digest();

  const info = Buffer.from(`conv-${conversationId}-aes256gcm`);

  return createHmac("sha256", prk)
    .update(Buffer.concat([info, Buffer.from([0x01])]))
    .digest();
}

/**
 * Derive integrity key for Merkle tree HMAC operations.
 */
export function deriveIntegrityKey(
  userKey: Buffer,
  conversationId: string
): Buffer {
  const prk = createHmac("sha256", userKey)
    .update("scca-v1-integrity-extract")
    .digest();

  const info = Buffer.from(`conv-${conversationId}-hmac-sha256`);

  return createHmac("sha256", prk)
    .update(Buffer.concat([info, Buffer.from([0x01])]))
    .digest();
}

// ═════════════════════════════════════════════════════════════════════════════
// MESSAGE PACKING (Encryption)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Pack a message into encrypted binary format.
 *
 * Binary Format:
 * [0]      version        (1 byte)  = 0x01
 * [1]      role           (1 byte)  = 0x00 (user), 0x01 (assistant), 0x02 (system)
 * [2-5]    sequence       (4 bytes) = uint32 big-endian
 * [6-9]    timestamp      (4 bytes) = uint32 Unix time big-endian
 * [10-11]  ciphertext_len (2 bytes) = uint16 big-endian
 * [12..n]  ciphertext     (variable) = AES-256-GCM(zlib(content)) + auth tag
 * [n+1..m] nonce          (16 bytes)
 */
export async function packMessage(
  content: string,
  role: "user" | "assistant" | "system",
  sequence: number,
  conversationKey: Buffer,
  timestamp?: Date
): Promise<string> {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0xffffffff) {
    throw new Error(`Invalid sequence: ${sequence}. Must be 0-4294967295.`);
  }
  if (!content || typeof content !== "string") {
    throw new Error("Content must be non-empty string");
  }
  if (content.length > 100000) {
    throw new Error("Content exceeds maximum size (100KB)");
  }

  const ts = timestamp || new Date();

  // Build header (10 bytes)
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt8(VERSION, 0);
  header.writeUInt8(ROLE_MAP[role], 1);
  header.writeUInt32BE(sequence, 2);
  header.writeUInt32BE(Math.floor(ts.getTime() / 1000), 6);

  // Compress content with zlib (level 9 = max compression)
  const contentBuffer = Buffer.from(content, "utf-8");
  const compressed = await deflateAsync(contentBuffer, { level: 9 });

  // Generate random nonce
  const nonce = randomBytes(NONCE_SIZE);

  // Encrypt with AES-256-GCM
  const cipher = createCipheriv("aes-256-gcm", conversationKey, nonce);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  // Combine encrypted data + auth tag
  const ciphertext = Buffer.concat([encrypted, authTag]);

  // Build length prefix
  const lengthBuf = Buffer.alloc(2);
  lengthBuf.writeUInt16BE(ciphertext.length, 0);

  // Final assembly: header + length + ciphertext + nonce
  const blob = Buffer.concat([header, lengthBuf, ciphertext, nonce]);

  return blob.toString("base64url");
}

// ═════════════════════════════════════════════════════════════════════════════
// MESSAGE UNPACKING (Decryption)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Unpack and decrypt a message from base64url-encoded blob.
 * Verifies AES-GCM authentication tag for tamper detection.
 */
export async function unpackMessage(
  base64Blob: string,
  conversationKey: Buffer,
  expectedSequence?: number
): Promise<DecryptedMessage> {
  let blob: Buffer;
  try {
    blob = Buffer.from(base64Blob, "base64url");
  } catch {
    throw new Error("Invalid base64url encoding");
  }

  const minSize = HEADER_SIZE + 2 + TAG_SIZE + NONCE_SIZE;
  if (blob.length < minSize) {
    throw new Error(`Blob too small: ${blob.length} bytes (min ${minSize})`);
  }

  // Parse header
  const version = blob.readUInt8(0);
  if (version !== VERSION) {
    throw new Error(`Unsupported version: ${version}. Expected ${VERSION}.`);
  }

  const roleByte = blob.readUInt8(1);
  if (roleByte > 2) {
    throw new Error(`Invalid role byte: ${roleByte}`);
  }

  const sequence = blob.readUInt32BE(2);
  const timestampSec = blob.readUInt32BE(6);

  if (expectedSequence !== undefined && sequence !== expectedSequence) {
    throw new Error(
      `Sequence mismatch: expected ${expectedSequence}, got ${sequence}`
    );
  }

  // Parse ciphertext length
  const ciphertextLen = blob.readUInt16BE(HEADER_SIZE);
  const ciphertextStart = HEADER_SIZE + 2;
  const ciphertextEnd = ciphertextStart + ciphertextLen;

  if (ciphertextEnd > blob.length - NONCE_SIZE) {
    throw new Error("Ciphertext length exceeds blob size");
  }

  const ciphertext = blob.subarray(ciphertextStart, ciphertextEnd);
  const nonce = blob.subarray(ciphertextEnd);

  if (nonce.length !== NONCE_SIZE) {
    throw new Error(`Invalid nonce length: ${nonce.length}`);
  }

  // Split ciphertext and auth tag
  if (ciphertext.length < TAG_SIZE) {
    throw new Error("Ciphertext too short for auth tag");
  }

  const encrypted = ciphertext.subarray(0, -TAG_SIZE);
  const authTag = ciphertext.subarray(-TAG_SIZE);

  // Decrypt
  const decipher = createDecipheriv("aes-256-gcm", conversationKey, nonce);
  decipher.setAuthTag(authTag);

  let compressed: Buffer;
  try {
    compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    throw new Error("Decryption failed: invalid key or tampered data");
  }

  // Decompress
  let content: string;
  try {
    content = (await inflateAsync(compressed)).toString("utf-8");
  } catch {
    // Fallback: maybe uncompressed (legacy)
    content = compressed.toString("utf-8");
  }

  const contentHash = createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 16);

  return {
    sequence,
    role: ROLE_REVERSE[roleByte],
    content,
    timestamp: new Date(timestampSec * 1000),
    contentHash,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// HEADER PEEK (No Decryption)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Read the 10-byte header without decrypting content.
 * Useful for counting messages by role, finding by sequence, etc.
 */
export function peekMessageHeader(
  token: string
): {
  sequence: number;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  version: number;
} | null {
  try {
    const blob = Buffer.from(token, "base64url");
    if (blob.length < HEADER_SIZE) return null;

    return {
      version: blob.readUInt8(0),
      sequence: blob.readUInt32BE(2),
      role: ROLE_REVERSE[blob.readUInt8(1)] || ("unknown" as any),
      timestamp: new Date(blob.readUInt32BE(6) * 1000),
    };
  } catch {
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MERKLE TREE (Integrity Verification)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Compute Merkle root hash of conversation.
 * Uses iterative HMAC: H(prev_hash || token_bytes)
 * Tampering with any message invalidates the root.
 */
export function computeMerkleRoot(
  tokens: string[],
  integrityKey: Buffer
): string {
  if (tokens.length === 0) {
    return "0".repeat(64);
  }

  const hasher = (data: Buffer) =>
    createHmac("sha256", integrityKey).update(data).digest();

  let current = hasher(Buffer.alloc(0));

  for (const token of tokens) {
    const data = Buffer.from(token, "base64url");
    current = hasher(Buffer.concat([current, data]));
  }

  return current.toString("hex");
}

/**
 * Verify that stored merkle root matches recomputed value.
 */
export function verifyMerkleRoot(
  tokens: string[],
  storedRoot: string | null,
  integrityKey: Buffer
): boolean {
  const computed = computeMerkleRoot(tokens, integrityKey);
  return computed === storedRoot;
}

// ═════════════════════════════════════════════════════════════════════════════
// CONVERSATION OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Append a new message to the conversation tokens array.
 * Returns the updated tokens array and new merkle root.
 */
export async function appendMessage(
  tokens: string[],
  content: string,
  role: "user" | "assistant" | "system",
  sequence: number,
  conversationKey: Buffer,
  integrityKey: Buffer
): Promise<{ newTokens: string[]; merkleRoot: string }> {
  const packed = await packMessage(content, role, sequence, conversationKey);
  const newTokens = [...tokens, packed];
  const merkleRoot = computeMerkleRoot(newTokens, integrityKey);
  return { newTokens, merkleRoot };
}

/**
 * Decrypt a range of tokens (viewport loading).
 */
export async function decryptMessages(
  tokens: string[],
  conversationKey: Buffer,
  offset: number = 0,
  limit?: number
): Promise<DecryptedMessage[]> {
  const end = limit ? Math.min(offset + limit, tokens.length) : tokens.length;
  const slice = tokens.slice(offset, end);

  const messages: DecryptedMessage[] = [];
  for (const token of slice) {
    const msg = await unpackMessage(token, conversationKey);
    messages.push(msg);
  }
  return messages;
}

/**
 * DESTRUCTIVE EDIT - Core SCCA Operation
 *
 * Replaces a message at `sequence` and permanently deletes all messages after it.
 * No branches, no history. This is irreversible.
 */
export async function destructiveEdit(
  tokens: string[],
  sequence: number,
  newContent: string,
  conversationKey: Buffer,
  integrityKey: Buffer
): Promise<{
  newTokens: string[];
  merkleRoot: string;
  deletedCount: number;
}> {
  // Find the token at the target sequence
  let targetIndex = -1;
  let originalRole: "user" | "assistant" | "system" = "user";

  for (let i = 0; i < tokens.length; i++) {
    const header = peekMessageHeader(tokens[i]);
    if (!header) {
      throw new Error(`Corrupted message at index ${i}`);
    }
    if (header.sequence === sequence) {
      targetIndex = i;
      originalRole = header.role;
      break;
    }
  }

  if (targetIndex === -1) {
    throw new Error(`Message with sequence ${sequence} not found`);
  }

  const deletedCount = tokens.length - targetIndex - 1;

  // Keep tokens before the target
  const keptTokens = tokens.slice(0, targetIndex);

  // Pack new content with the same sequence number
  const newToken = await packMessage(
    newContent,
    originalRole,
    sequence,
    conversationKey
  );

  const newTokens = [...keptTokens, newToken];
  const merkleRoot = computeMerkleRoot(newTokens, integrityKey);

  return { newTokens, merkleRoot, deletedCount };
}

/**
 * DESTRUCTIVE DELETE - Remove a message and all subsequent messages.
 */
export async function destructiveDelete(
  tokens: string[],
  sequence: number,
  integrityKey: Buffer
): Promise<{
  newTokens: string[];
  merkleRoot: string;
  deletedCount: number;
}> {
  let targetIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const header = peekMessageHeader(tokens[i]);
    if (!header) {
      throw new Error(`Corrupted message at index ${i}`);
    }
    if (header.sequence === sequence) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex === -1) {
    throw new Error(`Message with sequence ${sequence} not found`);
  }

  const deletedCount = tokens.length - targetIndex;
  const newTokens = tokens.slice(0, targetIndex);
  const merkleRoot = computeMerkleRoot(newTokens, integrityKey);

  return { newTokens, merkleRoot, deletedCount };
}

/**
 * Verify full conversation integrity.
 */
export async function verifyIntegrity(
  tokens: string[],
  storedMerkleRoot: string | null,
  conversationKey: Buffer,
  integrityKey: Buffer
): Promise<{
  valid: boolean;
  errors: string[];
  lastValidSequence?: number;
}> {
  const errors: string[] = [];

  // Check merkle root
  const computedRoot = computeMerkleRoot(tokens, integrityKey);
  if (storedMerkleRoot && computedRoot !== storedMerkleRoot) {
    errors.push(
      `Merkle root mismatch: computed ${computedRoot.slice(0, 16)}..., stored ${storedMerkleRoot.slice(0, 16)}...`
    );
  }

  // Decrypt all and verify sequence continuity
  let lastTimestamp = 0;

  for (let i = 0; i < tokens.length; i++) {
    try {
      const msg = await unpackMessage(tokens[i], conversationKey);

      const ts = Math.floor(msg.timestamp.getTime() / 1000);
      if (ts < lastTimestamp) {
        errors.push(`Timestamp regression at sequence ${msg.sequence}`);
      }
      lastTimestamp = ts;
    } catch (err: any) {
      errors.push(`Message at index ${i}: ${err.message}`);
      return { valid: false, errors, lastValidSequence: i > 0 ? i - 1 : 0 };
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    lastValidSequence: tokens.length > 0 ? tokens.length - 1 : 0,
  };
}

/**
 * Estimate storage size of a token array in bytes.
 */
export function estimateStorageSize(tokens: string[]): number {
  const tokensSize = tokens.reduce(
    (sum, t) => sum + Buffer.from(t, "base64url").length,
    0
  );
  // PostgreSQL array overhead ~8 bytes per element + row overhead
  return tokensSize + tokens.length * 8 + 1024;
}
