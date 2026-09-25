# SCCA Directory Structure

> Files that make up the SCCA implementation in this repository.

```
SCCA/
├── docs/scca/                                  # Documentation (you are here)
│   ├── SPEC.md                                 # Canonical specification
│   ├── architecture/                           # Why decisions were made
│   │   ├── 00-philosophy.md
│   │   ├── 01-threat-model.md
│   │   ├── 02-data-flow.md
│   │   ├── 03-storage-model.md
│   │   ├── 04-destructive-editing.md
│   │   ├── 05-comparisons.md
│   │   ├── 06-system-diagram.md                # Verified component diagram
│   │   └── archive/                            # Superseded revisions
│   ├── implementation/                         # How to build it
│   │   ├── prisma.md
│   │   ├── crypto.md
│   │   ├── api-routes.md
│   │   └── preview-panel.md                    # SCCA Preview Panel guide
│   └── reference/                              # Lookup tables
│       ├── vocabulary.md
│       ├── api-contracts.md
│       └── directory-structure.md              # This file
│
├── prisma/
│   ├── schema.prisma                           # All 9 models (User, SCCAConversation, ...)
│   ├── seed.ts                                 # Database seed
│   └── retention.ts                            # Retention cleanup
│
├── src/
│   ├── lib/
│   │   ├── crypto/
│   │   │   └── engine.ts                       # Core cryptographic engine (~650 lines)
│   │   │       ├── getServerMasterKey()
│   │   │       ├── deriveUserKey()
│   │   │       ├── deriveConversationKey()
│   │   │       ├── deriveIntegrityKey()
│   │   │       ├── packMessage()
│   │   │       ├── unpackMessage()
│   │   │       ├── peekMessageHeader()
│   │   │       ├── computeMerkleRoot()
│   │   │       ├── computeNextMerkleRoot()     # O(1) incremental root extension
│   │   │       ├── verifyMerkleRoot()
│   │   │       ├── appendMessage()
│   │   │       ├── decryptMessages()
│   │   │       ├── destructiveEdit()
│   │   │       └── destructiveDelete()
│   │   ├── db/
│   │   │   └── client.ts                       # Conversation data access — the ONLY
│   │   │                                       # path by which encrypted tokens reach
│   │   │                                       # PostgreSQL (imports packMessage /
│   │   │                                       # computeNextMerkleRoot from the engine)
│   │   ├── ai/client.ts                        # Groq SDK wrapper (streaming, retries)
│   │   ├── media/processor.ts                  # Media encrypt/decrypt pipeline
│   │   ├── auth.ts                             # NextAuth config + master key derivation
│   │   ├── session.ts                          # Session checks (requireUser)
│   │   ├── api-key-auth.ts                     # Bearer scca_k_ auth (session fallback)
│   │   ├── rate-limit.ts                       # Tier limits, metering (recordUsage)
│   │   ├── sse-client.ts                       # Client-side SSE parser
│   │   ├── polar.ts                            # Polar.sh billing client
│   │   ├── prisma.ts                           # Prisma client singleton
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   └── useScca.ts                          # React hook (~540 lines) — ALL API calls
│   │       ├── fetchConversations()
│   │       ├── createConversation()
│   │       ├── loadConversation()
│   │       ├── sendMessage()                   # With streaming
│   │       ├── stopStreaming()
│   │       ├── editMessage()                   # Destructive edit
│   │       ├── deleteMessage()
│   │       ├── regenerateLastResponse()
│   │       ├── deleteConversation()
│   │       └── updateConversationTitle()
│   │
│   ├── store/
│   │   ├── chatStore.ts                        # Zustand chat state
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── chat.ts                             # Message / Conversation types
│   │   ├── api.ts                              # API request/response types
│   │   ├── crypto.ts                           # Crypto engine types
│   │   └── next-auth.d.ts                      # Session type extensions
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── SCCAChatArea.tsx                # Chat message area (presentational —
│   │   │   │                                   # no HTTP calls; actions bubble up)
│   │   │   ├── SCCAMessageBubble.tsx           # Individual message with action buttons
│   │   │   │       ├── Copy button
│   │   │   │       ├── Edit button (user messages only)
│   │   │   │       ├── Regenerate button (last assistant only)
│   │   │   │       └── Delete button
│   │   │   ├── ChatInput.tsx                   # Input + file attachments
│   │   │   ├── BlockStreamingIndicator.tsx     # Streaming progress indicator
│   │   │   └── SCCAPreviewPanel.tsx            # Preview panel with metrics
│   │   ├── dashboard/
│   │   │   ├── dashboard-shell.tsx
│   │   │   ├── dashboard-page-shell.tsx
│   │   │   ├── conversation-list.tsx
│   │   │   └── security-status.tsx
│   │   ├── layout/AuthProvider.tsx
│   │   ├── ui/                                 # button, card, badge, skeleton, ...
│   │   ├── landing-page.tsx
│   │   ├── providers.tsx
│   │   └── security-overlay.tsx
│   │
│   └── app/
│       ├── api/scca/
│       │   ├── conversations/
│       │   │   ├── route.ts                    # GET (list) + POST (create)
│       │   │   └── [id]/
│       │   │       ├── route.ts                # GET (viewport + Merkle) + PATCH + DELETE
│       │   │       ├── messages/
│       │   │       │   └── route.ts            # POST (send + stream)
│       │   │       └── edit/
│       │   │           └── route.ts            # POST (destructive edit/delete/regenerate)
│       │   ├── account/
│       │   │   ├── route.ts                    # GET + PATCH + DELETE (profile)
│       │   │   ├── password/route.ts           # POST (change password)
│       │   │   └── sessions/[id]/route.ts      # DELETE (revoke session)
│       │   ├── keys/                           # API key management
│       │   ├── vault/                          # encrypt / decrypt / verify (stateless)
│       │   ├── media/                          # upload/encrypt + [id] decrypt-download/delete
│       │   ├── billing/                        # account + checkout + invoices
│       │   ├── usage/route.ts                  # Usage analytics
│       │   └── rate-limits/route.ts            # Limit status
│       ├── api/auth/
│       │   ├── [...nextauth]/route.ts          # NextAuth handler
│       │   └── register/route.ts               # Registration
│       ├── api/webhooks/
│       │   └── polar/route.ts                  # Polar events (signature-verified)
│       ├── dashboard/
│       │   ├── page.tsx                        # Main chat — drives useScca
│       │   ├── account/page.tsx                # Profile, password, sessions
│       │   ├── api-keys/page.tsx
│       │   ├── billing/page.tsx
│       │   ├── invoices/page.tsx
│       │   ├── usage/page.tsx
│       │   ├── platform/page.tsx
│       │   └── chat/
│       │       ├── new/page.tsx
│       │       └── [id]/page.tsx
│       ├── auth/                               # login + register pages
│       ├── docs/page.tsx
│       └── page.tsx                            # Landing page
```

## Key File Sizes

| File | Lines | Purpose |
|------|-------|---------|
| `lib/crypto/engine.ts` | ~650 | All cryptographic operations (pure — no DB access) |
| `hooks/useScca.ts` | ~540 | Full React state management; every API call |
| `SCCAPreviewPanel.tsx` | ~500 | Preview panel component |
| `SCCAChatArea.tsx` | ~260 | Chat area (presentational) |
| `SCCAMessageBubble.tsx` | ~500 | Message with action buttons |
| `lib/db/client.ts` | ~190 | Conversation data access (only DB path for tokens) |
| `conversations/route.ts` | ~130 | List/create endpoints |
| `[id]/route.ts` | ~230 | Get/update/delete endpoints |
| `messages/route.ts` | ~370 | Send message with streaming |
| `edit/route.ts` | ~430 | Destructive edit/delete/regenerate |
