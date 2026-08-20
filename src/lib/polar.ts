/**
 * SCCA Polar.sh Client
 *
 * Configures the Polar SDK for server-side usage.
 * Supports both sandbox and production environments.
 */

import { Polar } from "@polar-sh/sdk";

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
  const env = process.env.POLAR_ENVIRONMENT || "sandbox";
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

  return "tier_1"; // Default fallback
}
