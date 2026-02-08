export interface EncryptionKeys {
  userKey: Buffer;
  conversationKey: Buffer;
  integrityKey: Buffer;
}

export interface TokenMetrics {
  rawBytes: number;
  compressedBytes: number;
  encryptedBytes: number;
  compressionRatio: number;
}

export interface ConversationIntegrity {
  valid: boolean;
  errors: string[];
  lastValidSequence?: number;
  merkleRoot?: string;
}
