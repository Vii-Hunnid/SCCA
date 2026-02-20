# SCCA — Secure Compact Chat Architecture

Privacy-first, storage-efficient AI chat platform with AES-256-GCM encryption, single-row conversations, and Merkle integrity verification.

![SCCA Hero](public/images/scca-hero.svg)

SCCA is an open-source protocol and full-stack application for building privacy-first AI chat systems. Every message is encrypted with per-conversation keys derived via HKDF-SHA256, stored as a compact binary token array in a single database row, and verified by a Merkle-HMAC integrity chain. The server cannot read message content without the master key.

Article on X: https://x.com/Viihunnid/status/2021224979421888587

---

## Table of Contents

- [Core Architecture](#core-architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [Encryption Engine](#encryption-engine)
- [Vault API](#vault-api)
- [Media Pipeline](#media-pipeline)
- [Chat System](#chat-system)
- [API Key Management](#api-key-management)
- [Rate Limiting & Tiers](#rate-limiting--tiers)
- [Billing & Payments](#billing--payments)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Security](#security)
- [Scripts](#scripts)
- [License](#license)

---

## Core Architecture

![Key Hierarchy](public/images/scca-architecture.svg)

```
MASTER_KEY_SECRET (env, 32 bytes)
    |
    |-- HKDF("user-key", masterKey + userSalt) -> User Key
    |       |
    |       |-- HKDF("conv-key", userKey + conversationId) -> Conversation Key
    |       |       
    |       |-- HKDF("integrity", userKey + conversationId) -> Integrity Key
    |               
    |
    
```

**Design principles:**

- **Single-row storage** — An entire conversation (messages, metadata, integrity hash) lives in one PostgreSQL row as an encrypted token array. 1,000 messages in ~85 KB.
- **Destructive editing** — Editing message #5 permanently deletes messages 6-N. No versioning, no branches, no ghost data. Linear timeline only.
- **Zero-knowledge server** — The server cannot read message content. A database breach yields only encrypted blobs.
- **Compact binary format** — 10-byte header + zlib compression + AES-256-GCM ciphertext. ~24 bytes overhead per message vs 200-300 bytes for traditional JSON storage.

---

## Features

![SCCA Features](public/images/scca-features.svg)

| Feature | Description |
|---------|-------------|
| **AES-256-GCM Encryption** | Per-conversation keys via HKDF-SHA256. Every message individually encrypted. |
| **Single-Row Conversations** | Entire conversations stored as encrypted token arrays in one database row. |
| **Merkle Integrity** | HMAC-SHA256 chain across all tokens. Any modification invalidates the root. |
| **Destructive Editing** | Irreversible edits — all subsequent messages permanently deleted. |
| **Vault API** | Standalone encryption service — encrypt, decrypt, and verify any data via REST. |
| **Media Pipeline** | Encrypted media attachments (images, video, audio, documents) with selective compression. |
| **AI Chat** | Groq-powered chat with Llama models, SSE streaming, message regeneration. |
| **API Keys** | Bearer token auth (`scca_k_` prefix) for programmatic access. SHA-256 hashed storage. |
| **Rate Limiting** | 6-tier system (free -> enterprise) with RPM/RPD/TPM/TPD enforcement. |
| **Billing** | Polar.sh integration with tier subscriptions, invoices, usage metering, budget caps. |
| **Multi-Auth** | Email/password (PBKDF2), GitHub OAuth, Google OAuth via NextAuth.js. |
| **Audit Logging** | Immutable action logs with IP/user agent tracking for compliance. |
| **Usage Analytics** | Per-request metering (tokens, bytes, latency, cost) with dashboard visualizations. |
| **Security Headers** | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router, React 19) |
| **Language** | TypeScript 5.7 |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Auth** | NextAuth.js 4 (JWT sessions, OAuth) |
| **AI** | Groq SDK (Llama 3.3 70B, Llama 3.1 8B) |
| **Encryption** | Node.js `crypto` (AES-256-GCM, HKDF-SHA256, PBKDF2) |
| **Payments** | Polar.sh (subscriptions, invoices) |
| **State** | Zustand 5 |
| **Styling** | Tailwind CSS 3 (cyberpunk theme) |
| **Animations** | Framer Motion 11 |
| **Charts** | Recharts 2 |
| **Icons** | Lucide React |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Vii-Hunnid/SCCA.git
cd SCCA

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database URL, secrets, and API keys

# 4. Database
npx prisma generate
npx prisma db push

# 5. Run
npm run dev
```

Open `http://localhost:3000` and register an account.

---

## Environment Variables

Create a `.env` file with the following:

```env
# -- Database --
DATABASE_URL="postgresql://user:pass@host:5432/scca?schema=public"
DIRECT_URL="postgresql://user:pass@host:5432/scca?sslmode=require"

# -- Authentication --
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-min-32-characters"

# -- Encryption --
# 32 bytes, base64 encoded. Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
MASTER_KEY_SECRET="your-base64-encoded-32-byte-master-secret="

# -- AI Provider (Groq) --
GROQ_API_KEY="gsk_your-groq-api-key"
DEFAULT_MODEL="llama-3.3-70b-versatile"

# -- OAuth (optional) --
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# -- Billing (Polar.sh, optional) --
POLAR_ACCESS_TOKEN="polar_at_your-token"
POLAR_WEBHOOK_SECRET="your-webhook-secret"
POLAR_ENVIRONMENT="sandbox"  # or "production"
# POLAR_TIER_MAP={"prod_xxx":"tier_1","prod_yyy":"tier_2"}
```

---

## Database Setup

SCCA uses PostgreSQL with Prisma ORM. The schema includes 9 models:

| Model | Purpose |
|-------|---------|
| `User` | Accounts with email, password hash (PBKDF2), master key salt, OAuth info |
| `Session` | NextAuth session tracking with IP/user agent |
| `SCCAConversation` | **Core model** — single row per conversation with encrypted `messageTokens[]` array, Merkle root |
| `AuditLog` | Immutable action log (create, edit, delete, view, regenerate, login, logout) |
| `ApiKey` | Bearer tokens for API access. SHA-256 hashed, prefix stored for display |
| `UsageRecord` | Per-request metering (tokens, bytes, latency, cost, rate limit tier) |
| `BillingAccount` | Tier, spend tracking, Polar.sh subscription info, budget caps |
| `Invoice` | Billing period records with Polar.sh order tracking |
| `MediaAttachment` | Encrypted media files with compression metadata and SHA-256 checksums |

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (no migration files)
npx prisma db push

# Or use migrations for production
npx prisma migrate dev

# Visual database browser
npx prisma studio
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── docs/page.tsx                     # Documentation (9 sections)
│   ├── auth/
│   │   ├── login/page.tsx                # Sign in
│   │   └── register/page.tsx             # Sign up
│   ├── dashboard/
│   │   ├── page.tsx                      # Main chat + SCCA metrics
│   │   ├── api-keys/page.tsx             # API key management
│   │   ├── billing/page.tsx              # Billing & tier management
│   │   ├── invoices/page.tsx             # Invoice history + preview
│   │   ├── usage/page.tsx                # Usage analytics + charts
│   │   ├── platform/page.tsx             # Platform health status
│   │   └── chat/
│   │       ├── new/page.tsx              # New conversation
│   │       └── [id]/page.tsx             # Specific conversation
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts    # NextAuth handler
│       │   └── register/route.ts         # User registration
│       ├── scca/
│       │   ├── conversations/            # CRUD + messaging
│       │   ├── vault/                    # Encrypt, decrypt, verify
│       │   ├── keys/                     # API key management
│       │   ├── media/                    # Media upload/download
│       │   ├── billing/                  # Billing + checkout + invoices
│       │   ├── usage/                    # Usage metrics
│       │   └── rate-limits/              # Rate limit status
│       └── webhooks/
│           └── polar/route.ts            # Polar.sh payment webhooks
├── components/
│   ├── chat/
│   │   ├── SCCAChatArea.tsx              # Message display + streaming
│   │   ├── SCCAMessageBubble.tsx         # Individual message with actions
│   │   ├── ChatInput.tsx                 # Input + file attachments
│   │   └── SCCAPreviewPanel.tsx          # Encryption metrics sidebar
│   └── dashboard/
│       ├── DashboardShell.tsx            # Layout with sidebar
│       ├── ConversationList.tsx          # Conversation sidebar
│       └── SecurityStatus.tsx            # Encryption status display
├── lib/
│   ├── crypto/engine.ts                  # AES-256-GCM, HKDF, Merkle tree
│   ├── media/processor.ts               # SCCA media pipeline
│   ├── ai/client.ts                      # Groq SDK wrapper
│   ├── auth.ts                           # NextAuth config + key derivation
│   ├── api-key-auth.ts                   # Bearer token authentication
│   ├── rate-limit.ts                     # Tiered rate limiting engine
│   ├── polar.ts                          # Polar.sh billing client
│   ├── prisma.ts                         # Database client singleton
│   └── utils.ts                          # cn(), formatBytes(), formatRelativeTime()
├── hooks/
│   └── useScca.ts                        # React hook for SCCA operations
├── store/
│   └── chatStore.ts                      # Zustand global state
└── types/
    └── chat.ts                           # Message, Conversation, SCCAMessage types
```

---

## Encryption Engine

Located at `src/lib/crypto/engine.ts`. All cryptographic operations are server-side.

![Key Hierarchy](public/images/scca-architecture.svg)

### Key Hierarchy

```
MASTER_KEY_SECRET (32 bytes, env var)
    | HKDF-SHA256("user-key", masterKey, userSalt)
User Key (32 bytes, per user)
    | HKDF-SHA256("conv-key", userKey, conversationId)
Conversation Key (32 bytes)     -> AES-256-GCM encrypt/decrypt
    | HKDF-SHA256("integrity", userKey, conversationId)
Integrity Key (32 bytes)        -> Merkle-HMAC chain
```

### Binary Message Format

![Binary Format](public/images/scca-binary-format.svg)

```
+------------------------------------------------+
| Header (10 bytes)                              |
|  [version:1][role:1][sequence:2][timestamp:4]  |
|  [flags:2]                                     |
+------------------------------------------------+
| Nonce (12 bytes) — random, never reused        |
+------------------------------------------------+
| Ciphertext (variable)                          |
|  AES-256-GCM(key, nonce, zlib.deflate(content))|
+------------------------------------------------+
| Auth Tag (16 bytes) — GCM authentication       |
+------------------------------------------------+
```

### Operations

| Operation | Description |
|-----------|-------------|
| `packMessage` | Plaintext -> binary header + zlib compress + AES encrypt -> base64 token |
| `unpackMessage` | Base64 token -> AES decrypt + decompress -> plaintext + metadata |
| `appendMessage` | Pack and add to conversation token array |
| `destructiveEdit` | Replace message at sequence N, permanently delete all messages after N |
| `destructiveDelete` | Remove message and all subsequent messages |
| `computeMerkleRoot` | HMAC-SHA256 chain across all tokens -> single integrity hash |
| `verifyConversation` | Recompute Merkle root and compare to stored value |
| `peekMessageHeader` | Read 10-byte header without decrypting content |

### Merkle Integrity Chain

![Merkle Chain](public/images/scca-merkle.svg)

```
hash[0] = HMAC(integrityKey, token[0])
hash[1] = HMAC(integrityKey, hash[0] + token[1])
hash[2] = HMAC(integrityKey, hash[1] + token[2])
...
merkleRoot = hash[N-1]
```

If any token is modified, inserted, or removed, the entire Merkle root changes.

---

## Vault API

![Vault API](public/images/scca-vault.svg)

Use SCCA's encryption engine as a standalone service. Encrypt, decrypt, and verify any data through the REST API — no chat required. Supports both session cookies and API key auth (`scca_k_` Bearer tokens).

### Encrypt

```bash
curl -X POST https://your-instance.com/api/scca/vault/encrypt \
  -H "Authorization: Bearer scca_k_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "data": ["sensitive user SSN", "credit card number"],
    "context": "pii-vault"
  }'
```

Response:

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

### Decrypt

```bash
curl -X POST https://your-instance.com/api/scca/vault/decrypt \
  -H "Authorization: Bearer scca_k_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"tokens": ["AQAAAAAn..."], "context": "pii-vault"}'
```

### Verify Integrity

```bash
curl -X POST https://your-instance.com/api/scca/vault/verify \
  -H "Authorization: Bearer scca_k_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tokens": ["AQAAAAAn...", "AQEAAAAn..."],
    "merkleRoot": "a1b2c3d4e5f6...",
    "context": "pii-vault"
  }'
```

### Use Cases

- **PII storage** — Encrypt user data before storing in your database
- **Audit logs** — Tamper-proof log entries with Merkle verification
- **Config secrets** — Encrypt API keys and credentials at rest
- **AI pipelines** — Encrypt prompts and responses, verify they weren't modified in transit
- **File metadata** — Encrypt descriptions, tags, or annotations before cloud storage

---

## Media Pipeline

SCCA v2 extends encryption to media files. Each file passes through a format-aware pipeline.

### Supported Formats

| Category | Formats | Strategy | Max Size |
|----------|---------|----------|----------|
| **Image** | PNG, JPEG, WebP, HEIC | Encrypt only | 25 MB |
| **Image** | SVG, GIF | zlib-9 + encrypt | 25 MB |
| **Video** | MP4, WebM, MOV | Encrypt only | 100 MB |
| **Audio** | MP3, WAV, OGG, M4A, FLAC | Encrypt only | 50 MB |
| **Document** | PDF, TXT, Markdown, JSON | zlib-9 + encrypt | 10 MB |

Already-compressed formats (PNG, JPEG, MP4, MP3) skip compression — re-compressing would waste CPU for zero savings. Text-based formats get zlib level 9 before encryption for 50-90% compression.

### SCCA Media Packet Format (v2)

```
[0..3]   "SCCA" magic bytes (4 bytes)
[4]      Version 0x02 (1 byte)
[5]      Type code (1 byte) — e.g. 0x01=PNG, 0x10=MP4, 0x20=MP3
[6..21]  IV / nonce (16 bytes)
[22..37] AES-GCM auth tag (16 bytes)
[38..69] SHA-256 checksum of original data (32 bytes)
[70..]   Encrypted (optionally compressed) payload
```

### Upload Media

```bash
curl -X POST https://your-instance.com/api/scca/media \
  -H "Cookie: ..." \
  -F "file=@photo.png" \
  -F "conversationId=clx1234..." \
  -F "messageSequence=2"
```

---

## Chat System

The chat interface supports real-time encrypted conversations with AI.

### Features

- **SSE streaming** — AI responses streamed token-by-token via Server-Sent Events
- **Destructive editing** — Edit any user message; all subsequent messages permanently deleted, response regenerated
- **Message regeneration** — Re-generate the last AI response
- **File attachments** — Upload images, video, audio, documents through the chat input
- **Title editing** — Inline rename conversations
- **Conversation deletion** — Delete with confirmation dialog
- **SCCA metrics panel** — Real-time display of encryption stats, compression ratios, storage savings vs JSON
- **Media metrics** — Category breakdown, original/encrypted sizes, compression ratios

### Message Flow

```
User types message
    |
ChatInput -> handleSendMessage()
    | (upload attachments if any)
POST /api/scca/media (per file)
    |
POST /api/scca/conversations/[id]/messages
    |
Server: encrypt message -> append to token array -> update Merkle root
    |
Server: send to Groq API -> stream response
    |
SSE: data: {"token":"..."} ... data: {"done":true}
    |
Server: encrypt AI response -> append to token array -> update Merkle root
    |
Client: display streamed message + update metrics
```

---

## API Key Management

Generate API keys for programmatic access to the Vault and Conversation APIs.

- **Format**: `scca_k_<64-hex-chars>` (shown once at creation, never again)
- **Storage**: Only SHA-256 hash stored in database; prefix stored for display
- **Auth**: Pass as `Authorization: Bearer scca_k_...`
- **Dashboard**: Create, revoke, track last used, set expiration

```bash
# Create a key (requires session auth)
curl -X POST https://your-instance.com/api/scca/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Backend", "expiresInDays": 90}'

# Use the key
curl -X POST https://your-instance.com/api/scca/vault/encrypt \
  -H "Authorization: Bearer scca_k_a1b2c3d4..." \
  -H "Content-Type: application/json" \
  -d '{"data": "encrypt this", "context": "my-app"}'
```

---

## Rate Limiting & Tiers

SCCA uses a 6-tier rate limiting system with sliding window enforcement:

| Tier | RPM | RPD | TPM | TPD | Cost/1M Tokens |
|------|-----|-----|-----|-----|----------------|
| Free | 10 | 200 | 10K | 200K | — |
| Tier 1 | 60 | 5K | 100K | 5M | $0.15 |
| Tier 2 | 300 | 20K | 500K | 20M | $0.12 |
| Tier 3 | 1,000 | 100K | 2M | 100M | $0.10 |
| Tier 4 | 5,000 | 500K | 10M | 500M | $0.08 |
| Enterprise | 10,000+ | Custom | 50M+ | Custom | $0.06 |

Rate limits are enforced per-user with real-time tracking. Users can enable auto-upgrade to automatically move to higher tiers based on monthly spend.

---

## Billing & Payments

SCCA integrates with [Polar.sh](https://polar.sh) for subscription management and payments.

### Dashboard Features

- **Current tier display** with rate limit details
- **Tier comparison table** for upgrade decisions
- **Monthly spend tracking** with user-configurable budget caps
- **Invoice history** with detailed breakdowns (tokens, bytes, requests per endpoint)
- **Invoice preview modal** with print/PDF/Polar download
- **Checkout flow** — per-tier Polar.sh checkout links
- **Auto-upgrade** — optional automatic tier upgrades based on spend

### Webhook Events

The Polar.sh webhook handler (`/api/webhooks/polar`) processes:
- `order.paid` — Creates invoice records, updates billing account
- Subscription lifecycle events — Updates tier, status, and subscription info

---

## Authentication

### Methods

| Method | Description |
|--------|-------------|
| **Email/Password** | PBKDF2-SHA512 (100K iterations, 16-byte salt) |
| **GitHub OAuth** | Auto-provision with account linking by email |
| **Google OAuth** | Auto-provision with account linking by email |
| **API Keys** | Bearer tokens for programmatic access |

### Session

- **Strategy**: JWT (NextAuth.js)
- **Expiry**: 30 days
- **Contents**: user ID, email, name, derived master key (base64), master key salt
- **Security**: Timing attack protection on login failures, CSRF validation

---

## API Reference

All endpoints require authentication (session cookie or API key Bearer token).

### Conversations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/scca/conversations` | List all conversations |
| `POST` | `/api/scca/conversations` | Create new conversation |
| `GET` | `/api/scca/conversations/[id]` | Get conversation with decrypted messages |
| `PATCH` | `/api/scca/conversations/[id]` | Update title or model |
| `DELETE` | `/api/scca/conversations/[id]` | Soft delete conversation |
| `POST` | `/api/scca/conversations/[id]/messages` | Send message (SSE streaming response) |
| `POST` | `/api/scca/conversations/[id]/edit` | Destructive edit or delete |

### Vault

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scca/vault/encrypt` | Encrypt data (string or array) |
| `POST` | `/api/scca/vault/decrypt` | Decrypt tokens to plaintext |
| `POST` | `/api/scca/vault/verify` | Verify token integrity via Merkle root |

### Media

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scca/media` | Upload and encrypt media file |
| `GET` | `/api/scca/media?conversationId=xxx` | List media with aggregate stats |
| `GET` | `/api/scca/media/[id]` | Decrypt and download original file |
| `DELETE` | `/api/scca/media/[id]` | Permanently delete attachment |

### API Keys

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/scca/keys` | List active API keys |
| `POST` | `/api/scca/keys` | Create new API key |
| `PUT` | `/api/scca/keys/[id]` | Update key name/expiry |
| `DELETE` | `/api/scca/keys/[id]` | Revoke API key |

### Billing

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/scca/billing` | Get billing account, tier, invoices |
| `POST` | `/api/scca/billing` | Update budget/auto-upgrade settings |
| `POST` | `/api/scca/billing/checkout` | Generate Polar.sh checkout link |
| `GET` | `/api/scca/billing/invoices` | List all invoices with summary |
| `GET` | `/api/scca/billing/invoices/[id]` | Get specific invoice |

### Usage & Limits

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/scca/usage` | Usage metrics (requests, tokens, bytes) |
| `GET` | `/api/scca/rate-limits` | Current rate limit status by tier |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhooks/polar` | Polar.sh payment event handler |

---

## Security

| Property | Implementation |
|----------|----------------|
| **Encryption** | AES-256-GCM — computationally infeasible without key |
| **Key Derivation** | HKDF-SHA256 — per-user, per-conversation key isolation |
| **Password Hashing** | PBKDF2-SHA512 — 100,000 iterations |
| **Integrity** | Merkle-HMAC chain — any modification invalidates root |
| **Nonce Safety** | Random 12-byte nonce per encryption (never reused) |
| **API Key Storage** | SHA-256 hash only — raw key never stored |
| **Session** | JWT with 30-day expiry, timing attack protection |
| **Headers** | X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| **Permissions** | camera=(), microphone=(), geolocation=() disabled |
| **Soft Delete** | GDPR-compliant deletedAt/deletedBy fields |
| **Audit Trail** | Immutable logs with IP, user agent, action details |

---

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production (runs prisma generate)
npm run start            # Start production server
npm run lint             # Run ESLint

npm run test             # Run Jest tests
npm run test:watch       # Run tests in watch mode

npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database (no migrations)
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
```

---

## License

MIT

---

*Built with precision. Secured by design.*
