# SCCA Locked Vocabulary

> These terms have exact, unambiguous meanings within SCCA. Do not blur them.

## Core Terms

| Term | Definition | What It Is NOT |
|------|-----------|----------------|
| **Destructive Edit** | Edit operation that permanently deletes all messages after the edit point and replaces the target message content. Auto-triggers regeneration. | Not a version update. Not a branch. Not reversible. |
| **Conversation Row** | A single PostgreSQL row in `scca_conversations` containing the entire conversation state: encrypted message array, metadata, and integrity hash. | Not a collection of message rows. Not a join result. |
| **Master Key** | A 32-byte server-side secret used as the root for all key derivation. Set via `MASTER_KEY_SECRET` env var. | Not a user password. Not stored in the database. Not per-user. |
| **User Key** | A key derived from the master key + user's master key salt via HKDF. Unique per user. | Not the master key itself. Not stored anywhere. |
| **Conversation Key** | A key derived from the user key + conversation ID via HKDF. Used to encrypt/decrypt message tokens. | Not shared between conversations. Not the user key. |
| **Integrity Key** | A key derived from the user key + "integrity" context via HKDF. Used for Merkle tree computation. | Not used for encryption. Only for hash verification. |
| **Message Token** | A single base64-encoded encrypted blob stored in the `messageTokens` array. Contains: header + compressed ciphertext + nonce + auth tag. | Not a JWT. Not a plain text message. Not an AI token. |
| **Binary Header** | The first 10 bytes of a packed message: version (1), role (1), sequence (2), timestamp (4), flags (2). | Not encrypted. Readable without decryption (via `peekMessageHeader`). |
| **Merkle Root** | SHA-256 hash chain across all message tokens, using the integrity key. Stored in the conversation row for tamper detection. | Not a blockchain. Not per-message. One value for the entire conversation. |
| **Viewport** | A subset of messages loaded by the client (e.g., messages 40-60 of 100). Enables efficient loading of large conversations. | Not all messages. Not a filter. A windowed slice. |
| **Soft Delete** | Setting `deletedAt` timestamp on a conversation. Data remains in DB until hard delete. | Not permanent deletion. Not data removal. |
| **Hard Delete** | Permanent removal of a conversation row from the database. | Not reversible. Not soft delete. |

## Role Values

| Role | Byte Value | Description |
|------|-----------|-------------|
| `system` | `0x00` | System prompt / context message |
| `user` | `0x01` | User-authored message |
| `assistant` | `0x02` | AI-generated response |

## Operations

| Operation | Description |
|-----------|-------------|
| `pack` | Convert plaintext message → binary header + compress + encrypt → base64 token |
| `unpack` | Base64 token → decrypt + decompress → plaintext message with metadata |
| `append` | Pack a new message and add it to the conversation's token array |
| `truncate` | Remove all tokens after a given sequence number |
| `peek` | Read the binary header of a token without decrypting the content |
