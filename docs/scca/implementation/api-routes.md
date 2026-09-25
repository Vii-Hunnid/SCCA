# SCCA API Routes

> Server-side implementation of SCCA REST endpoints.

## Route Files

```
app/api/scca/
  conversations/
    route.ts                    → GET (list) + POST (create)
    [id]/
      route.ts                  → GET (viewport pagination + Merkle verification)
                                  + PATCH (update) + DELETE (soft delete)
      messages/
        route.ts                → POST (send message with streaming)
      edit/
        route.ts                → POST (destructive edit/delete/regenerate)
  account/
    route.ts                    → GET (profile) + PATCH (update) + DELETE (delete account)
    password/route.ts           → POST (change password; revokes older sessions)
    sessions/[id]/route.ts      → DELETE (revoke a tracked session)
  keys/
    route.ts                    → GET (list) + POST (create API key)
    [id]/
      route.ts                  → DELETE (revoke API key)
  vault/
    encrypt/route.ts            → POST (encrypt data)
    decrypt/route.ts            → POST (decrypt tokens)
    verify/route.ts             → POST (verify integrity)
  media/
    route.ts                    → GET (list) + POST (upload + encrypt)
    [id]/route.ts               → GET (decrypt + download) + DELETE (remove)
  usage/
    route.ts                    → GET (usage analytics with period filter)
  billing/
    route.ts                    → GET (account/tiers/invoices) + POST (update settings)
    checkout/route.ts           → POST (create Polar checkout session)
    invoices/route.ts           → GET (list invoices)
    invoices/[id]/route.ts      → GET (invoice detail; PDF via Polar REST API)
  rate-limits/
    route.ts                    → GET (current rate limit status)

app/api/auth/
  [...nextauth]/route.ts        → NextAuth handler (credentials + OAuth)
  register/route.ts             → POST (user registration)

app/api/webhooks/
  polar/route.ts                → POST (Polar.sh events; signature-verified, no session)
```

## Authentication Patterns

Most routes resolve the session via `requireUser()` in `lib/session.ts` (which
calls `getServerSession(authOptions)` and rejects revoked/deleted users):

```typescript
import { requireUser } from "@/lib/session";

const auth = await requireUser();
if (!auth) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userId = auth.id;
```

Two exceptions:

- **Vault routes** authenticate through `authenticateRequest()` in
  `lib/api-key-auth.ts`: an `scca_k_` Bearer API key is tried first, with
  fallback to the NextAuth session.
- **The Polar webhook** (`app/api/webhooks/polar/route.ts`) uses no session at
  all — it verifies the Polar webhook signature and is idempotent under retries.

## Send Message Flow (SSE Streaming)

The most complex route. Flow:

```
1. Authenticate user (session via requireUser)
2. Check tier rate limits / monthly budget (429 / 402 on excess)
3. Load conversation from database
4. Derive encryption keys (user key → conversation key)
5. Decrypt existing messages for AI context
6. Pack and persist the user message BEFORE streaming
   (atomic append with optimistic concurrency; 409 on conflict)
7. Call Groq API with streaming
8. Stream tokens to client via SSE
9. On complete: pack assistant response, append to tokens
   (client aborts propagate upstream and discard the partial response)
10. Auto-title from first message (if conversation is new)
11. Update database with final state
12. Record usage (tokens, bytes, latency, cost) for metering
```

### Streaming Response Format

```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    // Stream AI tokens
    for await (const chunk of groqStream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
        );
      }
    }
    // Final event with metadata
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({
        done: true,
        messageCount: newCount,
        title: conversation.title,
      })}\n\n`)
    );
    controller.close();
  },
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

## Destructive Edit Flow

```
1. Authenticate
2. Load conversation + derive keys
3. If action === "delete": truncate at sequence, update DB, return
4. If edit: replace message at sequence with new encrypted content
5. Truncate all tokens after sequence
6. If regenerate: stream new AI response (same SSE format)
7. Update database with final state
```

## Error Handling

All routes return structured errors:

```json
{
  "error": "Human-readable message"
}
```

Status codes:
- `400` - Bad request (missing fields)
- `401` - Unauthorized (no session)
- `404` - Conversation not found
- `429` - Rate limit exceeded
- `402` - Monthly budget exceeded
- `500` - Server error (encryption failure, DB error)

## Rate Limiting

All Vault and Conversation API endpoints enforce rate limits. See `SCCA_Rate_Limits_Billing_Specification.md` for the full specification.

Rate limit headers are included in every response:

```
X-RateLimit-Limit-RPM: 60
X-RateLimit-Remaining-RPM: 45
X-RateLimit-Tier: tier_1
```

## Platform Console Pages

```
app/dashboard/
  page.tsx                      → Main chat (drives the useScca hook)
  account/page.tsx              → Profile, password change, active sessions
  platform/page.tsx             → Platform overview with live rate gauges
  api-keys/page.tsx             → API key management
  usage/page.tsx                → Usage analytics with charts
  billing/page.tsx              → Billing tiers, invoices, settings
  invoices/page.tsx             → Invoice history + preview
```
