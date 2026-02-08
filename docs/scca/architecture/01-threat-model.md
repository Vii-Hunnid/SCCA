# SCCA Threat Model

> Extracted from the SCCA v2.0 Canonical Specification

## Threats and Protections

### 1. Database Breach

**Threat:** Attacker gains read access to PostgreSQL.

**Protection:**
- All message content encrypted with AES-256-GCM
- Encryption keys derived from user passwords, not stored in database
- Attacker sees only encrypted blobs and metadata (timestamps, counts)
- Without user passwords, decryption is computationally infeasible

### 2. Server Compromise

**Threat:** Attacker gains code execution on application server.

**Protection:**
- Master keys exist only in memory during active sessions
- No plaintext key storage on disk
- Compromised server can only decrypt conversations of **currently active** users
- Audit logging helps detect compromise

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

SCCA is **not** end-to-end encrypted like Signal. The server must decrypt messages to build AI context. This is an intentional tradeoff: server processes AI requests (must decrypt), but user controls the keys. A fully compromised server can only access conversations of currently active sessions.
