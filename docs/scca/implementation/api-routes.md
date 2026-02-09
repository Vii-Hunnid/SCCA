# SCCA API Routes

> Server-side implementation of SCCA REST endpoints.

## Route Files

```
app/api/scca/
  conversations/
    route.ts                    → GET (list) + POST (create)
    [id]/
      route.ts                  → GET (load) + PATCH (update) + DELETE (soft delete)
      messages/
        route.ts                → POST (send message with streaming)
      edit/
        route.ts                → POST (destructive edit/delete)
  keys/
    route.ts                    → GET (list) + POST (create API key)
    [id]/
      route.ts                  → DELETE (revoke API key)
  vault/
    encrypt/route.ts            → POST (encrypt data)
    decrypt/route.ts            → POST (decrypt tokens)
    verify/route.ts             → POST (verify integrity)
  usage/
    route.ts                    → GET (usage analytics with period filter)
  billing/
    route.ts                    → GET (account/tiers/invoices) + POST (update settings)
  rate-limits/
    route.ts                    → GET (current rate limit status)
```

## Authentication Pattern

All routes use the same auth pattern:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userId = session.user.id;
```

## Send Message Flow (SSE Streaming)

The most complex route. Flow:

```
1. Authenticate user
2. Load conversation from database
3. Derive encryption keys (user key → conversation key)
4. Decrypt existing messages for AI context
5. Pack and append user message to tokens
6. Call Groq API with streaming
7. Stream tokens to client via SSE
8. On complete: pack assistant response, append to tokens
9. Auto-title from first message (if conversation is new)
10. Update database with final state
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
  platform/page.tsx             → Platform overview with live rate gauges
  api-keys/page.tsx             → API key management
  usage/page.tsx                → Usage analytics with charts
  billing/page.tsx              → Billing tiers, invoices, settings
```
