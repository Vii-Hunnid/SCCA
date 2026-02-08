# SCCA - Secure Compact Chat Architecture

Privacy-first, storage-efficient chat architecture with AES-256-GCM encryption and compact binary message format.

## What is SCCA?

SCCA treats conversations as single encrypted documents rather than collections of individual message rows. Every message is compressed, encrypted, and stored as a compact binary token in a single database row per conversation.

| Aspect | SCCA Approach |
|--------|---------------|
| Storage | Single row per conversation, messages as encrypted `String[]` |
| Encryption | AES-256-GCM with per-conversation keys via HKDF-SHA256 |
| Editing | Destructive: truncate after edit point, auto-regenerate |
| Integrity | SHA-256 Merkle tree across all message tokens |
| Binary Format | 10-byte header + zlib compressed + encrypted content |
| Overhead | ~24 bytes per message vs ~300-500 bytes traditional |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Vii-Hunnid/SCCA.git
cd SCCA
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your database URL, secrets, and API keys

# 3. Start PostgreSQL
docker compose up -d

# 4. Push database schema
npx prisma db push

# 5. Seed demo user (optional)
npm run db:seed

# 6. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Default demo credentials: `demo@scca.dev` / `password123`.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Encryption:** AES-256-GCM, HKDF-SHA256, zlib compression
- **Auth:** NextAuth.js (credentials provider)
- **AI:** Groq SDK (Llama models)
- **State:** Zustand
- **UI:** Tailwind CSS + Lucide icons

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    api/scca/             # REST API (conversations, messages, edit)
    (auth)/               # Login/register pages
    (dashboard)/chat/     # Main chat interface
  lib/
    crypto/engine.ts      # Core cryptographic engine (~400 lines)
    db/client.ts          # Prisma CRUD helpers
    auth.ts               # NextAuth + key derivation
    ai/client.ts          # Groq streaming client
  hooks/useScca.ts        # React hook for SCCA operations
  components/chat/        # Chat UI components + SCCA Preview Panel
  store/                  # Zustand state management
  types/                  # TypeScript type definitions
prisma/schema.prisma      # Database models
docs/scca/                # Full specification and architecture docs
tests/                    # Unit and integration tests
```

## Key Features

### Destructive Editing
Edit message #5 in a 10-message conversation: messages 6-10 are **permanently deleted**. The system regenerates from the edit point. No branches, no history, no undo.

### Compact Binary Format
Each message is packed into a binary token:
```
[header: 10B][ciphertext_len: 2B][AES-256-GCM(zlib(content))][nonce: 16B]
```
Result: ~89% storage savings vs traditional per-row message storage.

### Per-Conversation Encryption
```
MASTER_KEY_SECRET → HKDF → User Key → HKDF → Conversation Key
```
Each conversation has its own encryption key. Database breach = useless encrypted blobs.

### SCCA Preview Panel
Real-time sidebar showing per-message metrics, compression ratios, storage savings vs JSON, and encryption details.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scca/conversations` | List conversations |
| POST | `/api/scca/conversations` | Create conversation |
| GET | `/api/scca/conversations/[id]` | Load with decrypted messages |
| PATCH | `/api/scca/conversations/[id]` | Update title/model |
| DELETE | `/api/scca/conversations/[id]` | Soft delete |
| POST | `/api/scca/conversations/[id]/messages` | Send message (SSE streaming) |
| POST | `/api/scca/conversations/[id]/edit` | Destructive edit/delete |

## Running Tests

```bash
npm test
```

## Documentation

Full specification and architecture docs are in `docs/scca/`:
- `SPEC.md` - Canonical specification
- `architecture/` - Design philosophy, threat model, data flow
- `implementation/` - Prisma, crypto, API, preview panel guides
- `reference/` - API contracts, vocabulary, directory structure

## License

MIT