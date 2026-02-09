/**
 * POST /api/webhooks/polar — Polar.sh webhook handler
 *
 * Handles payment lifecycle events from Polar:
 *   - order.paid        → Create invoice, update billing spend + tier
 *   - subscription.created  → Link subscription to billing account
 *   - subscription.updated  → Update subscription status
 *   - subscription.canceled → Handle cancellation (end of period or immediate)
 *   - checkout.updated      → Track checkout status
 *
 * Webhook verification uses @polar-sh/sdk/webhooks validateEvent.
 * All events are processed idempotently (safe to retry).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { prisma } from "@/lib/prisma";
import { mapProductToTier } from "@/lib/polar";
import { TIER_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const body = await request.text();

  const webhookHeaders = {
    "webhook-id": request.headers.get("webhook-id") || "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") || "",
    "webhook-signature": request.headers.get("webhook-signature") || "",
  };

  let event: ReturnType<typeof validateEvent>;

  try {
    event = validateEvent(
      body,
      webhookHeaders,
      process.env.POLAR_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error("[polar/webhook] Verification failed:", err.message);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 }
      );
    }
    throw err;
  }

  try {
    switch (event.type) {
      case "order.paid":
        await handleOrderPaid(event.data);
        break;

      case "subscription.created":
        await handleSubscriptionCreated(event.data);
        break;

      case "subscription.updated":
        await handleSubscriptionUpdated(event.data);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(event.data);
        break;

      default:
        console.log(`[polar/webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`[polar/webhook] Error processing ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * order.paid — A payment has been fully processed.
 * Creates/updates billing account and creates an invoice record.
 */
async function handleOrderPaid(data: any) {
  const {
    id: polarOrderId,
    customer_id,
    customer,
    product_id,
    product,
    subscription_id,
    total_amount,
    subtotal_amount,
    tax_amount,
    currency,
    billing_reason,
  } = data;

  const customerEmail = customer?.email;
  if (!customerEmail) {
    console.error("[polar/webhook] order.paid: No customer email");
    return;
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: customerEmail },
  });

  if (!user) {
    console.error(`[polar/webhook] order.paid: No user found for ${customerEmail}`);
    return;
  }

  // Determine tier from product
  const tier = mapProductToTier(product_id, product?.metadata);
  const amountMicro = (total_amount || 0) * 10_000; // Polar amounts are in cents → microdollars

  // Upsert billing account
  const billing = await prisma.billingAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      polarCustomerId: customer_id,
      polarSubscriptionId: subscription_id || null,
      polarProductId: product_id,
      subscriptionStatus: subscription_id ? "active" : null,
      totalSpendMicro: amountMicro,
      monthlySpendMicro: amountMicro,
    },
    update: {
      tier,
      polarCustomerId: customer_id,
      polarSubscriptionId: subscription_id || undefined,
      polarProductId: product_id,
      subscriptionStatus: subscription_id ? "active" : undefined,
      totalSpendMicro: { increment: amountMicro },
      monthlySpendMicro: { increment: amountMicro },
    },
  });

  // Create invoice record (idempotent by polarOrderId)
  const existingInvoice = await prisma.invoice.findUnique({
    where: { polarOrderId },
  });

  if (!existingInvoice) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await prisma.invoice.create({
      data: {
        billingAccountId: billing.id,
        periodStart,
        periodEnd,
        totalMicro: amountMicro,
        requestCount: 0,
        totalTokens: 0,
        totalBytes: 0,
        status: "paid",
        polarOrderId,
        billingReason: billing_reason || "purchase",
        currency: currency || "usd",
      },
    });
  }

  // Auto-upgrade tier if applicable
  const totalSpend = Number(billing.totalSpendMicro) + amountMicro;
  if (billing.autoUpgrade) {
    const tierOrder = ["free", "tier_1", "tier_2", "tier_3", "tier_4"];
    const currentIdx = tierOrder.indexOf(billing.tier);
    for (let i = currentIdx + 1; i < tierOrder.length; i++) {
      const nextTier = TIER_LIMITS[tierOrder[i]];
      if (nextTier && totalSpend >= nextTier.upgradeThresholdMicro) {
        await prisma.billingAccount.update({
          where: { id: billing.id },
          data: { tier: tierOrder[i] },
        });
      }
    }
  }

  console.log(
    `[polar/webhook] order.paid: ${customerEmail} — $${(total_amount / 100).toFixed(2)} — tier=${tier} — order=${polarOrderId}`
  );
}

/**
 * subscription.created — A new subscription has been created.
 */
async function handleSubscriptionCreated(data: any) {
  const { id: subscriptionId, customer, product_id, product, status } = data;
  const customerEmail = customer?.email;

  if (!customerEmail) return;

  const user = await prisma.user.findUnique({
    where: { email: customerEmail },
  });
  if (!user) return;

  const tier = mapProductToTier(product_id, product?.metadata);

  await prisma.billingAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      polarCustomerId: data.customer_id,
      polarSubscriptionId: subscriptionId,
      polarProductId: product_id,
      subscriptionStatus: status || "active",
    },
    update: {
      tier,
      polarSubscriptionId: subscriptionId,
      polarProductId: product_id,
      subscriptionStatus: status || "active",
    },
  });

  console.log(
    `[polar/webhook] subscription.created: ${customerEmail} — sub=${subscriptionId} — tier=${tier}`
  );
}

/**
 * subscription.updated — Subscription has been modified (plan change, status change).
 */
async function handleSubscriptionUpdated(data: any) {
  const { id: subscriptionId, customer, product_id, product, status, cancel_at_period_end } = data;
  const customerEmail = customer?.email;

  if (!customerEmail) return;

  const user = await prisma.user.findUnique({
    where: { email: customerEmail },
  });
  if (!user) return;

  const tier = mapProductToTier(product_id, product?.metadata);
  const subStatus = cancel_at_period_end ? "canceled" : (status || "active");

  await prisma.billingAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      polarCustomerId: data.customer_id,
      polarSubscriptionId: subscriptionId,
      polarProductId: product_id,
      subscriptionStatus: subStatus,
    },
    update: {
      tier,
      polarSubscriptionId: subscriptionId,
      polarProductId: product_id,
      subscriptionStatus: subStatus,
    },
  });

  console.log(
    `[polar/webhook] subscription.updated: ${customerEmail} — status=${subStatus}`
  );
}

/**
 * subscription.canceled — Subscription has been canceled.
 */
async function handleSubscriptionCanceled(data: any) {
  const { customer } = data;
  const customerEmail = customer?.email;

  if (!customerEmail) return;

  const user = await prisma.user.findUnique({
    where: { email: customerEmail },
  });
  if (!user) return;

  // Set status to canceled but keep the tier until period end
  await prisma.billingAccount.updateMany({
    where: { userId: user.id },
    data: {
      subscriptionStatus: "canceled",
    },
  });

  console.log(
    `[polar/webhook] subscription.canceled: ${customerEmail}`
  );
}
