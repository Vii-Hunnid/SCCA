/**
 * SCCA Rate Limiting Engine
 *
 * Implements tiered rate limiting modeled after industry standards:
 *   - OpenAI: RPM, RPD, TPM, TPD per tier
 *   - Anthropic: RPM, TPM, monthly spend caps
 *   - xAI: Concurrent requests, RPH
 *   - Google Gemini: RPM, TPM, RPD
 *
 * Tier system: free → tier_1 → tier_2 → tier_3 → tier_4 → enterprise
 * Each tier unlocks higher limits and lower pricing.
 *
 * Rate limits are enforced via sliding window counters in the database.
 */

import { prisma } from "@/lib/prisma";

// ═════════════════════════════════════════════════════════════════════════════
// TIER DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

export interface TierLimits {
  name: string;
  displayName: string;
  rpm: number;           // Requests per minute
  rpd: number;           // Requests per day
  tpm: number;           // Tokens per minute
  tpd: number;           // Tokens per day
  maxApiKeys: number;    // Max active API keys
  maxBytesPerRequest: number; // Max request body size
  monthlyBudgetDefault: number; // Default monthly budget in microdollars (0 = unlimited)
  costPerMillionTokens: number; // Microdollars per 1M tokens
  costPerRequest: number;       // Microdollars per request (vault operations)
  upgradeThresholdMicro: number; // Total spend to auto-upgrade TO this tier
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    name: "free",
    displayName: "Free",
    rpm: 10,
    rpd: 200,
    tpm: 10_000,
    tpd: 200_000,
    maxApiKeys: 3,
    maxBytesPerRequest: 100_000,       // 100 KB
    monthlyBudgetDefault: 0,
    costPerMillionTokens: 0,           // Free tier = no cost
    costPerRequest: 0,
    upgradeThresholdMicro: 0,
  },
  tier_1: {
    name: "tier_1",
    displayName: "Tier 1 — Build",
    rpm: 60,
    rpd: 5_000,
    tpm: 100_000,
    tpd: 5_000_000,
    maxApiKeys: 5,
    maxBytesPerRequest: 500_000,       // 500 KB
    monthlyBudgetDefault: 10_000_000,  // $10
    costPerMillionTokens: 150_000,     // $0.15 per 1M tokens
    costPerRequest: 100,               // $0.0001 per request
    upgradeThresholdMicro: 5_000_000,  // $5 total spend
  },
  tier_2: {
    name: "tier_2",
    displayName: "Tier 2 — Scale",
    rpm: 300,
    rpd: 20_000,
    tpm: 500_000,
    tpd: 20_000_000,
    maxApiKeys: 10,
    maxBytesPerRequest: 1_000_000,     // 1 MB
    monthlyBudgetDefault: 50_000_000,  // $50
    costPerMillionTokens: 120_000,     // $0.12 per 1M tokens
    costPerRequest: 80,                // $0.00008 per request
    upgradeThresholdMicro: 50_000_000, // $50 total spend
  },
  tier_3: {
    name: "tier_3",
    displayName: "Tier 3 — Pro",
    rpm: 1_000,
    rpd: 100_000,
    tpm: 2_000_000,
    tpd: 100_000_000,
    maxApiKeys: 10,
    maxBytesPerRequest: 5_000_000,     // 5 MB
    monthlyBudgetDefault: 200_000_000, // $200
    costPerMillionTokens: 100_000,     // $0.10 per 1M tokens
    costPerRequest: 50,                // $0.00005 per request
    upgradeThresholdMicro: 200_000_000,// $200 total spend
  },
  tier_4: {
    name: "tier_4",
    displayName: "Tier 4 — Enterprise",
    rpm: 5_000,
    rpd: 500_000,
    tpm: 10_000_000,
    tpd: 500_000_000,
    maxApiKeys: 10,
    maxBytesPerRequest: 10_000_000,    // 10 MB
    monthlyBudgetDefault: 0,           // No default cap
    costPerMillionTokens: 80_000,      // $0.08 per 1M tokens
    costPerRequest: 30,                // $0.00003 per request
    upgradeThresholdMicro: 1_000_000_000, // $1,000 total spend
  },
  enterprise: {
    name: "enterprise",
    displayName: "Enterprise — Custom",
    rpm: 10_000,
    rpd: 1_000_000,
    tpm: 50_000_000,
    tpd: 1_000_000_000,
    maxApiKeys: 10,
    maxBytesPerRequest: 50_000_000,    // 50 MB
    monthlyBudgetDefault: 0,
    costPerMillionTokens: 60_000,      // $0.06 per 1M tokens — negotiable
    costPerRequest: 20,
    upgradeThresholdMicro: Infinity,   // Manual upgrade only
  },
};

export const TIER_ORDER = ["free", "tier_1", "tier_2", "tier_3", "tier_4", "enterprise"];

// ═════════════════════════════════════════════════════════════════════════════
// RATE LIMIT CHECKER
// ═════════════════════════════════════════════════════════════════════════════

export interface RateLimitResult {
  allowed: boolean;
  tier: string;
  limits: TierLimits;
  current: {
    rpm: number;
    rpd: number;
    tpm: number;
    tpd: number;
  };
  remaining: {
    rpm: number;
    rpd: number;
    tpm: number;
    tpd: number;
  };
  retryAfterMs?: number;
}

