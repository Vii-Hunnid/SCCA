/**
 * GET /api/scca/usage — Get usage analytics for the authenticated user
 *
 * Query params:
 *   - period: "1h" | "24h" | "7d" | "30d" | "90d" | "all" (default: "24h")
 *
 * Response:
 *   { period, since, summary, timeline[], byEndpoint[], byApiKey[], rateLimits }
 *
 * All aggregations run in the database — no usage rows are loaded into the
 * server, so 90-day and all-time views stay fast regardless of volume.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateBillingAccount,
  checkRateLimit,
  TIER_LIMITS,
} from "@/lib/rate-limit";

const PERIODS: Record<string, number | null> = {
  "1h": 3_600_000,
  "24h": 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
  "90d": 90 * 86_400_000,
  all: null, // no lower bound
};

// Timeline bucket width per period (seconds)
function bucketSeconds(period: string): number {
  switch (period) {
    case "1h":
      return 300; // 5 minutes
    case "24h":
      return 3_600; // 1 hour
    case "7d":
      return 86_400; // 1 day
    case "30d":
      return 86_400; // 1 day
    default:
      return 7 * 86_400; // 1 week for 90d / all
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.id;
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "24h";
    const period = periodParam in PERIODS ? periodParam : "24h";
    const windowMs = PERIODS[period];

    const since =
      windowMs === null ? new Date(0) : new Date(Date.now() - windowMs);
    const where =
      windowMs === null
        ? { userId }
        : { userId, createdAt: { gte: since } };

    // Fetch data in parallel — rate limit checked once, with the real tier
    const [billing, summaryAgg, statusGroups, endpointGroups, keyGroups, apiKeys, timeline] =
      await Promise.all([
        getOrCreateBillingAccount(userId),
        prisma.usageRecord.aggregate({
          where,
          _count: { _all: true },
          _sum: {
            totalTokens: true,
            bytesIn: true,
            bytesOut: true,
            costMicro: true,
          },
          _avg: { latencyMs: true },
        }),
        prisma.usageRecord.groupBy({
          by: ["statusCode"],
          where,
          _count: { _all: true },
        }),
        prisma.usageRecord.groupBy({
          by: ["endpoint"],
          where,
          _count: { _all: true },
          _sum: { totalTokens: true, costMicro: true },
          _avg: { latencyMs: true },
        }),
        prisma.usageRecord.groupBy({
          by: ["apiKeyId"],
          where,
          _count: { _all: true },
          _sum: { totalTokens: true, costMicro: true },
        }),
        prisma.apiKey.findMany({
          where: { userId, revokedAt: null },
          select: { id: true, name: true, keyPrefix: true },
        }),
        // Time-bucketed timeline, aggregated in SQL
        prisma.$queryRaw<
          Array<{
            bucket: number;
            requests: number;
            tokens: bigint;
            cost_micro: bigint;
            errors: number;
          }>
        >`
          SELECT
            floor(extract(epoch FROM "created_at") / ${bucketSeconds(period)})::bigint
              * ${bucketSeconds(period)} AS bucket,
            count(*)::int AS requests,
            COALESCE(sum("total_tokens"), 0)::bigint AS tokens,
            COALESCE(sum("cost_micro"), 0)::bigint AS cost_micro,
            count(*) FILTER (WHERE "status_code" >= 400)::int AS errors
          FROM "usage_records"
          WHERE "user_id" = ${userId}
            AND "created_at" >= ${since}
          GROUP BY 1
          ORDER BY 1
        `,
      ]);

    const actualRateLimit = await checkRateLimit(userId, billing.tier);

    const totalRequests = summaryAgg._count._all;
    const errorCount = statusGroups
      .filter((g) => g.statusCode >= 400)
      .reduce((s, g) => s + g._count._all, 0);

    const summary = {
      totalRequests,
      totalTokens: summaryAgg._sum.totalTokens || 0,
      totalBytesIn: summaryAgg._sum.bytesIn || 0,
      totalBytesOut: summaryAgg._sum.bytesOut || 0,
      totalCostMicro: summaryAgg._sum.costMicro || 0,
      avgLatencyMs: totalRequests
        ? Math.round(summaryAgg._avg.latencyMs || 0)
        : 0,
      successRate: totalRequests
        ? +(((totalRequests - errorCount) / totalRequests) * 100).toFixed(1)
        : 100,
      errorCount,
    };

    const timelineOut = timeline.map((row) => ({
      timestamp: new Date(row.bucket * 1000).toISOString(),
      requests: row.requests,
      tokens: Number(row.tokens),
      costMicro: Number(row.cost_micro),
      errors: row.errors,
    }));

    const byEndpoint = endpointGroups.map((g) => ({
      endpoint: g.endpoint,
      requests: g._count._all,
      tokens: g._sum.totalTokens || 0,
      costMicro: g._sum.costMicro || 0,
      avgLatencyMs: Math.round(g._avg.latencyMs || 0),
    }));

    const byApiKey = keyGroups.map((g) => {
      const keyId = g.apiKeyId || "session";
      const key = apiKeys.find((k) => k.id === keyId);
      return {
        keyId,
        keyName: key?.name || (keyId === "session" ? "Browser Session" : "Unknown"),
        keyPrefix: key?.keyPrefix || (keyId === "session" ? "session" : "—"),
        requests: g._count._all,
        tokens: g._sum.totalTokens || 0,
        costMicro: g._sum.costMicro || 0,
      };
    });

    return NextResponse.json({
      period,
      since: windowMs === null ? null : since.toISOString(),
      summary,
      timeline: timelineOut,
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
