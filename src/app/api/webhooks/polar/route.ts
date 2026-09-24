/**
 * POST /api/webhooks/polar — Polar.sh webhook handler
 *
 * Handles payment lifecycle events from Polar:
 *   - order.paid        → Create invoice, update billing spend + tier
 *   - order.refunded    → Downgrade billing account to free
 *   - subscription.created  → Link subscription to billing account
 *   - subscription.updated  → Update subscription status
 *   - subscription.canceled → Handle cancellation (end of period or immediate)
 *   - subscription.revoked  → Revoke access, downgrade to free
 *   - checkout.updated      → Track checkout status (no-op, logged)
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
import { computeOrderPaidUpdate, mapProductToTier } from "@/lib/polar";

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
    // If signature verification fails, log headers + small payload snippet for triage (do NOT log secret)
    if (err instanceof WebhookVerificationError) {
      console.error("[polar/webhook] Verification failed:", {
        message: err.message,
        headers: webhookHeaders,
        snippet: body.slice(0, 200), // small snippet for context
      });
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 }
      );
    }
    console.error("[polar/webhook] validateEvent threw:", err);
    throw err;
  }

  try {
    // Log basic event metadata for debugging
    console.log(`[polar/webhook] Received event`, {
      type: event.type,
      id: (event.data && event.data.id) || (event as any).id || null,
    });

    switch (event.type) {
      case "order.paid":
        await handleOrderPaid(event.data);
        break;

      case "order.refunded":
        await handleOrderRefunded(event.data);
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

      case "subscription.revoked":
        await handleSubscriptionRevoked(event.data);
        break;

      case "checkout.updated":
        await handleCheckoutUpdated(event.data);
        break;

      default:
        console.log(`[polar/webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Log the full payload and error to assist debugging
    console.error(`[polar/webhook] Error processing ${event?.type}:`, {
      message: err?.message,
      stack: err?.stack,
      eventType: event?.type,
      eventId: event?.data?.id || (event as any).id,
      eventSnippet: JSON.stringify(event?.data).slice(0, 1000),
    });
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
 * Resolve the SCCA userId from checkout metadata carried on the event payload.
 * The Polar SDK exposes metadata top-level on Order/Subscription; also check a
 * nested checkout object defensively in case the payload shape differs.
 */
function resolveMetadataUserId(data: any): string | null {
  const raw =
    data?.metadata?.userId ??
    data?.checkout?.metadata?.userId ??
    data?.checkout_metadata?.userId ??
    null;
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  return str.length > 0 ? str : null;
}

/**
 * Find the SCCA user for a Polar event: prefer the userId stored in checkout
 * metadata, fall back to a lowercased customer email lookup.
 */
async function findUserForEvent(data: any) {
  const metadataUserId = resolveMetadataUserId(data);
  if (metadataUserId) {
    const user = await prisma.user.findUnique({ where: { id: metadataUserId } });
    if (user) return user;
  }

  const email = data?.customer?.email?.toLowerCase();
  if (email) {
    return prisma.user.findUnique({ where: { email } });
  }

  return null;
}

/**
 * order.paid — A payment has been fully processed.
 * Creates/updates billing account and creates an invoice record.
 *
 * Idempotency: Polar retries deliveries, so spend is only recorded when the
 * invoice for this order doesn't exist yet (deduped by polarOrderId).
 */
async function handleOrderPaid(data: any) {
  // The SDK parses payloads to camelCase; keep snake_case fallbacks in case a
  // raw or older payload shape arrives.
  const polarOrderId = data.id;
  const polarCustomerId = data.customerId ?? data.customer_id ?? null;
  const productId = data.productId ?? data.product_id ?? null;
  const subscriptionId = data.subscriptionId ?? data.subscription_id ?? null;
  const totalAmount = data.totalAmount ?? data.total_amount ?? 0;
  const currency = data.currency ?? "usd";
  const billingReason = data.billingReason ?? data.billing_reason ?? "purchase";
  const customerEmail = data.customer?.email ?? null;
  const product = data.product ?? null;

  if (!polarOrderId) {
    console.error("[polar/webhook] order.paid: No order id");
    return;
  }

  const user = await findUserForEvent(data);
  if (!user) {
    console.error(
      `[polar/webhook] order.paid: No user found for ${customerEmail || resolveMetadataUserId(data) || "unknown"}`
    );
    return;
  }

  // Determine tier from product
  const tier = mapProductToTier(productId, product?.metadata);
  const amountMicro = totalAmount * 10_000; // Polar amounts are in cents → microdollars

  // Check for an existing invoice FIRST: retries of this event must not
  // inflate spend, even though the upsert below still runs (to keep
  // customer/tier linkage fresh).
  const existingInvoice = await prisma.invoice.findUnique({
    where: { polarOrderId },
  });

  const currentBilling = await prisma.billingAccount.findUnique({
    where: { userId: user.id },
  });

  const decision = computeOrderPaidUpdate(
    currentBilling
      ? {
          totalSpendMicro: currentBilling.totalSpendMicro,
          monthlySpendMicro: currentBilling.monthlySpendMicro,
          tier: currentBilling.tier,
          autoUpgrade: currentBilling.autoUpgrade,
        }
      : null,
    amountMicro,
    Boolean(existingInvoice)
  );

  // Upsert billing account — spend increments are gated on the invoice being new
  const billing = await prisma.billingAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      polarCustomerId,
      polarSubscriptionId: subscriptionId,
      polarProductId: productId,
      subscriptionStatus: subscriptionId ? "active" : null,
      totalSpendMicro: decision.spendUpdates?.totalSpendMicro ?? 0,
      monthlySpendMicro: decision.spendUpdates?.monthlySpendMicro ?? 0,
    },
    update: {
      tier,
      polarCustomerId,
      polarSubscriptionId: subscriptionId || undefined,
      polarProductId: productId,
      subscriptionStatus: subscriptionId ? "active" : undefined,
      ...(decision.shouldRecordSpend
        ? {
            totalSpendMicro: { increment: amountMicro },
            monthlySpendMicro: { increment: amountMicro },
          }
        : {}),
    },
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
        billingReason,
        currency,
      },
    });
  }

  // Auto-upgrade tier if applicable (decision computed against post-increment spend)
  if (decision.upgradedTier && decision.upgradedTier !== billing.tier) {
    await prisma.billingAccount.update({
      where: { id: billing.id },
      data: { tier: decision.upgradedTier },
    });
  }

  console.log(
    `[polar/webhook] order.paid: ${customerEmail || user.id} — $${(totalAmount / 100).toFixed(2)} — tier=${tier} — order=${polarOrderId}${existingInvoice ? " (retry, spend already recorded)" : ""}`
  );
}

