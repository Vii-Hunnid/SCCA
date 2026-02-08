# SCCA vs Other Approaches

> Extracted from the SCCA v2.0 Canonical Specification

## Comparison Table

| Approach | Pros | Cons | SCCA Advantage |
|----------|------|------|----------------|
| **Traditional SQL** (row per message) | Easy queries, full-text search | High overhead, slow joins | 60% less storage, single-query loads |
| **MongoDB** (document with array) | Similar structure, flexible schema | No built-in encryption, larger overhead | Native encryption, better compression |
| **JWT per message** (early Gunther design) | Self-contained, portable, signed | 300+ bytes per message, immutable | 90% smaller, editable |
| **Blockchain/Ledger** | Extreme tamper resistance | Enormous overhead, slow | Merkle tree integrity without blockchain cost |
| **Signal Protocol** (E2E) | Server can't read anything | Complex key management, no server AI | User controls keys, server processes AI |

## Detailed Comparisons

### vs Traditional SQL

Traditional: Each message = database row with foreign keys.

```
SCCA:  1 query  → full conversation
SQL:   2+ joins → conversation + messages + users
```

SCCA wins on: storage (60% less), read speed (no joins), write atomicity (one transaction).
SQL wins on: searchability, individual message access, familiar tooling.

### vs JWT-Per-Message

The original Gunther design used JWTs for each message token.

```
JWT message:  ~300+ bytes overhead (header.payload.signature)
SCCA message: ~24 bytes overhead (header + nonce + tag)
```

JWTs are immutable by design - you can't edit them without breaking the signature. SCCA's binary format allows re-encryption with the same sequence number.

### vs End-to-End Encryption (Signal)

Signal: Server sees **nothing**. Client-side encryption only.

SCCA tradeoff: Server **must** decrypt to process AI requests. But:
- User controls the master key
- Keys exist in memory only during active sessions
- Database breach without active sessions = useless data

This is the right tradeoff for an AI assistant. Full E2E would mean no server-side AI processing.
