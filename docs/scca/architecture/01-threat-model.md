# SCCA Threat Model

> Extracted from the SCCA v2.0 Canonical Specification

## Threats and Protections

### 1. Database Breach

**Threat:** Attacker gains read access to PostgreSQL.

**Protection:**
- All message content encrypted with AES-256-GCM
- Keys derived from a server-held master secret (`MASTER_KEY_SECRET` env var) + per-user salt — neither stored in the database
- Attacker sees only encrypted blobs and metadata (timestamps, counts, roles)
- Decryption additionally requires compromising the application environment to obtain `MASTER_KEY_SECRET`

### 2. Server Compromise

**Threat:** Attacker gains code execution on application server.

**Impact (honest):**
- The server necessarily holds `MASTER_KEY_SECRET` (it decrypts messages to build AI context), so full code execution can decrypt all conversations
- Mitigations: keep `MASTER_KEY_SECRET` in a secrets manager, rotate it on compromise (re-encrypts nothing by itself — see key rotation notes), audit logging aids detection, and sessions/tokens no longer carry key material
- This is the fundamental tradeoff of server-side AI: end-to-end encryption would require client-side context building

### 3. Network Eavesdropping

**Threat:** Attacker intercepts traffic between client and server.

**Protection:**
- TLS 1.3 encrypts all traffic
- WebSocket connections use WSS (WebSocket Secure)
- No plaintext data transmitted

### 4. Client-Side Attack

**Threat:** Malicious JavaScript in browser.

**Protection:**
- Content Security Policy headers restrict script injection
- Subresource Integrity ensures loaded scripts match expected hashes
- React's built-in escaping mitigates XSS

### 5. Insider Threat

**Threat:** Administrator with database access.

**Protection:**
- Database administrators see encrypted data only
- Audit logs track all administrator access
- Principle of least privilege: app database user has minimal permissions

## Cryptographic Hygiene

| Practice | Implementation |
|----------|---------------|
| Nonce reuse prevention | Random nonces for every encryption operation |
| Timing attack prevention | Constant-time comparison for integrity checks |
| Key rotation | Architecture supports re-encryption with new keys |
| Algorithm safety | No MD5, SHA-1, or 3DES - only modern algorithms |

## Known Tradeoff

SCCA is **not** end-to-end encrypted like Signal. The server must decrypt messages to build AI context, and keys are derived from a server-held master secret (`MASTER_KEY_SECRET`) combined with each user's salt. This is an intentional tradeoff: server-processed AI requires server-side decryption, in exchange for compact encrypted storage and a small attack surface at rest (database alone yields only ciphertext). True zero-knowledge would require client-side key derivation and server-blind context building — a different architecture.
