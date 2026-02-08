# SCCA Data Flow

> Extracted from the SCCA v2.0 Canonical Specification

## Scenario A: User Sends a New Message

```
1. User types message → presses Enter
2. UI shows message in "pending" state (optimistic update)
3. Message sent to server via API/WebSocket
4. Server decrypts existing conversation history (in memory)
5. Server streams user message + context to AI provider
6. AI tokens streamed back → forwarded to all connected clients
7. AI finishes → server encrypts both user message and AI response
8. Encrypted blobs appended to conversation's message array
9. Database updated with new blobs, message count, Merkle root
10. All clients receive "complete" event → pending state removed
```

## Scenario B: User Edits a Previous Message (Destructive)

```
1. User clicks Edit on message #5 (of 10 messages)
2. UI enters edit mode → textarea with current content
3. User modifies text → clicks Save
4. Confirmation: "This will delete all messages after this point
   and regenerate the response. Cannot be undone."
5. Edit request sent to server
6. Server locks the conversation row (prevent race conditions)
7. Server creates new encrypted blob for message #5 (new content)
8. Server TRUNCATES array → keeps messages 1-4 + new message 5
9. Messages 6-10 permanently deleted (no archive)
10. Database updated with shorter array
11. "conversation-truncated" event broadcast to all clients
12. Auto-regeneration begins → AI streams new response
13. New response becomes message #6
```

## Scenario C: User Loads an Existing Conversation

```
1. User opens conversation from list → loading state
2. Client checks local cache (IndexedDB, if recent)
3. Client requests messages from server (viewport: e.g. messages 40-60)
4. Server retrieves single database row
5. Server decrypts only requested message blobs (not entire history)
6. Decrypted messages sent to client → display + cache updated
7. User scrolls → triggers additional viewport requests
```

## Binary Message Lifecycle

```
                 User Input
                     │
                     ▼
              ┌─────────────┐
              │  Plain Text  │  "Hello, how are you?"
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  10-byte     │  version(1) + role(1) + sequence(2)
              │  Header      │  + timestamp(4) + flags(2)
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  zlib        │  ~40-60% size reduction
              │  Compress    │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  AES-256-GCM │  Encrypt with conversation key
              │  Encrypt     │  + 12-byte nonce + 16-byte auth tag
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  Base64      │  Store as text in String[] array
              │  Encode      │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  PostgreSQL  │  Append to messageTokens column
              │  String[]    │  Update messageCount + merkleRoot
              └─────────────┘
```
