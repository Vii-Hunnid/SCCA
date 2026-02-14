/**
 * GET /api/scca/billing/invoices — List all invoices for the authenticated user
 *
 * Returns invoices from the database (created by Polar webhooks on order.paid)
 * with summary stats for the UI.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateBillingAccount, TIER_LIMITS, formatMicrodollars } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const billing = await getOrCreateBillingAccount(session.user.id);

    const invoices = await prisma.invoice.findMany({
      where: { billingAccountId: billing.id },
      orderBy: { createdAt: "desc" },
    });

    const tierDisplay = TIER_LIMITS[billing.tier]?.displayName || billing.tier;

    // Build formatted invoice list
    const formatted = invoices.map((inv, idx) => {
      const totalCents = Number(inv.totalMicro) / 10_000; // microdollars → cents
      const totalDollars = totalCents / 100;

      // Generate a human-readable invoice number
      const invoiceNumber = `SCCA-${String(invoices.length - idx).padStart(4, "0")}`;

      // Derive description from billing reason + tier
      let description = "SCCA Connect Subscription";
      switch (inv.billingReason) {
        case "subscription_create":
          description = `SCCA Connect ${tierDisplay} — New Subscription`;
          break;
        case "subscription_cycle":
          description = `SCCA Connect ${tierDisplay} — Monthly Renewal`;
          break;
        case "subscription_update":
          description = `SCCA Connect ${tierDisplay} — Plan Change`;
          break;
        case "purchase":
          description = `SCCA Connect ${tierDisplay} — One-time Purchase`;
          break;
      }

      return {
        id: inv.id,
        invoiceNumber,
        description,
        totalCents: Math.round(totalCents),
        totalDollars,
        totalDisplay: totalDollars >= 0.01 ? `$${totalDollars.toFixed(2)}` : formatMicrodollars(inv.totalMicro),
        status: inv.status.toUpperCase() as "PAID" | "PENDING" | "DRAFT" | "OVERDUE" | "VOID",
        periodStart: inv.periodStart.toISOString(),
        periodEnd: inv.periodEnd.toISOString(),
        paidAt: inv.status === "paid" ? inv.createdAt.toISOString() : null,
        dueDate: inv.periodEnd.toISOString(),
        createdAt: inv.createdAt.toISOString(),
        currency: inv.currency,
        billingReason: inv.billingReason || null,
        requestCount: inv.requestCount,
        totalTokens: Number(inv.totalTokens),
        totalBytes: Number(inv.totalBytes),
        polarOrderId: inv.polarOrderId || null,
        polarInvoiceUrl: inv.polarInvoiceUrl || null,
        hasInvoice: !!inv.polarOrderId,
      };
    });

    // Summary stats
    const totalPaid = formatted
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.totalDollars, 0);

    const totalPending = formatted
      .filter((inv) => inv.status === "PENDING" || inv.status === "DRAFT")
      .reduce((sum, inv) => sum + inv.totalDollars, 0);

    return NextResponse.json({
      invoices: formatted,
      summary: {
        totalPaid,
        totalPending,
        invoiceCount: formatted.length,
      },
      tier: billing.tier,
      tierDisplay,
      subscriptionStatus: billing.subscriptionStatus || null,
    });
  } catch (err: any) {
    console.error("[billing/invoices/GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
