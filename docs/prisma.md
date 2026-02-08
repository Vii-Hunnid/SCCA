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
  merkleRoot    String?                    // SHA-256 integrity hash
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

Located in `lib/db/client.ts`:

| Function | Description |
|----------|-------------|
| `createSCCAConversation(userId, title?, model?)` | Create new conversation row |
| `getSCCAConversationsByUser(userId)` | List non-deleted conversations |
| `getSCCAConversationById(id)` | Get single conversation |
| `updateSCCAConversation(id, data)` | Update title/model/tokens/merkle |
| `deleteSCCAConversation(id, userId)` | Soft delete (set deletedAt) |
| `appendSCCAMessageTokens(id, tokens, count, merkle)` | Append tokens + update count |
| `createAuditLog(data)` | Create immutable audit entry |
| `ensureUserMasterKeySalt(userId)` | Generate salt if not exists |

## Important Notes

- **Prisma v5.7.0 required** - v7 has breaking changes with datasource URL
- Use `npx -p prisma@5.7.0 prisma generate` not bare `npx prisma generate`
- `prisma db push` requires direct PostgreSQL URL, not Accelerate URL
- Run schema push locally with: `DATABASE_URL="postgres://..." npx -p prisma@5.7.0 prisma db push`
