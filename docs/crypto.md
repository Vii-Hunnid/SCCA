# SCCA Cryptographic Engine

> Implementation reference for `lib/crypto/engine.ts`

## Overview

The engine provides server-side encryption and decryption of chat messages using a hierarchical key system and compact binary format.

## Key Hierarchy

```
MASTER_KEY_SECRET (env var, 32 bytes)
    │
    ├── HKDF("user-key", masterKey + userSalt) → User Key
    │       │
    │       ├── HKDF("conv-key", userKey + conversationId) → Conversation Key
    │       │       └── Used for AES-256-GCM encrypt/decrypt
    │       │
    │       └── HKDF("integrity", userKey + conversationId) → Integrity Key
    │               └── Used for Merkle tree HMAC
    │
    └── Never stored. Only in server memory.
```

## Key Functions

### `getServerMasterKey(): Buffer`
Returns the 32-byte master key from `MASTER_KEY_SECRET` env var.

### `deriveUserKey(masterKey, userSalt): Buffer`
HKDF-SHA256: `masterKey` + `userSalt` → 32-byte user key.

### `deriveConversationKey(userKey, conversationId): Buffer`
HKDF-SHA256: `userKey` + `conversationId` → 32-byte conversation key.

### `deriveIntegrityKey(userKey, conversationId): Buffer`
HKDF-SHA256: `userKey` + `conversationId` + "integrity" context → 32-byte key.

## Binary Message Format

### `packMessage(content, role, sequence, conversationKey): string`

```
Input:  "Hello world" (user, seq=0)
Output: base64 string

Binary layout:
┌────────────────────────────────────────────────┐
│ Header (10 bytes)                              │
│  [version:1][role:1][sequence:2][timestamp:4]  │
│  [flags:2]                                     │
├────────────────────────────────────────────────┤
│ Nonce (12 bytes) - random, never reused        │
├────────────────────────────────────────────────┤
│ Ciphertext (variable)                          │
│  AES-256-GCM(conversationKey, nonce,           │
│    zlib.deflate(content))                      │
├────────────────────────────────────────────────┤
│ Auth Tag (16 bytes) - GCM authentication       │
└────────────────────────────────────────────────┘
```

### `unpackMessage(token, conversationKey): DecryptedMessage`

Reverses `packMessage`: base64 → parse header → decrypt → decompress.

Returns:
```typescript
{
  role: "user" | "assistant" | "system",
  content: string,
  sequence: number,
  timestamp: number,
  version: number
}
```

### `peekMessageHeader(token): MessageHeader`

Reads the 10-byte header **without decrypting**. Useful for:
- Counting messages by role
- Finding messages by sequence number
- Building message timeline without decryption cost

## Merkle Tree

### `computeMerkleRoot(tokens, integrityKey): string`

Iteratively hashes each token with the previous hash using HMAC-SHA256:

```
hash[0] = HMAC(integrityKey, token[0])
hash[1] = HMAC(integrityKey, hash[0] + token[1])
hash[2] = HMAC(integrityKey, hash[1] + token[2])
...
merkleRoot = hash[N-1]
```

If any token is modified, the entire Merkle root changes.

## Conversation Operations

### `appendMessage(tokens, content, role, sequence, convKey, intKey)`

1. Pack the message
2. Append to tokens array
3. Recompute Merkle root
4. Return `{ newTokens, merkleRoot }`

### `decryptMessages(tokens, convKey, offset?, limit?)`

Decrypt a range of tokens (viewport loading). Returns array of `DecryptedMessage`.

### `destructiveEdit(tokens, sequence, newContent, convKey, intKey)`

1. Find token at sequence
2. Pack new content with same sequence number
3. Truncate array at sequence + 1
4. Recompute Merkle root

### `destructiveDelete(tokens, sequence, convKey, intKey)`

1. Truncate array at sequence
2. Recompute Merkle root

## Security Properties

| Property | Guarantee |
|----------|-----------|
| Confidentiality | AES-256-GCM - computationally infeasible without key |
| Authenticity | GCM auth tag - tampering detected |
| Integrity | Merkle root - any modification detected |
| Key isolation | Per-conversation keys via HKDF |
| Nonce safety | Random 12-byte nonce per encryption |
