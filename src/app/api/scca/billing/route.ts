/**
 * GET  /api/scca/billing — Get billing account, tier info, and invoices
 * POST /api/scca/billing — Update billing settings (budget, auto-upgrade)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateBillingAccount,
  TIER_LIMITS,
  TIER_ORDER,
  formatMicrodollars,
} from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const billing = await getOrCreateBillingAccount(userId);

    // Get invoices
    const invoices = await prisma.invoice.findMany({
      where: { billingAccountId: billing.id },
      orderBy: { periodStart: "desc" },
      take: 12,
    });

    // Build tier comparison table
    const tiers = TIER_ORDER.map((tierName) => {
      const limits = TIER_LIMITS[tierName];
      return {
        name: limits.name,
        displayName: limits.displayName,
        rpm: limits.rpm,
        rpd: limits.rpd,
        tpm: limits.tpm,
        tpd: limits.tpd,
        maxApiKeys: limits.maxApiKeys,
        maxBytesPerRequest: limits.maxBytesPerRequest,
        costPerMillionTokens: limits.costPerMillionTokens,
        costPerRequest: limits.costPerRequest,
        upgradeThresholdDisplay: limits.upgradeThresholdMicro === Infinity
          ? "Contact sales"
          : formatMicrodollars(limits.upgradeThresholdMicro),
        isCurrent: limits.name === billing.tier,
      };
    });

    // Current tier index for progress display
    const currentTierIndex = TIER_ORDER.indexOf(billing.tier);
    const nextTier = currentTierIndex < TIER_ORDER.length - 1
      ? TIER_ORDER[currentTierIndex + 1]
      : null;
    const nextTierLimits = nextTier ? TIER_LIMITS[nextTier] : null;

    return NextResponse.json({
      account: {
        id: billing.id,
        tier: billing.tier,
        tierDisplay: TIER_LIMITS[billing.tier]?.displayName || billing.tier,
        totalSpendMicro: Number(billing.totalSpendMicro),
        monthlySpendMicro: Number(billing.monthlySpendMicro),
        monthlyBudgetMicro: Number(billing.monthlyBudgetMicro),
        totalSpendDisplay: formatMicrodollars(billing.totalSpendMicro),
        monthlySpendDisplay: formatMicrodollars(billing.monthlySpendMicro),
        monthlyBudgetDisplay: billing.monthlyBudgetMicro > 0
          ? formatMicrodollars(billing.monthlyBudgetMicro)
          : "No limit",
        billingCycleStart: billing.billingCycleStart.toISOString(),
        autoUpgrade: billing.autoUpgrade,
        hasPaymentMethod: !!billing.polarCustomerId,
        polarCustomerId: billing.polarCustomerId || null,
        subscriptionStatus: billing.subscriptionStatus || null,
        polarSubscriptionId: billing.polarSubscriptionId || null,
      },
      upgrade: nextTier
        ? {
            nextTier: nextTier,
            nextTierDisplay: nextTierLimits?.displayName || nextTier,
            spendRequired: formatMicrodollars(
              nextTierLimits?.upgradeThresholdMicro || 0
            ),
            spendRequiredMicro: nextTierLimits?.upgradeThresholdMicro || 0,
            currentSpendMicro: Number(billing.totalSpendMicro),
            progressPercent: nextTierLimits?.upgradeThresholdMicro
              ? Math.min(
                  100,
                  Math.round(
                    (Number(billing.totalSpendMicro) /
                      nextTierLimits.upgradeThresholdMicro) *
                      100
                  )
                )
              : 0,
          }
        : null,
      tiers,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
        totalDisplay: formatMicrodollars(inv.totalMicro),
        totalMicro: Number(inv.totalMicro),
        requestCount: inv.requestCount,
        totalTokens: Number(inv.totalTokens),
        totalBytes: Number(inv.totalBytes),
        status: inv.status,
        polarOrderId: inv.polarOrderId || null,
        polarInvoiceUrl: inv.polarInvoiceUrl || null,
        billingReason: inv.billingReason || null,
        currency: inv.currency,
        hasInvoice: !!inv.polarOrderId,
      })),
    });
  } catch (err: any) {
    console.error("[billing/GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch billing data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { monthlyBudgetMicro, autoUpgrade } = body;

    const updates: Record<string, unknown> = {};
    if (typeof monthlyBudgetMicro === "number" && monthlyBudgetMicro >= 0) {
      updates.monthlyBudgetMicro = monthlyBudgetMicro;
    }
    if (typeof autoUpgrade === "boolean") {
      updates.autoUpgrade = autoUpgrade;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const billing = await prisma.billingAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...updates,
      },
      update: updates,
    });

    return NextResponse.json({
      message: "Billing settings updated",
      tier: billing.tier,
      monthlyBudgetMicro: Number(billing.monthlyBudgetMicro),
      autoUpgrade: billing.autoUpgrade,
    });
  } catch (err: any) {
    console.error("[billing/POST]", err);
    return NextResponse.json(
      { error: "Failed to update billing settings" },
      { status: 500 }
    );
  }
}
