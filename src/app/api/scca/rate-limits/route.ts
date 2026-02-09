/**
 * GET /api/scca/rate-limits — Get current rate limit status for the user
 *
 * Returns real-time rate limit consumption and limits per tier.
 * Headers are also set on every Vault/Conversation API response.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getOrCreateBillingAccount,
  checkRateLimit,
  TIER_LIMITS,
  TIER_ORDER,
} from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const billing = await getOrCreateBillingAccount(session.user.id);
    const result = await checkRateLimit(session.user.id, billing.tier);
    const limits = TIER_LIMITS[billing.tier] || TIER_LIMITS.free;

    return NextResponse.json({
      tier: billing.tier,
      tierDisplay: limits.displayName,
      allowed: result.allowed,
      current: result.current,
      limits: {
        rpm: limits.rpm,
        rpd: limits.rpd,
        tpm: limits.tpm,
        tpd: limits.tpd,
        maxApiKeys: limits.maxApiKeys,
        maxBytesPerRequest: limits.maxBytesPerRequest,
      },
      remaining: result.remaining,
      retryAfterMs: result.retryAfterMs || null,
      usage: {
        rpm: {
          used: result.current.rpm,
          limit: limits.rpm,
          percent: Math.round((result.current.rpm / limits.rpm) * 100),
        },
        rpd: {
          used: result.current.rpd,
          limit: limits.rpd,
          percent: Math.round((result.current.rpd / limits.rpd) * 100),
        },
        tpm: {
          used: result.current.tpm,
          limit: limits.tpm,
          percent: Math.round((result.current.tpm / limits.tpm) * 100),
        },
        tpd: {
          used: result.current.tpd,
          limit: limits.tpd,
          percent: Math.round((result.current.tpd / limits.tpd) * 100),
        },
      },
      allTiers: TIER_ORDER.map((t) => ({
        name: t,
        displayName: TIER_LIMITS[t].displayName,
        rpm: TIER_LIMITS[t].rpm,
        rpd: TIER_LIMITS[t].rpd,
        tpm: TIER_LIMITS[t].tpm,
        tpd: TIER_LIMITS[t].tpd,
        isCurrent: t === billing.tier,
      })),
    });
  } catch (err: any) {
    console.error("[rate-limits/GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch rate limits" },
      { status: 500 }
    );
  }
}
