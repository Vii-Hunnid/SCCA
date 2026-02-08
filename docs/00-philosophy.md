# SCCA Philosophy and Design Principles

> Extracted from the SCCA v2.0 Canonical Specification

## Core Stance

Conversations are **ephemeral thinking tools**, not permanent records. They should be private, malleable, and focused on the present moment. The past can be edited away without guilt. The system should get out of the way and let users think.

## Five Principles

### 1. Destructive Editing

When a user edits message #5 in a 10-message conversation, messages 6-10 are **permanently deleted**. Not archived. Not versioned. Removed completely. The system then regenerates new responses from message #5.

This matches how people think: *"Change what I said, then continue from there."*

### 2. Minimal Storage Overhead

Every byte costs money and slows backups. SCCA uses ~24 bytes of overhead per message vs 200-300 bytes traditional, 800+ bytes JWT-based. A 1,000-message conversation: ~85 KB instead of 800 KB - 2 MB.

### 3. User-Controlled Encryption

The server **cannot read message content** without the user's master key. The master key is derived from the user's password and never stored in plaintext on the server. Database breach = useless encrypted blobs.

### 4. Linear Timeline Only

No branches. No edit history. Only the current state. This radical simplicity reduces code complexity, eliminates edge cases, and creates a predictable user experience.

### 5. Real-Time Synchronization

Multiple clients viewing the same conversation see updates simultaneously. Edit in one tab, all other tabs reflect the truncation and begin showing regenerated content.

## Why This Architecture

For AI chat applications, users treat conversations as **thinking spaces**:
- Try different phrasings (edit and regenerate)
- Keep conversations focused (delete digressions)
- Fast, responsive interactions
- Trust that data is private

### What Was Rejected

| Approach | Rejection Reason |
|----------|-----------------|
| Branching timelines (ChatGPT-style) | Creates cognitive overhead - "which conversation am I in?" |
| Append-only with edit history | Fills context window with outdated information |
| Client-side only storage | Prevents multi-device access, backup nightmares |
| Server-side plaintext storage | Unnecessary privacy risk |

## The Reuse Potential

SCCA is not just "a chat system." It's a **core primitive** reusable for:
- Analytics explanations
- UX feedback systems
- AI copilots
- Internal tools
- Client-facing assistants
- Token-based billing systems
