# SCCA Directory Structure

> Files that make up the SCCA implementation in Gunther AI.

```
G-nther/
├── docs/scca/                                  # Documentation (you are here)
│   ├── SPEC.md                                 # Canonical specification
│   ├── architecture/                           # Why decisions were made
│   │   ├── 00-philosophy.md
│   │   ├── 01-threat-model.md
│   │   ├── 02-data-flow.md
│   │   ├── 03-storage-model.md
│   │   ├── 04-destructive-editing.md
│   │   └── 05-comparisons.md
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
│   └── schema.prisma                           # SCCAConversation + AuditLog models
│
├── lib/
│   ├── crypto/
│   │   └── engine.ts                           # Core cryptographic engine (~400 lines)
│   │       ├── getServerMasterKey()
│   │       ├── deriveUserKey()
│   │       ├── deriveConversationKey()
│   │       ├── deriveIntegrityKey()
│   │       ├── packMessage()
│   │       ├── unpackMessage()
│   │       ├── peekMessageHeader()
│   │       ├── computeMerkleRoot()
│   │       ├── appendMessage()
│   │       ├── decryptMessages()
│   │       ├── destructiveEdit()
│   │       └── destructiveDelete()
│   └── db/
│       └── client.ts                           # Prisma helpers for SCCA CRUD
│
├── hooks/
│   └── useScca.ts                              # React hook (~400 lines)
│       ├── fetchConversations()
│       ├── createConversation()
│       ├── loadConversation()
│       ├── sendMessage()                       # With streaming
│       ├── stopStreaming()
│       ├── editMessage()                       # Destructive edit
│       ├── deleteMessage()
│       ├── regenerateLastResponse()
│       ├── deleteConversation()
│       └── updateConversationTitle()
│
├── components/chat/
│   ├── SCCAChatArea.tsx                        # Shared chat message area
│   └── SCCAMessageBubble.tsx                   # Individual message with action buttons
│       ├── Copy button
│       ├── Edit button (user messages only)
│       ├── Regenerate button (last assistant only)
│       └── Delete button
│
├── app/api/scca/
│   └── conversations/
│       ├── route.ts                            # GET (list) + POST (create)
│       └── [id]/
│           ├── route.ts                        # GET + PATCH + DELETE
│           ├── messages/
│           │   └── route.ts                    # POST (send + stream)
│           └── edit/
│               └── route.ts                    # POST (destructive edit/delete)
│
├── app/dashboard/chat/
│   └── page.tsx                                # Full sidebar + SCCA chat
│
├── app/dashboard/playground/
│   └── page.tsx                                # Parameter tuning + SCCA
│
└── app/console/playground/
    ├── page.tsx                                # Advanced playground + SCCA
    └── components/
        └── SCCAPreviewPanel.tsx                # Preview panel with metrics
```

## Key File Sizes

| File | Lines | Purpose |
|------|-------|---------|
| `lib/crypto/engine.ts` | ~400 | All cryptographic operations |
| `hooks/useScca.ts` | ~400 | Full React state management |
| `SCCAPreviewPanel.tsx` | ~345 | Preview panel component |
| `SCCAChatArea.tsx` | ~100 | Shared chat area wrapper |
| `SCCAMessageBubble.tsx` | ~150 | Message with action buttons |
| `conversations/route.ts` | ~60 | List/create endpoints |
| `[id]/route.ts` | ~100 | Get/update/delete endpoints |
| `messages/route.ts` | ~150 | Send message with streaming |
| `edit/route.ts` | ~120 | Destructive edit/delete |