/**
 * Check if a request is within rate limits.
 * Uses sliding window counters from UsageRecord table.
 */
export async function checkRateLimit(
  userId: string,
  tier: string
): Promise<RateLimitResult> {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60_000);
  const oneDayAgo = new Date(now.getTime() - 86_400_000);

  // Query sliding window counts in parallel
  const [minuteStats, dayStats] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: {
        userId,
        createdAt: { gte: oneMinuteAgo },
      },
      _count: { id: true },
      _sum: { totalTokens: true },
    }),
    prisma.usageRecord.aggregate({
      where: {
        userId,
        createdAt: { gte: oneDayAgo },
      },
      _count: { id: true },
      _sum: { totalTokens: true },
    }),
  ]);

  const current = {
    rpm: minuteStats._count.id,
    rpd: dayStats._count.id,
    tpm: minuteStats._sum.totalTokens || 0,
    tpd: dayStats._sum.totalTokens || 0,
  };

  const remaining = {
    rpm: Math.max(0, limits.rpm - current.rpm),
    rpd: Math.max(0, limits.rpd - current.rpd),
    tpm: Math.max(0, limits.tpm - current.tpm),
    tpd: Math.max(0, limits.tpd - current.tpd),
  };

  const allowed =
    current.rpm < limits.rpm &&
    current.rpd < limits.rpd &&
    current.tpm < limits.tpm &&
    current.tpd < limits.tpd;

  let retryAfterMs: number | undefined;
  if (!allowed) {
    // If RPM is exceeded, suggest retrying after the oldest request in the window expires
    if (current.rpm >= limits.rpm) {
      retryAfterMs = 60_000; // worst case: wait a full minute
    } else if (current.rpd >= limits.rpd) {
      retryAfterMs = 86_400_000;
    }
  }

  return { allowed, tier, limits, current, remaining, retryAfterMs };
}

// ═════════════════════════════════════════════════════════════════════════════
// USAGE RECORDER
// ═════════════════════════════════════════════════════════════════════════════

export interface UsageEvent {
  userId: string;
  apiKeyId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  requestTokens?: number;
  responseTokens?: number;
  bytesIn?: number;
  bytesOut?: number;
  latencyMs?: number;
  tier: string;
}

/**
 * Record a usage event and update billing.
 */
export async function recordUsage(event: UsageEvent): Promise<void> {
  const limits = TIER_LIMITS[event.tier] || TIER_LIMITS.free;
  const totalTokens = (event.requestTokens || 0) + (event.responseTokens || 0);

  // Calculate cost
  const tokenCost = Math.floor(
    (totalTokens / 1_000_000) * limits.costPerMillionTokens
  );
  const requestCost = limits.costPerRequest;
  const costMicro = tokenCost + requestCost;

  // Insert usage record (fire-and-forget for performance)
  await prisma.usageRecord.create({
    data: {
      userId: event.userId,
      apiKeyId: event.apiKeyId || null,
      endpoint: event.endpoint,
      method: event.method,
      statusCode: event.statusCode,
      requestTokens: event.requestTokens || 0,
      responseTokens: event.responseTokens || 0,
      totalTokens,
      bytesIn: event.bytesIn || 0,
      bytesOut: event.bytesOut || 0,
      costMicro,
      latencyMs: event.latencyMs || 0,
      rateLimitTier: event.tier,
    },
  });

  // Update billing spend (fire-and-forget)
  if (costMicro > 0) {
    await prisma.billingAccount
      .upsert({
        where: { userId: event.userId },
        create: {
          userId: event.userId,
          tier: event.tier,
          totalSpendMicro: costMicro,
          monthlySpendMicro: costMicro,
        },
        update: {
          totalSpendMicro: { increment: costMicro },
          monthlySpendMicro: { increment: costMicro },
        },
      })
      .catch(() => {});
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// BILLING HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get or create a billing account for a user.
 */
export async function getOrCreateBillingAccount(userId: string) {
  return prisma.billingAccount.upsert({
    where: { userId },
    create: { userId, tier: "free" },
    update: {},
  });
}

/**
 * Format microdollars to display string: 15000000 → "$15.00"
 */
export function formatMicrodollars(micro: number | bigint): string {
  const cents = Number(micro) / 1_000_000;
  return `$${cents.toFixed(2)}`;
}

/**
 * Get the rate limit headers to include in API responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit-RPM": String(result.limits.rpm),
    "X-RateLimit-Limit-RPD": String(result.limits.rpd),
    "X-RateLimit-Limit-TPM": String(result.limits.tpm),
    "X-RateLimit-Remaining-RPM": String(result.remaining.rpm),
    "X-RateLimit-Remaining-RPD": String(result.remaining.rpd),
    "X-RateLimit-Remaining-TPM": String(result.remaining.tpm),
    "X-RateLimit-Tier": result.tier,
    ...(result.retryAfterMs
      ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) }
      : {}),
  };
}

/**
 * Estimate tokens from a string (rough: 1 token ≈ 4 chars).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
