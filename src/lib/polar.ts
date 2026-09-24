/**
 * SCCA Polar.sh Client
 *
 * Configures the Polar SDK for server-side usage.
 * Supports both sandbox and production environments.
 */

import { Polar } from "@polar-sh/sdk";
import { TIER_LIMITS } from "@/lib/rate-limit";

let polarClient: Polar | null = null;

export function getPolarClient(): Polar {
  if (!polarClient) {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("POLAR_ACCESS_TOKEN environment variable is required");
    }

    polarClient = new Polar({
      accessToken,
      server: (process.env.POLAR_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    });
  }
  return polarClient;
}

/**
 * Get the Polar API base URL for the current environment.
 * Use explicit sandbox vs production endpoints (was confusing before).
 */
export function getPolarApiBase(): string {
  const env = (process.env.POLAR_ENVIRONMENT || "sandbox").toLowerCase();
  // production -> official API; sandbox -> sandbox API
  return env === "production"
    ? "https://api.polar.sh/v1"
    : "https://sandbox-api.polar.sh/v1";
}

/**
 * Map a Polar product to an SCCA billing tier.
 * This maps your Polar.sh products to the internal tier system.
 */
export function mapProductToTier(productId: string, metadata?: Record<string, string>): string {
  // Check metadata first
  if (metadata?.scca_tier) {
    return metadata.scca_tier;
  }

  // Check env-based mapping
  try {
    const tierMap = JSON.parse(process.env.POLAR_TIER_MAP || "{}");
    if (tierMap[productId]) {
      return tierMap[productId];
    }
  } catch (err) {
    console.error("[polar] POLAR_TIER_MAP parse error:", (err as Error).message);
    // Invalid JSON, fall through
  }

  return "free"; // Default fallback
}

// ═════════════════════════════════════════════════════════════════════════════
// ORDER.PAID DECISION LOGIC (pure)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Billing account fields relevant to the order.paid decision.
 * `null` represents an account that doesn't exist yet (upsert create path).
 */
export interface OrderPaidBillingSnapshot {
  totalSpendMicro: bigint;
  monthlySpendMicro: bigint;
  tier: string;
  autoUpgrade: boolean;
}

export interface OrderPaidSpendUpdates {
  totalSpendMicro: bigint;
  monthlySpendMicro: bigint;
}

export interface OrderPaidUpdate {
  /** True when this delivery must record spend (i.e. the invoice is new). */
  shouldRecordSpend: boolean;
  /** Absolute spend values for the upsert create path (undefined on retries). */
  spendUpdates?: OrderPaidSpendUpdates;
  /** Highest tier unlocked by post-increment spend (only when autoUpgrade). */
  upgradedTier?: string;
}

/**
 * Pure decision logic for the order.paid webhook handler.
 *
 * Polar retries webhook deliveries, so spend may only be recorded when the
 * invoice for this order doesn't exist yet. Auto-upgrade is evaluated against
 * the POST-increment spend (current total + this order's amount), never
 * double-adding amountMicro.
 */
export function computeOrderPaidUpdate(
  currentBilling: OrderPaidBillingSnapshot | null,
  amountMicro: number,
  invoiceExists: boolean
): OrderPaidUpdate {
  const shouldRecordSpend = !invoiceExists;
  const result: OrderPaidUpdate = { shouldRecordSpend };

  const currentTotal = currentBilling ? Number(currentBilling.totalSpendMicro) : 0;
  const currentMonthly = currentBilling ? Number(currentBilling.monthlySpendMicro) : 0;

  // What totalSpendMicro will be AFTER this delivery is applied.
  // On retries no increment is applied, so it stays at the current total.
  const postTotalSpend = currentTotal + (shouldRecordSpend ? amountMicro : 0);

  if (shouldRecordSpend) {
    result.spendUpdates = {
      totalSpendMicro: BigInt(currentTotal + amountMicro),
      monthlySpendMicro: BigInt(currentMonthly + amountMicro),
    };
  }

  if (currentBilling?.autoUpgrade) {
    const tierOrder = ["free", "tier_1", "tier_2", "tier_3", "tier_4"];
    const currentIdx = tierOrder.indexOf(currentBilling.tier);
    for (let i = currentIdx + 1; i < tierOrder.length; i++) {
      const nextTier = TIER_LIMITS[tierOrder[i]];
      if (nextTier && postTotalSpend >= nextTier.upgradeThresholdMicro) {
        result.upgradedTier = tierOrder[i];
      }
    }
  }

  return result;
}
