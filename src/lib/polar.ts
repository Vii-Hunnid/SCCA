/**
 * SCCA Polar.sh Client
 *
 * Configures the Polar SDK for server-side usage.
 * Supports both sandbox and production environments.
 *
 * Environment variables:
 *   POLAR_ACCESS_TOKEN  — Organization access token from Polar dashboard
 *   POLAR_WEBHOOK_SECRET — Webhook signing secret
 *   POLAR_ENVIRONMENT   — "sandbox" or "production" (default: "sandbox")
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
 */
export function getPolarApiBase(): string {
  const env = process.env.POLAR_ENVIRONMENT || "sandbox";
  return env === "production"
    ? "https://sandbox-api.polar.sh"
    : "https://sandbox-api.polar.sh/v1/checkouts/";
}

/**
 * Map a Polar product to an SCCA billing tier.
 * This maps your Polar.sh products to the internal tier system.
 *
 * Configure via POLAR_TIER_MAP env var as JSON, e.g.:
 *   {"prod_xxx": "tier_1", "prod_yyy": "tier_2"}
 *
 * Or use product metadata with a "scca_tier" key.
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
  } catch {
    // Invalid JSON, fall through
  }

  return "tier_1"; // Default to tier_1 for any paid product
}
