/**
 * SCCA Media Processor
 *
 * Implements the SCCA media pipeline from the specification:
 *   Input → Type Detection → Selective Compression → AES-256-GCM Encryption → SCCA Packet
 *
 * Key principles:
 * - Already-compressed formats (PNG, JPEG, MP4, MP3) are encrypt-only (no re-compression)
 * - Text-based formats (SVG, JSON, Markdown) get zlib compression before encryption
 * - All media gets AES-256-GCM authenticated encryption
 * - SCCA packet format: [SCCA magic][version][type][IV][authTag][checksum][encrypted data]
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";
import { promisify } from "util";
import { deflate, inflate } from "zlib";

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SCCAMediaResult {
  originalSize: number;
  compressedSize: number;
  encryptedSize: number;
  ratio: number; // < 1.0 = savings, > 1.0 = overhead
  checksum: string;
  mimeType: string;
  originalName: string;
  compressionMethod: string;
  encryptedBuffer: Buffer;
}

export interface SCCAMediaMeta {
  id: string;
  originalName: string;
  mimeType: string;
  originalSize: number;
  encryptedSize: number;
  compressionRatio: number;
  compressionMethod: string;
  checksum: string;
  category: MediaCategory;
  createdAt: string;
}

export type MediaCategory = "image" | "video" | "audio" | "document" | "other";

// SCCA Packet type codes
const TYPE_CODES: Record<string, number> = {
  "image/png": 0x01,
  "image/jpeg": 0x02,
  "image/webp": 0x03,
  "image/gif": 0x04,
  "image/svg+xml": 0x05,
  "image/heic": 0x06,
  "video/mp4": 0x10,
  "video/webm": 0x11,
  "video/quicktime": 0x12,
  "audio/mpeg": 0x20,
  "audio/wav": 0x21,
  "audio/ogg": 0x22,
  "audio/mp4": 0x23,
  "audio/flac": 0x24,
  "application/pdf": 0x30,
  "text/plain": 0x40,
  "text/markdown": 0x41,
  "application/json": 0x42,
};

// Formats that are already efficiently compressed — encrypt only, no compression
const ENCRYPT_ONLY_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/ogg",
  "audio/mp4",
  "audio/flac",
]);

// Max file sizes per category
const MAX_FILE_SIZES: Record<MediaCategory, number> = {
  image: 25 * 1024 * 1024, // 25 MB
  video: 100 * 1024 * 1024, // 100 MB
  audio: 50 * 1024 * 1024, // 50 MB
  document: 10 * 1024 * 1024, // 10 MB
  other: 10 * 1024 * 1024, // 10 MB
};

// Extension → MIME mapping
const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function getMediaCategory(mimeType: string): MediaCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/pdf" ||
    mimeType === "application/json"
  )
    return "document";
  return "other";
}

export function getMimeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  return EXT_TO_MIME[ext] || "application/octet-stream";
}

export function getSupportedMimeTypes(): string[] {
  return Object.values(EXT_TO_MIME);
}

export function isSupported(mimeType: string): boolean {
  return Object.values(EXT_TO_MIME).includes(mimeType);
}

export function getMaxFileSize(mimeType: string): number {
  return MAX_FILE_SIZES[getMediaCategory(mimeType)];
}

export function getAcceptString(): string {
  return Object.keys(EXT_TO_MIME).join(",");
}

// ═══════════════════════════════════════════════════════════════════════════
// SCCA MEDIA PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Encrypt (and optionally compress) a media file into an SCCA packet.
 *
 * SCCA Packet Format:
 *   [0..3]   "SCCA" magic bytes (4 bytes)
 *   [4]      Version (1 byte) = 0x02
 *   [5]      Type code (1 byte)
 *   [6..21]  IV / nonce (16 bytes)
 *   [22..37] AES-GCM auth tag (16 bytes)
 *   [38..69] SHA-256 checksum of original data (32 bytes)
 *   [70..]   Encrypted (optionally compressed) data
 */
