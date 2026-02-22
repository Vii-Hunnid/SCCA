# SCCA API Tester - Specification

## Original Request

> Create an interactive API testing interface for SCCA at `api.scca.com/test` where users can paste their API key and test all endpoints including POST/GET/DELETE/PATCH for vault/encrypt, vault/verify, vault/decrypt, and other available endpoints. Include batch testing capability (100 requests).

## What Was Created

### Files Created
1. `app/pages/scca/test.vue` - Full-featured Nuxt 3 page with Vue 3
2. `public/scca/test.html` - Standalone HTML version (works anywhere)
3. `server/api/scca-proxy/[...path].ts` - Server-side proxy to avoid CORS

### Current Features
- [x] API Key input with show/hide toggle
- [x] Connection test button
- [x] Endpoint selection sidebar organized by category:
  - Vault (encrypt, decrypt, verify)
  - Conversations (CRUD + messages)
  - Account & Billing
  - Media
- [x] Request builder with:
  - Path parameters
  - Query parameters
  - Custom headers
  - JSON body editor with formatting
  - File upload support
- [x] Response viewer with syntax highlighting
- [x] Request history (last 50)
- [x] Batch testing (1-100 requests) with statistics
- [x] Response time tracking
- [x] Success/failure rate display

## Current Status

**Working**: ✅ Functional in local development
**Deployed**: ⚠️ Needs to be hosted on SCCA API domain

## What's Still Needed

### 1. Hosting Location
Move the standalone HTML file to the SCCA API server:
- Copy `public/scca/test.html` to `api.scca.com/test.html`
- Or host at `https://api.scca.com/test`
- Update the base URL in the HTML from `/api/scca-proxy` to actual SCCA API

### 2. Environment Configuration
The standalone HTML needs these environment variables:
```javascript
const SCCA_API_BASE_URL = 'https://api.scca.com'; // Production SCCA API
```

### 3. CORS Configuration
Ensure the SCCA API allows CORS from the test page domain:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

### 4. API Key Authentication
The test page expects API keys in format: `scca_...`
The key is sent in the Authorization header: `Bearer {apiKey}`

## Endpoint Categories to Support

### Vault Endpoints
- `POST /api/scca/vault/encrypt` - Encrypt data with AES-256-GCM
- `POST /api/scca/vault/decrypt` - Decrypt SCCA tokens
- `POST /api/scca/vault/verify` - Verify Merkle-HMAC integrity

### Conversation Endpoints
- `GET /api/scca/conversations` - List conversations
- `POST /api/scca/conversations` - Create conversation
- `GET /api/scca/conversations/:id` - Get conversation
- `PATCH /api/scca/conversations/:id` - Update conversation
- `DELETE /api/scca/conversations/:id` - Delete conversation
- `POST /api/scca/conversations/:id/messages` - Send message

### Account Endpoints
- `GET /api/scca/account` - Get account info
- `PATCH /api/scca/account` - Update account
- `DELETE /api/scca/account` - Delete account
- `GET /api/scca/keys` - List API keys
- `POST /api/scca/keys` - Create API key
- `GET /api/scca/usage` - Get usage stats
- `GET /api/scca/rate-limits` - Get rate limits
- `GET /api/scca/billing` - Get billing info
- `POST /api/scca/billing` - Update billing

### Media Endpoints
- `GET /api/scca/media` - List media
- `POST /api/scca/media` - Upload media

## Technical Specifications

### Request Format
```javascript
{
  method: 'POST',
  headers: {
    'Authorization': 'Bearer scca_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: ['message to encrypt'],
    context: 'my-app'
  })
}
```

### Response Format (Vault Encrypt)
```javascript
{
  tokens: ['encrypted_token_1', 'encrypted_token_2'],
  merkleRoot: 'hash_string',
  context: 'my-app',
  metadata: {
    itemCount: 2,
    originalBytes: 100,
    encryptedBytes: 150,
    compressionRatio: 1.5,
    cipher: 'AES-256-GCM'
  }
}
```

## UI/UX Requirements

### Design
- Dark theme (gray-950 background)
- Emerald accents for success states
- Method badges (GET=blue, POST=green, PATCH=yellow, DELETE=red)
- Collapsible sidebar sections
- Responsive layout

### Batch Testing
- Input: Number of requests (1-100)
- Output: Success count, failure count, average latency, RPS
- Progress bar for success rate
- List of individual request results

## Security Considerations

1. **API Key Storage**: Keys are stored in localStorage only, never sent to any server except SCCA API
2. **HTTPS Only**: All requests should be made over HTTPS
3. **No Logging**: The test page should not log API keys or sensitive data

## Files to Reference

- `/Users/viihunnidm2/property-prompt-ai/public/scca/test.html` - Standalone version
- `/Users/viihunnidm2/property-prompt-ai/app/pages/scca/test.vue` - Nuxt version
- `/Users/viihunnidm2/property-prompt-ai/server/api/scca-proxy/[...path].ts` - Proxy implementation

## Next Steps for Implementation

1. Copy `public/scca/test.html` to SCCA project
2. Update the base URL to `https://api.scca.com`
3. Remove the proxy code (not needed if hosted on same domain)
4. Deploy to `api.scca.com/test`
5. Test with a real SCCA API key

## Additional Features to Consider (Future)

- [ ] Save/load request collections
- [ ] Environment variable support
- [ ] Response schema validation
- [ ] Auto-generated code snippets (curl, JS, Python)
- [ ] WebSocket testing for streaming endpoints
- [ ] Response time graphs over time

---

**Created by**: Kimi Code CLI
**Date**: 2026-02-22
**Project**: Property Prompt AI (SCCA Integration)
