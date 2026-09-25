# SCCA Prisma Schema

> Database models and helpers for SCCA conversations.

## Models

### SCCAConversation

```prisma
model SCCAConversation {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title         String    @default("New Chat")
  model         String    @default("llama-3.3-70b-versatile")
  messageTokens String[]  @default([])    // Encrypted message blobs
  messageCount  Int       @default(0)     // Cached count
  merkleRoot    String?                    // Merkle-HMAC integrity root
  deletedAt     DateTime?                  // Soft delete
  deletedBy     String?
  auditLogs     AuditLog[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId, updatedAt(sort: Desc)])
  @@index([userId, deletedAt])
  @@map("scca_conversations")
}
```

### AuditLog

```prisma
model AuditLog {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversationId  String?
  conversation    SCCAConversation? @relation(fields: [conversationId], references: [id])
  action          String   // 'create', 'edit', 'delete', 'view', 'regenerate'
  details         Json?
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])
  @@index([conversationId, createdAt])
  @@index([action, createdAt])
  @@map("audit_logs")
}
```

### User Model Additions

```prisma
model User {
  // ... existing fields ...
  masterKeySalt    String?          // 16-byte random salt, base64
  conversations    SCCAConversation[]
  auditLogs        AuditLog[]
}
```

## Database Helper Functions

Located in `lib/db/client.ts` — the only path by which encrypted tokens reach
PostgreSQL (it imports `packMessage` / `computeNextMerkleRoot` from the crypto
engine):

| Function | Description |
|----------|-------------|
| `createSCCAConversation(userId, title?, model?)` | Create new conversation row |
| `getSCCAConversationsByUser(userId)` | List non-deleted conversations |
| `getSCCAConversationById(id, userId)` | Get single conversation |
| `updateSCCAConversation(id, data)` | Update title/model/tokens/merkle |
| `deleteSCCAConversation(id, userId)` | Soft delete (set deletedAt) |
| `appendSCCAMessageTokenAtomic(...)` | Append one token with optimistic `messageCount` check |
| `replaceSCCAMessageTokens(...)` | Replace token array (destructive edit) with the same check |
| `appendMessageAtomically(id, content, role, convKey, intKey)` | Pack + append in one atomic step (409 on conflict) |
| `createAuditLog(data)` | Create immutable audit entry |

## Important Notes

- **Prisma v5 required** — the project pins `prisma` / `@prisma/client` ^5.22.0
- Use `npx prisma generate` / `npx prisma db push` (no migration files by default)
- `prisma db push` requires a direct PostgreSQL URL, not a pooled/Accelerate URL
