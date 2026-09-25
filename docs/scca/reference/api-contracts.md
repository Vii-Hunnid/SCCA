# SCCA API Contracts

> REST API endpoints for SCCA operations.

## Base URL

```
/api/scca
```

## Authentication

Conversation, account, keys, media, billing, and usage endpoints require a
NextAuth session; the `user.id` is extracted from the JWT session token (via
`requireUser()` in `lib/session.ts`). Vault endpoints authenticate with an
`scca_k_` Bearer API key first, falling back to the session. The Polar webhook
(`POST /api/webhooks/polar`) verifies the Polar signature instead of a session.

---

## Endpoints

### List Conversations

```
GET /api/scca/conversations
```

**Response:** `200 OK`
```json
[
  {
    "id": "clx1234...",
    "title": "New Chat",
    "model": "llama-3.3-70b-versatile",
    "messageCount": 12,
    "createdAt": "2026-02-01T00:00:00.000Z",
    "updatedAt": "2026-02-01T12:00:00.000Z"
  }
]
```

---

### Create Conversation

```
POST /api/scca/conversations
```

**Body:**
```json
{
  "title": "Optional title",
  "model": "llama-3.3-70b-versatile"
}
```

**Response:** `201 Created`
```json
{
  "id": "clx1234...",
  "title": "New Chat",
  "model": "llama-3.3-70b-versatile",
  "messageCount": 0,
  "createdAt": "2026-02-01T00:00:00.000Z",
  "updatedAt": "2026-02-01T00:00:00.000Z"
}
```

---

### Get Conversation (with decrypted messages)

```
GET /api/scca/conversations/[id]?offset=0&limit=50
```

**Query Parameters:**
- `offset` (optional): Starting message index for viewport loading (default `0`)
- `limit` (optional): Number of messages to return (default `100`, max `500`)

**Response:** `200 OK`
```json
{
  "id": "clx1234...",
  "title": "My Chat",
  "model": "llama-3.3-70b-versatile",
  "messageCount": 12,
  "merkleRoot": "a1b2c3d4e5f6...",
  "integrity": { "valid": true },
  "messages": [
    {
      "id": "msg-0",
      "role": "user",
      "content": "Hello!",
      "sequence": 0,
      "timestamp": "2026-02-01T00:00:00.000Z"
    },
    {
      "id": "msg-1",
      "role": "assistant",
      "content": "Hi there! How can I help?",
      "sequence": 1,
      "timestamp": "2026-02-01T00:00:01.000Z"
    }
  ]
}
```

The stored Merkle root is recomputed over all tokens on every load; `integrity.valid`
is `false` if any token was modified.

---

### Update Conversation (rename/change model)

```
PATCH /api/scca/conversations/[id]
```

**Body:**
```json
{
  "title": "New Title",
  "model": "llama-3.1-8b-instant"
}
```

**Response:** `200 OK`

---

### Delete Conversation (soft delete)

```
DELETE /api/scca/conversations/[id]
```

**Response:** `200 OK`

---

### Send Message (with streaming)

```
POST /api/scca/conversations/[id]/messages
```

**Body:**
```json
{
  "content": "Explain quantum computing",
  "temperature": 0.7,
  "top_p": 1,
  "max_tokens": 8192,
  "model": "llama-3.3-70b-versatile",
  "systemPrompt": "You are Gunther, a helpful AI assistant."
}
```

**Response:** `200 OK` (Server-Sent Events stream)
```
data: {"token":"Quantum"}
data: {"token":" computing"}
data: {"token":" is"}
...
data: {"done":true,"messageCount":4,"title":"Quantum Computing Explained"}
```

---

### Edit/Delete Message (destructive)

```
POST /api/scca/conversations/[id]/edit
```

**Body (edit):**
```json
{
  "sequence": 2,
  "content": "Updated message content",
  "regenerate": true,
  "temperature": 0.7,
  "systemPrompt": "You are Gunther."
}
```

**Body (delete):**
```json
{
  "action": "delete",
  "sequence": 4
}
```

**Response:** `200 OK` (SSE stream if regenerating, JSON otherwise)

---

### Vault — Encrypt

```
POST /api/scca/vault/encrypt
```

**Auth:** `scca_k_` Bearer API key (session fallback). Stateless — ciphertext is
returned to the caller and never stored; only usage metering touches the DB.

**Body:**
```json
{
  "data": ["sensitive value", "another value"],
  "context": "pii-vault"
}
```

**Response:** `200 OK`
```json
{
  "tokens": ["AQAAAAAn...", "AQEAAAAn..."],
  "merkleRoot": "a1b2c3d4e5f6...",
  "context": "pii-vault",
  "metadata": {
    "itemCount": 2,
    "originalBytes": 45,
    "encryptedBytes": 2196,
    "compressionRatio": 0.365,
    "cipher": "AES-256-GCM",
    "kdf": "HKDF-SHA256",
    "integrity": "HMAC-SHA256-chain"
  }
}
```

---

### Vault — Decrypt

```
POST /api/scca/vault/decrypt
```

**Body:**
```json
{
  "tokens": ["AQAAAAAn..."],
  "context": "pii-vault"
}
```

**Response:** `200 OK` — the decrypted plaintext items.

---

### Vault — Verify Integrity

```
POST /api/scca/vault/verify
```

**Body:**
```json
{
  "tokens": ["AQAAAAAn...", "AQEAAAAn..."],
  "merkleRoot": "a1b2c3d4e5f6...",
  "context": "pii-vault"
}
```

**Response:** `200 OK` — whether the recomputed Merkle root matches.

---

### API Keys

```
GET    /api/scca/keys        → List active API keys (session auth)
POST   /api/scca/keys        → Create key; raw scca_k_ key shown once
DELETE /api/scca/keys/[id]   → Revoke a key
```

Keys are stored as SHA-256 hashes only; the prefix is kept for display.

---

### Account

```
GET    /api/scca/account                → Account profile
PATCH  /api/scca/account                → Update profile
DELETE /api/scca/account                → Delete account and all associated data
POST   /api/scca/account/password       → Change password (revokes older sessions)
DELETE /api/scca/account/sessions/[id]  → Revoke a tracked session
```

---

### Media

```
GET    /api/scca/media?conversationId=xxx  → List media with aggregate stats
POST   /api/scca/media                     → Upload + encrypt (multipart form)
GET    /api/scca/media/[id]                → Decrypt + download original file
DELETE /api/scca/media/[id]                → Permanently delete attachment
```

---

### Billing

```
GET  /api/scca/billing                 → Billing account, tier, invoices
POST /api/scca/billing                 → Update budget / auto-upgrade settings
POST /api/scca/billing/checkout        → Create Polar checkout session
GET  /api/scca/billing/invoices        → List invoices
GET  /api/scca/billing/invoices/[id]   → Invoice detail (PDF via Polar REST API)
```

---

### Usage & Rate Limits

```
GET /api/scca/usage         → Usage metrics (requests, tokens, bytes) with period filter
GET /api/scca/rate-limits   → Current rate limit status for the caller's tier
```

---

### Polar Webhook

```
POST /api/webhooks/polar
```

Signature-verified (no session). Idempotent under retries — events dedupe by
Polar order ID before any spend mutation. Upserts billing accounts and invoices.