/**
 * order.refunded — A payment was refunded.
 * Downgrade the billing account to the free tier and mark the subscription canceled.
 */
async function handleOrderRefunded(data: any) {
  const customerEmail = data?.customer?.email ?? null;
  const user = await findUserForEvent(data);
  if (!user) {
    console.error(`[polar/webhook] order.refunded: No user found for ${customerEmail || "unknown"}`);
    return;
  }

  await prisma.billingAccount.updateMany({
    where: { userId: user.id },
    data: { tier: "free", subscriptionStatus: "canceled" },
  });

  console.log(
    `[polar/webhook] order.refunded: ${customerEmail || user.id} — downgraded to free — order=${data?.id}`
  );
}

/**
 * subscription.created — A new subscription has been created.
 */
async function handleSubscriptionCreated(data: any) {
  const subscriptionId = data.id;
  const productId = data.productId ?? data.product_id ?? null;
  const status = data.status;
  const customerEmail = data.customer?.email ?? null;

  const user = await findUserForEvent(data);
  if (!user) {
    console.error(`[polar/webhook] subscription.created: No user found for ${customerEmail || "unknown"}`);
    return;
  }

  const tier = mapProductToTier(productId, data.product?.metadata);

  await prisma.billingAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      polarCustomerId: data.customerId ?? data.customer_id ?? null,
      polarSubscriptionId: subscriptionId,
      polarProductId: productId,
      subscriptionStatus: status || "active",
    },
    update: {
      tier,
      polarSubscriptionId: subscriptionId,
      polarProductId: productId,
      subscriptionStatus: status || "active",
    },
  });

  console.log(
    `[polar/webhook] subscription.created: ${customerEmail || user.id} — sub=${subscriptionId} — tier=${tier}`
  );
}

/**
 * subscription.updated — Subscription has been modified (plan change, status change).
 */
async function handleSubscriptionUpdated(data: any) {
  const subscriptionId = data.id;
  const productId = data.productId ?? data.product_id ?? null;
  const status = data.status;
  const customerEmail = data.customer?.email ?? null;

  const user = await findUserForEvent(data);
  if (!user) {
    console.error(`[polar/webhook] subscription.updated: No user found for ${customerEmail || "unknown"}`);
    return;
  }

  const tier = mapProductToTier(productId, data.product?.metadata);

  await prisma.billingAccount.updateMany({
    where: { userId: user.id },
    data: {
      tier,
      polarSubscriptionId: subscriptionId,
      polarProductId: productId,
      subscriptionStatus: status || undefined,
    },
  });

  console.log(`[polar/webhook] subscription.updated: ${customerEmail || user.id} — sub=${subscriptionId} — status=${status}`);
}

/**
 * subscription.canceled — Handle cancellations
 */
async function handleSubscriptionCanceled(data: any) {
  const subscriptionId = data.id;
  const status = data.status;
  const customerEmail = data.customer?.email ?? null;

  const user = await findUserForEvent(data);
  if (!user) {
    console.error(`[polar/webhook] subscription.canceled: No user found for ${customerEmail || "unknown"}`);
    return;
  }

  await prisma.billingAccount.updateMany({
    where: { userId: user.id, polarSubscriptionId: subscriptionId },
    data: { subscriptionStatus: status || "canceled" },
  });

  console.log(`[polar/webhook] subscription.canceled: ${customerEmail || user.id} — sub=${subscriptionId} — status=${status}`);
}

/**
 * subscription.revoked — Access revoked (e.g. after a refund or dispute).
 * Downgrade the billing account to the free tier.
 */
async function handleSubscriptionRevoked(data: any) {
  const subscriptionId = data.id;
  const status = data.status;
  const customerEmail = data.customer?.email ?? null;

  const user = await findUserForEvent(data);
  if (!user) {
    console.error(`[polar/webhook] subscription.revoked: No user found for ${customerEmail || "unknown"}`);
    return;
  }

  await prisma.billingAccount.updateMany({
    where: {
      userId: user.id,
      ...(subscriptionId ? { polarSubscriptionId: subscriptionId } : {}),
    },
    data: { tier: "free", subscriptionStatus: status || "canceled" },
  });

  console.log(`[polar/webhook] subscription.revoked: ${customerEmail || user.id} — sub=${subscriptionId} — downgraded to free — status=${status || "canceled"}`);
}

/**
 * checkout.updated — Checkout status changed.
 * Recognized no-op: order.paid / subscription.* events drive state changes.
 */
async function handleCheckoutUpdated(data: any) {
  console.log(
    `[polar/webhook] checkout.updated: ${data?.id ?? "unknown"} — acknowledged, no action`
  );
}
