# SCCA API Contracts

> REST API endpoints for SCCA conversation operations.

## Base URL

```
/api/scca/conversations
```

## Authentication

All endpoints require NextAuth session. The `user.id` is extracted from the JWT session token.

---

## Endpoints

### List Conversations

```
GET /api/scca/conversations
```

**Response:** `200 OK`
```json
[
  {
    "id": "clx1234...",
    "title": "New Chat",
    "model": "llama-3.3-70b-versatile",
    "messageCount": 12,
    "createdAt": "2026-02-01T00:00:00.000Z",
    "updatedAt": "2026-02-01T12:00:00.000Z"
  }
]
```

---

### Create Conversation

```
POST /api/scca/conversations
```

**Body:**
```json
{
  "title": "Optional title",
  "model": "llama-3.3-70b-versatile"
}
```

**Response:** `201 Created`
```json
{
  "id": "clx1234...",
  "title": "New Chat",
  "model": "llama-3.3-70b-versatile",
  "messageCount": 0,
  "createdAt": "2026-02-01T00:00:00.000Z",
  "updatedAt": "2026-02-01T00:00:00.000Z"
}
```

---

### Get Conversation (with decrypted messages)

```
GET /api/scca/conversations/[id]?offset=0&limit=50
```

**Query Parameters:**
- `offset` (optional): Starting message index for viewport loading
- `limit` (optional): Number of messages to return

**Response:** `200 OK`
```json
{
  "id": "clx1234...",
  "title": "My Chat",
  "model": "llama-3.3-70b-versatile",
  "messageCount": 12,
  "messages": [
    {
      "id": "msg-0",
      "role": "user",
      "content": "Hello!",
      "sequence": 0,
      "timestamp": 1706745600
    },
    {
      "id": "msg-1",
      "role": "assistant",
      "content": "Hi there! How can I help?",
      "sequence": 1,
      "timestamp": 1706745601
    }
  ]
}
```

---

### Update Conversation (rename/change model)

```
PATCH /api/scca/conversations/[id]
```

**Body:**
```json
{
  "title": "New Title",
  "model": "llama-3.1-8b-instant"
}
```

**Response:** `200 OK`

---

### Delete Conversation (soft delete)

```
DELETE /api/scca/conversations/[id]
```

**Response:** `200 OK`

---

### Send Message (with streaming)

```
POST /api/scca/conversations/[id]/messages
```

**Body:**
```json
{
  "content": "Explain quantum computing",
  "temperature": 0.7,
  "top_p": 1,
  "max_tokens": 8192,
  "model": "llama-3.3-70b-versatile",
  "systemPrompt": "You are Gunther, a helpful AI assistant."
}
```

**Response:** `200 OK` (Server-Sent Events stream)
```
data: {"token":"Quantum"}
data: {"token":" computing"}
data: {"token":" is"}
...
data: {"done":true,"messageCount":4,"title":"Quantum Computing Explained"}
```

---

### Edit/Delete Message (destructive)

```
POST /api/scca/conversations/[id]/edit
```

**Body (edit):**
```json
{
  "sequence": 2,
  "content": "Updated message content",
  "regenerate": true,
  "temperature": 0.7,
  "systemPrompt": "You are Gunther."
}
```

**Body (delete):**
```json
{
  "action": "delete",
  "sequence": 4
}
```

**Response:** `200 OK` (SSE stream if regenerating, JSON otherwise)
