# SCCA Rate Limits, Billing & Consumption Specification

## Version 1.0 | API Platform Console | 2026-02-09

---

## 1. Overview

This specification defines how SCCA enforces rate limits, tracks consumption, and handles billing for its Vault API and Conversation API endpoints. The design is modeled after industry-leading API platforms:

- **OpenAI** — RPM, RPD, TPM, TPD per usage tier
- **Anthropic (Claude)** — RPM, TPM, monthly spend caps, tier-based scaling
- **xAI (Grok)** — Concurrent requests, consumption-based billing
- **Google Gemini** — RPM, TPM, RPD with free tier
- **DeepSeek** — Token-based pricing with rate windows
- **Perplexity** — Admin-managed rate limits and usage tiers
- **Moonshot** — Sliding window rate limits with burst handling
- **X (Twitter) API** — Per-endpoint rate limits with tier system

### 1.1 Design Principles

| Principle | Description |
|-----------|-------------|
| **Transparent** | Rate limit status exposed via headers and dashboard |
| **Fair** | Sliding window counters prevent burst abuse while allowing legitimate spikes |
| **Tiered** | Higher spend unlocks higher limits automatically |
| **Metered** | Every request is tracked for billing accuracy |
| **Secure** | Rate limiting data is isolated per-user (no cross-tenant leakage) |

---

## 2. Rate Limit Concepts

### 2.1 Metrics

| Metric | Full Name | Description |
|--------|-----------|-------------|
| **RPM** | Requests Per Minute | Max API calls in a 60-second sliding window |
| **RPD** | Requests Per Day | Max API calls in a 24-hour sliding window |
| **TPM** | Tokens Per Minute | Max tokens processed in a 60-second window |
| **TPD** | Tokens Per Day | Max tokens processed in a 24-hour window |

### 2.2 Sliding Window Algorithm

Rate limits use **sliding window counters** — not fixed windows. This means:

- At any point in time, the system counts requests/tokens from the past N seconds
- No "reset at minute boundary" — limits slide continuously
- Prevents the thundering herd problem at window boundaries

```
Time:    |-------- 60s window --------|
         ← older requests    newer → |NOW|

If RPM=60, any request that would make the count
within the past 60 seconds exceed 60 is rejected.
```

### 2.3 Token Estimation

For SCCA's Vault API (which encrypts/decrypts arbitrary data), tokens are estimated as:

```
tokens ≈ ceil(string_length / 4)
```

This approximation matches the industry standard (1 token ≈ 4 characters).

---

## 3. Usage Tiers

SCCA uses a 6-tier system. Tiers upgrade automatically based on cumulative lifetime spend.

### 3.1 Tier Definitions

| Tier | Display Name | RPM | RPD | TPM | TPD | Max Keys | Unlock At |
|------|-------------|-----|-----|-----|-----|----------|-----------|
| `free` | Free | 10 | 200 | 10K | 200K | 3 | $0 |
| `tier_1` | Tier 1 — Build | 60 | 5K | 100K | 5M | 5 | $5 |
| `tier_2` | Tier 2 — Scale | 300 | 20K | 500K | 20M | 10 | $50 |
| `tier_3` | Tier 3 — Pro | 1,000 | 100K | 2M | 100M | 10 | $200 |
| `tier_4` | Tier 4 — Enterprise | 5,000 | 500K | 10M | 500M | 10 | $1,000 |
| `enterprise` | Enterprise — Custom | 10,000 | 1M | 50M | 1B | 10 | Contact |

### 3.2 Pricing Per Tier

| Tier | Cost per 1M Tokens | Cost per Request |
|------|-------------------|-----------------|
| Free | $0.00 | $0.0000 |
| Tier 1 | $0.15 | $0.0001 |
| Tier 2 | $0.12 | $0.00008 |
| Tier 3 | $0.10 | $0.00005 |
| Tier 4 | $0.08 | $0.00003 |
| Enterprise | $0.06 (negotiable) | $0.00002 |

### 3.3 Auto-Upgrade Logic

When `auto_upgrade = true` and lifetime spend crosses the threshold:

```
if (totalSpend >= nextTier.upgradeThreshold && autoUpgrade) {
  account.tier = nextTier.name;
  // Rate limits increase immediately
}
```

