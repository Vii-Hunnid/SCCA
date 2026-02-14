/**
 * POST /api/scca/billing/checkout — Create a Polar checkout URL
 *
 * Generates a checkout link for upgrading to a paid tier.
 * The user is redirected to Polar's hosted checkout page.
 *
 * Request:
 *   { tier?: string, productId?: string }
 *
 * - If `tier` is provided (e.g. "tier_2"), looks up the product ID from POLAR_TIER_MAP.
 * - If `productId` is provided directly, uses that.
 * - Otherwise falls back to the first product in POLAR_TIER_MAP or POLAR_DEFAULT_PRODUCT_ID.
 *
 * Response:
 *   { url: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPolarClient } from "@/lib/polar";

/**
 * Parse POLAR_TIER_MAP and return a { productId -> tierName } map
 * and a reverse { tierName -> productId } map.
 */
function parseTierMap(): {
  byProduct: Record<string, string>;
  byTier: Record<string, string>;
} {
  const byProduct: Record<string, string> = {};
  const byTier: Record<string, string> = {};
  try {
    const raw = process.env.POLAR_TIER_MAP || "";
    const parsed = JSON.parse(raw);
    for (const [productId, tierName] of Object.entries(parsed)) {
      if (typeof tierName === "string") {
        byProduct[productId] = tierName;
        byTier[tierName] = productId;
      }
    }
  } catch {
    // Invalid JSON — maps will be empty
  }
  return { byProduct, byTier };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let { productId, tier } = body;

    const { byProduct, byTier } = parseTierMap();

    // If tier name provided, look up the product ID
    if (!productId && tier && typeof tier === "string") {
      productId = byTier[tier];
    }

    // If still no productId, use the first product from the map
    if (!productId) {
      const firstProduct = Object.keys(byProduct)[0];
      if (firstProduct) {
        productId = firstProduct;
      }
    }

    // Final fallback to dedicated env var
    if (!productId) {
      productId = process.env.POLAR_DEFAULT_PRODUCT_ID;
    }

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "No product configured. Set POLAR_TIER_MAP or POLAR_DEFAULT_PRODUCT_ID in your environment variables.",
        },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${appUrl}/dashboard/billing?checkout=success`,
      customerEmail: session.user.email,
      metadata: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { error: err.message || "Failed to create checkout" },
      { status: 500 }
    );
  }
}
