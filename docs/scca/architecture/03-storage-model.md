# SCCA Storage Model

> Extracted from the SCCA v2.0 Canonical Specification

## Single Row Per Conversation

Traditional design normalizes data: conversations table + messages table with foreign keys. SCCA inverts this. **One row per conversation.** The `messageTokens` column stores all messages as an encrypted `String[]` array.

### Benefits

| Benefit | Explanation |
|---------|-------------|
| Single-query load | No joins needed - one `SELECT` gets everything |
| No FK constraints | No foreign key overhead to maintain |
| No index bloat | No per-message index entries |
| Atomic updates | Entire conversation state in one transaction |
| Easy backup | One row = complete conversation history |

### The Array Column

PostgreSQL natively supports arrays. `messageTokens` is `String[]` (array of text). Each element is a base64-encoded encrypted message blob. PostgreSQL stores arrays efficiently with minimal per-element overhead.

## Storage Efficiency

### Per-Message Breakdown

| Component | Size |
|-----------|------|
| Binary header | 10 bytes |
| Compressed content | ~30-50% of original |
| Authentication tag | 16 bytes |
| Nonce | 12 bytes |
| Base64 overhead | ~10% |

### Example: 200-character message

| Step | Size |
|------|------|
| Original text | 200 bytes |
| After compression | ~100 bytes |
| After encryption | ~130 bytes |
| After base64 | ~145 bytes |
| **Total with overhead** | **~165 bytes** |

### Comparison

| System | Per-message | 1,000 messages | Savings |
|--------|-------------|----------------|---------|
| Traditional SQL (row per message) | 350-500 bytes | 800 KB - 2 MB | baseline |
| JWT-per-message | 800+ bytes | ~800 KB | worse |
| **SCCA** | **~165 bytes** | **~85 KB** | **89%** |

## Indexing Strategy

Message content is encrypted and **cannot be searched or indexed**. Indexes exist only on unencrypted metadata:

```
@@index([userId, updatedAt(sort: Desc)])  -- List conversations
@@index([userId, deletedAt])              -- Filter deleted
```

For full-text search: build a separate search index using decrypted content (with user permission) or embeddings for semantic search.

## Soft Delete

For GDPR compliance: `deletedAt` timestamp indicates deletion. Data remains until hard delete (user request or automated cleanup after retention period).

## Scalability Limits

| Limit | Value |
|-------|-------|
| Max messages per conversation | 4.2 billion (sequence number) |
| Practical maximum | ~10,000 messages (UI performance) |
| Recommended viewport | 50-100 messages loaded at once |
| Single conversation size | Megabytes for 10,000+ messages |