Enterprise tier requires manual upgrade (contact sales).

---

## 4. Rate Limit Enforcement

### 4.1 Request Flow

```
Client Request
     │
     ▼
┌─────────────────────┐
│  Authentication     │  ← API Key (Bearer) or Session
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Rate Limit Check   │  ← Query sliding window counters
│  (RPM, RPD, TPM,    │
│   TPD, Budget)      │
└─────────┬───────────┘
          │
     ┌────┴────┐
     │ Allowed? │
     └────┬────┘
    Yes   │   No
     │    │    │
     ▼    │    ▼
  Process │  Return 429
  Request │  + Retry-After
     │    │  + Rate limit headers
     ▼    │
┌─────────────────────┐
│  Record Usage       │  ← UsageRecord created
│  Update Billing     │  ← Spend incremented
└─────────────────────┘
```

### 4.2 HTTP 429 Response

When rate limited, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "type": "rate_limit_error",
  "tier": "free",
  "limit": "rpm",
  "current": 10,
  "max": 10,
  "retryAfterMs": 60000
}
```

### 4.3 Rate Limit Headers

Every API response includes rate limit headers:

```
X-RateLimit-Limit-RPM: 60
X-RateLimit-Limit-RPD: 5000
X-RateLimit-Limit-TPM: 100000
X-RateLimit-Remaining-RPM: 45
X-RateLimit-Remaining-RPD: 4821
X-RateLimit-Remaining-TPM: 82500
X-RateLimit-Tier: tier_1
Retry-After: 60  (only if rate limited)
```

---

## 5. Usage Metering

### 5.1 What Is Tracked

Every API request creates a `UsageRecord` with:

| Field | Description |
|-------|-------------|
| `endpoint` | e.g., `vault/encrypt`, `vault/decrypt`, `conversations/messages` |
| `method` | HTTP method |
| `statusCode` | Response status code |
| `requestTokens` | Input tokens (estimated from request body) |
| `responseTokens` | Output tokens (estimated from response body) |
| `totalTokens` | Sum of request + response tokens |
| `bytesIn` | Request body size in bytes |
| `bytesOut` | Response body size in bytes |
| `costMicro` | Cost in microdollars (1 microdollar = $0.000001) |
| `latencyMs` | Request processing time |
| `rateLimitTier` | Tier at time of request |

### 5.2 Cost Calculation

```
cost = (totalTokens / 1,000,000) × costPerMillionTokens + costPerRequest
```

Costs are stored as **microdollars** (integers) to avoid floating-point precision issues:
- $1.00 = 1,000,000 microdollars
- $0.01 = 10,000 microdollars

---

## 6. Billing

### 6.1 Billing Account

Each user has one `BillingAccount` with:

- **tier** — Current usage tier
- **totalSpendMicro** — Lifetime cumulative spend
- **monthlySpendMicro** — Current billing period spend
- **monthlyBudgetMicro** — User-set monthly spend cap (0 = no cap)
- **autoUpgrade** — Whether to auto-upgrade tier on threshold
- **billingCycleStart** — Start of current billing period

### 6.2 Budget Enforcement

When `monthlyBudgetMicro > 0`:

```
if (monthlySpend + estimatedCost > monthlyBudget) {
  return 402 Payment Required
  // "Monthly budget exceeded"
}
```

### 6.3 Invoices

At the end of each billing cycle, an `Invoice` is generated:

- Period start/end dates
- Total cost (microdollars)
- Total requests, tokens, bytes
- Status: `draft` → `pending` → `paid` (or `overdue`)
- Stripe invoice ID (when payment integration is active)

---

## 7. API Endpoints

### 7.1 Rate Limits

```
GET /api/scca/rate-limits
```

Returns current rate limit status, remaining quotas, and tier comparison.

### 7.2 Usage Analytics

```
GET /api/scca/usage?period=24h
```

Query params: `period` = `1h` | `24h` | `7d` | `30d`

Returns: summary stats, timeline, breakdown by endpoint, breakdown by API key.

### 7.3 Billing

```
GET  /api/scca/billing          — Account, tiers, invoices
POST /api/scca/billing          — Update budget/auto-upgrade settings
```

---

## 8. Dashboard Pages

The API Platform Console provides three management pages:

### 8.1 Platform Console (`/dashboard/platform`)
- Quick overview with live rate limit gauges
- Navigation cards to API Keys, Usage, and Billing
- Full tier comparison table

### 8.2 API Keys (`/dashboard/api-keys`)
- Create/revoke API keys
- View key prefix, creation date, last used, expiry
- Quick usage example with curl

### 8.3 Usage (`/dashboard/usage`)
- Summary cards: requests, tokens, latency, cost
- Rate limit status bars (RPM, RPD, TPM, TPD)
- Request timeline chart (area chart)
- Token consumption chart (bar chart)
- Breakdown by endpoint and by API key

### 8.4 Billing (`/dashboard/billing`)
- Current tier display and monthly/lifetime spend
- Upgrade progress bar
- Budget cap and auto-upgrade settings
- Tier comparison table with pricing
- Invoice history

---

## 9. Data Model

### 9.1 UsageRecord

```prisma
model UsageRecord {
  id             String   @id
  userId         String
  apiKeyId       String?
  endpoint       String
  method         String
  statusCode     Int
  requestTokens  Int      @default(0)
  responseTokens Int      @default(0)
  totalTokens    Int      @default(0)
  bytesIn        Int      @default(0)
  bytesOut       Int      @default(0)
  costMicro      Int      @default(0)
  latencyMs      Int      @default(0)
  rateLimitTier  String   @default("free")
  createdAt      DateTime @default(now())
}
```

### 9.2 BillingAccount

```prisma
model BillingAccount {
  id                 String   @id
  userId             String   @unique
  tier               String   @default("free")
  totalSpendMicro    BigInt   @default(0)
  monthlySpendMicro  BigInt   @default(0)
  monthlyBudgetMicro BigInt   @default(0)
  billingCycleStart  DateTime @default(now())
  autoUpgrade        Boolean  @default(false)
  paymentMethodId    String?
  stripeCustomerId   String?
}
```

### 9.3 Invoice

```prisma
model Invoice {
  id               String   @id
  billingAccountId String
  periodStart      DateTime
  periodEnd        DateTime
  totalMicro       BigInt   @default(0)
  requestCount     Int      @default(0)
  totalTokens      BigInt   @default(0)
  totalBytes       BigInt   @default(0)
  status           String   @default("draft")
  stripeInvoiceId  String?
}
```

---

## 10. Integration with SCCA Media Specification

The rate limiting system applies to all SCCA operations, including media handling described in the **SCCA Complete Media & Format Specification** and **SCCA Media Compression & Encryption Implementation Guide**:

| Operation | Token Estimation | Billing |
|-----------|-----------------|---------|
| Text encryption (`.md.scca`, `.txt.scca`) | `ceil(length / 4)` | Per-token + per-request |
| JSON/CSV encryption (`.json.scca`, `.csv.scca`) | `ceil(length / 4)` | Per-token + per-request |
| Binary encryption (images, video, audio) | `ceil(bytes / 4)` | Per-token + per-request |
| Vault encrypt/decrypt | `ceil(data_length / 4)` | Per-token + per-request |
| Conversation messages | `ceil(content_length / 4)` | Per-token + per-request |
| Integrity verification | 0 tokens | Per-request only |

This ensures that clients using SCCA for media encryption (as defined in the media specs) pay proportionally for their consumption, regardless of the file format being encrypted.

---

## 11. Future Considerations

- **Stripe Integration** — Connect `stripeCustomerId` for automatic payment processing
- **Webhook Notifications** — Alert users when approaching rate limits or budget caps
- **Per-Key Rate Limits** — Individual rate limits per API key (not just per user)
- **Custom Enterprise Tiers** — Negotiated limits and pricing for enterprise customers
- **Usage Alerts** — Email/webhook when usage exceeds configurable thresholds
- **Reserved Capacity** — Pre-purchased token blocks at discounted rates

---

*This specification is part of the SCCA architecture documentation suite. For encryption details, see `SPEC.md`. For media handling, see `SCCA_Complete_Media_Specification.md`.*