export async function encryptMedia(
  data: Buffer,
  mimeType: string,
  key: Buffer
): Promise<{ sccaBuffer: Buffer; result: SCCAMediaResult; compressionMethod: string }> {
  const typeCode = TYPE_CODES[mimeType] || 0xff;
  const shouldCompress = !ENCRYPT_ONLY_TYPES.has(mimeType);

  // Selective compression
  let processedData = data;
  let compressionMethod = "none";

  if (shouldCompress) {
    processedData = await deflateAsync(data, { level: 9 });
    compressionMethod = "zlib-9";
  }

  // Checksum of original data
  const checksum = createHash("sha256").update(data).digest();

  // AES-256-GCM encryption
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(processedData),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Build SCCA packet
  const sccaBuffer = Buffer.concat([
    Buffer.from("SCCA"), // Magic (4 bytes)
    Buffer.from([0x02]), // Version (1 byte)
    Buffer.from([typeCode]), // Type code (1 byte)
    iv, // IV (16 bytes)
    authTag, // Auth tag (16 bytes)
    checksum, // SHA-256 (32 bytes)
    encrypted, // Encrypted data
  ]);

  return {
    sccaBuffer,
    compressionMethod,
    result: {
      originalSize: data.length,
      compressedSize: processedData.length,
      encryptedSize: sccaBuffer.length,
      ratio: sccaBuffer.length / data.length,
      checksum: checksum.toString("hex"),
      mimeType,
      originalName: "",
      compressionMethod,
      encryptedBuffer: sccaBuffer,
    },
  };
}

/**
 * Decrypt an SCCA media packet back to original data.
 */
export async function decryptMedia(
  sccaBuffer: Buffer,
  key: Buffer
): Promise<{ data: Buffer; mimeType: string; checksum: string }> {
  // Verify magic
  if (sccaBuffer.subarray(0, 4).toString() !== "SCCA") {
    throw new Error("Invalid SCCA media format");
  }

  const version = sccaBuffer[4];
  if (version !== 0x02) {
    throw new Error(`Unsupported SCCA version: ${version}`);
  }

  const typeCode = sccaBuffer[5];
  const iv = sccaBuffer.subarray(6, 22);
  const authTag = sccaBuffer.subarray(22, 38);
  const storedChecksum = sccaBuffer.subarray(38, 70).toString("hex");
  const encrypted = sccaBuffer.subarray(70);

  // Decrypt
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  // Determine mime type from type code
  const mimeType =
    Object.entries(TYPE_CODES).find(([, code]) => code === typeCode)?.[0] ||
    "application/octet-stream";

  // Decompress if needed
  const wasCompressed = !ENCRYPT_ONLY_TYPES.has(mimeType);
  let originalData = decrypted;
  if (wasCompressed) {
    originalData = await inflateAsync(decrypted);
  }

  // Verify integrity
  const computedChecksum = createHash("sha256")
    .update(originalData)
    .digest("hex");
  if (computedChecksum !== storedChecksum) {
    throw new Error("Integrity check failed — data corrupted or tampered");
  }

  return { data: originalData, mimeType, checksum: storedChecksum };
}

/**
 * Get format info from the spec for display purposes.
 */
export function getFormatInfo(mimeType: string): {
  compressionStrategy: string;
  expectedSavings: string;
  encryptOnly: boolean;
} {
  if (ENCRYPT_ONLY_TYPES.has(mimeType)) {
    return {
      compressionStrategy: "Encrypt only (already compressed)",
      expectedSavings: "~2-4% overhead",
      encryptOnly: true,
    };
  }

  const strategies: Record<string, { strategy: string; savings: string }> = {
    "image/svg+xml": { strategy: "Minify + zlib level 9", savings: "50-70%" },
    "image/gif": { strategy: "Frame optimization + zlib", savings: "15-30%" },
    "text/plain": { strategy: "zlib level 9", savings: "70-80%" },
    "text/markdown": { strategy: "zlib level 9", savings: "60-70%" },
    "application/json": { strategy: "zlib level 9", savings: "80-90%" },
    "application/pdf": { strategy: "zlib level 9", savings: "50-70%" },
  };

  const info = strategies[mimeType] || {
    strategy: "zlib level 9",
    savings: "varies",
  };
  return {
    compressionStrategy: info.strategy,
    expectedSavings: info.savings,
    encryptOnly: false,
  };
}
