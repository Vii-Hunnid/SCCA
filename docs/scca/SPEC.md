# SCCA v2.0 - Canonical Specification

> **Status:** Frozen
> **Version:** 2.0.0
> **Date:** February 2026
> **License:** MIT

This is the source-of-truth specification for the Secure Compact Chat Architecture (SCCA). Everything in `/docs/scca/` is derived from this document and the implementation guide.

## What is SCCA?

SCCA is a privacy-first, storage-efficient chat architecture that treats conversations as single encrypted documents rather than collections of individual message rows. It was designed for AI chat applications where users need fast, private, editable conversations.

## Documentation Structure

```
docs/scca/
  SPEC.md                              <- You are here (canonical spec)

  architecture/
    00-philosophy.md                   <- Core principles and design intent
    01-threat-model.md                 <- Security threats and protections
    02-data-flow.md                    <- How data moves through the system
    03-storage-model.md                <- Database design and efficiency
    04-destructive-editing.md          <- The edit = truncate + regenerate model
    05-comparisons.md                  <- SCCA vs other approaches

  implementation/
    prisma.md                          <- Database schema and Prisma setup
    crypto.md                          <- Cryptographic engine details
    api-routes.md                      <- REST API endpoints
    preview-panel.md                   <- SCCA Preview Panel implementation guide

  reference/
    directory-structure.md             <- Project file layout
    api-contracts.md                   <- API request/response schemas
    vocabulary.md                      <- Locked terminology definitions
```

## Rules for This Specification

1. **No experiments inside it** - Only intentional, versioned revisions
2. **Everything else is derived** - The big implementation guide and this doc are the source of truth
3. **Vocabulary is locked** - Terms defined in `reference/vocabulary.md` mean exactly one thing
4. **Revisions are versioned** - v2.1, v3.0, etc. with changelog

## Quick Reference

| Aspect | SCCA Approach |
|--------|---------------|
| Storage | Single row per conversation, messages as encrypted `String[]` |
| Encryption | AES-256-GCM with per-conversation keys via HKDF-SHA256 |
| Editing | Destructive: truncate after edit point, auto-regenerate |
| Integrity | SHA-256 Merkle tree across all message tokens |
| Binary Format | 10-byte header + zlib compressed + encrypted content |
| Overhead | ~24 bytes per message vs ~300-500 bytes traditional |
| Timeline | Linear only - no branches, no edit history |
| Privacy | User-controlled keys derived from master secret |

## Source Files

- **Architecture Spec:** `Secure Compact Chat Architecture (SCCA).md` (plain text, philosophy-first)
- **Implementation Guide:** `Gunther AI: Secure Compact Chat Architecture (SCCA).md` (~4000 lines, literate specification)

---

## Implementation Addendum (codebase, September 2026)

The frozen spec above describes the architecture; this addendum records deliberate
implementation decisions in the v2 codebase that extend or tighten it. Spec text
takes precedence where they conflict; these are engineering choices, not spec changes.

1. **Binary format v2** — the length field is uint32 (4 bytes) instead of uint16.
   v1's 64KB ciphertext cap caused 500s on large incompressible messages. Writers
   emit v2 (`version = 0x02`); readers accept v1 and v2. No data migration required.

2. **Encryption posture is at-rest, not zero-knowledge** — the master key is derived
   per request from `MASTER_KEY_SECRET` + the user's salt (`src/lib/session.ts`).
   It is never placed in the JWT. The server decrypts messages to build AI context.
   See `architecture/01-threat-model.md`.

3. **Session revocation** — `users.password_changed_at` rejects sessions issued
   before the last password change; `users.deleted_at` revokes all access
   immediately (sessions and API keys alike).

4. **Concurrency** — appends use atomic `updateMany` with an optimistic
   `messageCount` check (`appendMessageAtomically`); destructive edits replace the
   token array with the same check. Conflicts return 409, never silent loss.
   The Merkle root is extended incrementally (`computeNextMerkleRoot`), O(1) per
   append, rather than re-chained over the whole conversation.

5. **Durability ordering** — the user message is persisted before the AI stream
   starts; the assistant token is persisted only after a complete stream. Client
   aborts propagate to the upstream Groq request and discard partial responses.

6. **Metering** — chat endpoints are rate-limited and usage-metered like the vault.
   Usage cost accrues to `usage_spend_micro`; `total_spend_micro` tracks
   subscription payments and drives auto-upgrade. Monthly budgets are enforced in
   `checkRateLimit`; billing cycles roll over lazily.

7. **Webhook idempotency** — Polar events dedupe by `polarOrderId` before any
   spend mutation; auto-upgrade evaluates post-increment spend exactly once.

8. **Media safety** — uploaded MIME types are re-derived from magic bytes; SVG is
   served as `attachment` only; filenames are sanitized into Content-Disposition.
