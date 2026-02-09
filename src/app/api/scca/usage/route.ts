/**
 * GET /api/scca/usage — Get usage analytics for the authenticated user
 *
 * Query params:
 *   - period: "1h" | "24h" | "7d" | "30d" (default: "24h")
 *   - groupBy: "hour" | "day" (default: auto based on period)
 *
 * Response:
 *   { summary, timeline[], byEndpoint[], byApiKey[], rateLimits }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateBillingAccount,
  checkRateLimit,
  TIER_LIMITS,
} from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "24h";

    // Calculate time window
    const now = new Date();
    let since: Date;
    switch (period) {
      case "1h":
        since = new Date(now.getTime() - 3_600_000);
        break;
      case "7d":
        since = new Date(now.getTime() - 7 * 86_400_000);
        break;
      case "30d":
        since = new Date(now.getTime() - 30 * 86_400_000);
        break;
      default: // 24h
        since = new Date(now.getTime() - 86_400_000);
    }

    // Fetch data in parallel
    const [billing, rateLimitStatus, records, apiKeys] = await Promise.all([
      getOrCreateBillingAccount(userId),
      checkRateLimit(userId, "free"), // will be re-checked with actual tier
      prisma.usageRecord.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: {
          endpoint: true,
          method: true,
          statusCode: true,
          requestTokens: true,
          responseTokens: true,
          totalTokens: true,
          bytesIn: true,
          bytesOut: true,
          costMicro: true,
          latencyMs: true,
          apiKeyId: true,
          createdAt: true,
        },
      }),
      prisma.apiKey.findMany({
        where: { userId, revokedAt: null },
        select: { id: true, name: true, keyPrefix: true },
      }),
    ]);

    // Re-check rate limits with actual tier
    const actualRateLimit = billing.tier !== "free"
      ? await checkRateLimit(userId, billing.tier)
      : rateLimitStatus;

    // Build summary
    const summary = {
      totalRequests: records.length,
      totalTokens: records.reduce((s, r) => s + r.totalTokens, 0),
      totalBytesIn: records.reduce((s, r) => s + r.bytesIn, 0),
      totalBytesOut: records.reduce((s, r) => s + r.bytesOut, 0),
      totalCostMicro: records.reduce((s, r) => s + r.costMicro, 0),
      avgLatencyMs: records.length
        ? Math.round(records.reduce((s, r) => s + r.latencyMs, 0) / records.length)
        : 0,
      successRate: records.length
        ? +(
            (records.filter((r) => r.statusCode < 400).length / records.length) *
            100
          ).toFixed(1)
        : 100,
      errorCount: records.filter((r) => r.statusCode >= 400).length,
    };

    // Build timeline (bucketed by hour or day)
    const bucketMs = period === "1h" ? 300_000 : period === "24h" ? 3_600_000 : 86_400_000;
    const timeline: Array<{
      timestamp: string;
      requests: number;
      tokens: number;
      costMicro: number;
      errors: number;
    }> = [];

    const buckets = new Map<number, { requests: number; tokens: number; costMicro: number; errors: number }>();
    for (const r of records) {
      const bucketKey = Math.floor(r.createdAt.getTime() / bucketMs) * bucketMs;
      const existing = buckets.get(bucketKey) || { requests: 0, tokens: 0, costMicro: 0, errors: 0 };
      existing.requests++;
      existing.tokens += r.totalTokens;
      existing.costMicro += r.costMicro;
      if (r.statusCode >= 400) existing.errors++;
      buckets.set(bucketKey, existing);
    }

    for (const [ts, data] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
      timeline.push({
        timestamp: new Date(ts).toISOString(),
        ...data,
      });
    }

    // Usage by endpoint
    const endpointMap = new Map<string, { requests: number; tokens: number; costMicro: number; avgLatency: number; totalLatency: number }>();
    for (const r of records) {
      const existing = endpointMap.get(r.endpoint) || { requests: 0, tokens: 0, costMicro: 0, avgLatency: 0, totalLatency: 0 };
      existing.requests++;
      existing.tokens += r.totalTokens;
      existing.costMicro += r.costMicro;
      existing.totalLatency += r.latencyMs;
      endpointMap.set(r.endpoint, existing);
    }
    const byEndpoint = Array.from(endpointMap.entries()).map(([endpoint, data]) => ({
      endpoint,
      requests: data.requests,
      tokens: data.tokens,
      costMicro: data.costMicro,
      avgLatencyMs: Math.round(data.totalLatency / data.requests),
    }));

    // Usage by API key
    const keyMap = new Map<string, { requests: number; tokens: number; costMicro: number }>();
    for (const r of records) {
      const keyId = r.apiKeyId || "session";
      const existing = keyMap.get(keyId) || { requests: 0, tokens: 0, costMicro: 0 };
      existing.requests++;
      existing.tokens += r.totalTokens;
      existing.costMicro += r.costMicro;
      keyMap.set(keyId, existing);
    }
    const byApiKey = Array.from(keyMap.entries()).map(([keyId, data]) => {
      const key = apiKeys.find((k) => k.id === keyId);
      return {
        keyId,
        keyName: key?.name || (keyId === "session" ? "Browser Session" : "Unknown"),
        keyPrefix: key?.keyPrefix || (keyId === "session" ? "session" : "—"),
        ...data,
      };
    });

    return NextResponse.json({
      period,
      since: since.toISOString(),
      summary,
      timeline,
      byEndpoint,
      byApiKey,
      rateLimits: {
        tier: billing.tier,
        tierDisplay: TIER_LIMITS[billing.tier]?.displayName || billing.tier,
        current: actualRateLimit.current,
        limits: {
          rpm: actualRateLimit.limits.rpm,
          rpd: actualRateLimit.limits.rpd,
          tpm: actualRateLimit.limits.tpm,
          tpd: actualRateLimit.limits.tpd,
        },
        remaining: actualRateLimit.remaining,
      },
    });
  } catch (err: any) {
    console.error("[usage/GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
