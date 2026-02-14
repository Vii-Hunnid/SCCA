/**
 * POST /api/scca/billing/checkout — Create a Polar checkout URL
 *
 * Generates a checkout link for upgrading to a paid tier.
 * The user is redirected to Polar's hosted checkout page.
 *
 * Request:
 *   { productId?: string }
 *
 * If no productId is provided, uses the first product from POLAR_TIER_MAP
 * or falls back to POLAR_DEFAULT_PRODUCT_ID.
 *
 * Response:
 *   { url: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPolarClient } from "@/lib/polar";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let { productId } = body;

    // If no productId provided, try to get one from config
    if (!productId) {
      // Try POLAR_TIER_MAP first
      const rawTierMap = process.env.POLAR_TIER_MAP || "";
      try {
        const tierMap = JSON.parse(rawTierMap);
        const productIds = Object.keys(tierMap);
        if (productIds.length > 0) {
          productId = productIds[0];
        }
      } catch (parseErr) {
        console.warn(
          `[billing/checkout] POLAR_TIER_MAP is not valid JSON: "${rawTierMap}". Falling back to POLAR_DEFAULT_PRODUCT_ID.`
        );
      }

      // Fallback to dedicated env var
      if (!productId) {
        productId = process.env.POLAR_DEFAULT_PRODUCT_ID;
      }
    }

    if (!productId) {
      return NextResponse.json(
        {
          error:
            "No product configured. Set POLAR_TIER_MAP (as valid JSON, e.g. {\"product-uuid\":\"tier_1\"}) or POLAR_DEFAULT_PRODUCT_ID in your environment variables.",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

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
