/**
 * POST /api/scca/billing/checkout — Create a Polar checkout session
 *
 * Request body: { tier?: string, productId?: string }
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
    const parsed = raw ? JSON.parse(raw) : {};
    for (const [productId, tierName] of Object.entries(parsed)) {
      if (typeof tierName === "string") {
        byProduct[productId] = tierName;
        byTier[tierName] = productId;
      }
    }
  } catch (err) {
    console.error("[billing/checkout] POLAR_TIER_MAP parse error:", (err as Error).message);
  }
  return { byProduct, byTier };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fail fast if essential env vars missing
    if (!process.env.POLAR_ACCESS_TOKEN) {
      console.error("[billing/checkout] Missing POLAR_ACCESS_TOKEN");
      return NextResponse.json(
        { error: "Payment provider not configured (POLAR_ACCESS_TOKEN missing)" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let { productId, tier } = body as { productId?: string; tier?: string };

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
      console.error("[billing/checkout] No product configured - POLAR_TIER_MAP and POLAR_DEFAULT_PRODUCT_ID empty");
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

    let checkout: any;
    try {
      const polar = getPolarClient();
      checkout = await polar.checkouts.create({
        products: [productId],
        successUrl: `${appUrl}/dashboard/billing?checkout=success`,
        customerEmail: session.user.email,
        metadata: {
          userId: session.user.id,
        },
      });
    } catch (err: any) {
      // Make sure the log includes helpful context (but no secrets)
      console.error("[billing/checkout] polar.checkouts.create failed", {
        userId: session.user.id,
        productId,
        envPolarEnv: process.env.POLAR_ENVIRONMENT,
        message: err?.message,
        stack: err?.stack,
      });
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error("[billing/checkout] unexpected error:", err);
    return NextResponse.json({ error: err.message || "Failed to create checkout" }, { status: 500 });
  }
}
