/**
 * GET /api/scca/billing/invoices/[id] — Get or generate a Polar invoice
 *
 * Flow:
 *   1. Look up the Invoice record by SCCA invoice ID
 *   2. If polarInvoiceUrl exists, return it
 *   3. If not, call POST /v1/orders/{polarOrderId}/invoice to generate
 *   4. Then call GET /v1/orders/{polarOrderId}/invoice to get the URL
 *   5. Cache the URL in the database
 *   6. Return { url } for the client to open/download
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPolarApiBase } from "@/lib/polar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the invoice and verify ownership
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        billingAccount: {
          select: { userId: true },
        },
      },
    });

    if (!invoice || invoice.billingAccount.userId !== session.user.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.polarOrderId) {
      return NextResponse.json(
        { error: "No Polar order linked to this invoice" },
        { status: 404 }
      );
    }

    // If we already have a cached URL, return it
    if (invoice.polarInvoiceUrl) {
      return NextResponse.json({ url: invoice.polarInvoiceUrl });
    }

    // Generate + retrieve invoice from Polar
    const polarBase = getPolarApiBase();
    const accessToken = process.env.POLAR_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Polar integration not configured" },
        { status: 503 }
      );
    }

    // Step 1: Generate the invoice (POST)
    const generateRes = await fetch(
      `${polarBase}/v1/orders/${invoice.polarOrderId}/invoice`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 404 or error on generate is OK (might already exist or billing details missing)
    if (!generateRes.ok && generateRes.status !== 404 && generateRes.status !== 409) {
      const errBody = await generateRes.text();
      console.error("[billing/invoice] Generate failed:", generateRes.status, errBody);
      // Still try to GET — it might already be generated
    }

    // Step 2: Retrieve the invoice URL (GET)
    const getRes = await fetch(
      `${polarBase}/v1/orders/${invoice.polarOrderId}/invoice`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!getRes.ok) {
      if (getRes.status === 404) {
        return NextResponse.json(
          {
            error: "Invoice not yet available. The order may be pending or missing billing details.",
          },
          { status: 404 }
        );
      }
      const errBody = await getRes.text();
      console.error("[billing/invoice] GET failed:", getRes.status, errBody);
      return NextResponse.json(
        { error: "Failed to retrieve invoice from Polar" },
        { status: 502 }
      );
    }

    const invoiceData = await getRes.json();
    const invoiceUrl = invoiceData.url;

    if (!invoiceUrl) {
      return NextResponse.json(
        { error: "Invoice URL not available" },
        { status: 404 }
      );
    }

    // Cache the URL in our database
    await prisma.invoice.update({
      where: { id },
      data: { polarInvoiceUrl: invoiceUrl },
    });

    return NextResponse.json({ url: invoiceUrl });
  } catch (err: any) {
    console.error("[billing/invoice]", err);
    return NextResponse.json(
      { error: "Failed to get invoice" },
      { status: 500 }
    );
  }
}
