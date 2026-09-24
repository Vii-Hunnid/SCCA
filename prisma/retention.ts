/**
 * UsageRecord retention — deletes usage records older than RETENTION_DAYS.
 *
 * UsageRecord grows unboundedly (one row per metered request). Run on a
 * schedule, e.g. daily cron:
 *
 *   npm run db:retention
 *
 * BillingAccount aggregates (totalSpendMicro/usageSpendMicro) are NOT
 * touched — lifetime accounting survives cleanup.
 */

import { PrismaClient } from "@prisma/client";

const RETENTION_DAYS = Number(process.env.USAGE_RETENTION_DAYS || 90);

const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);

  const result = await prisma.usageRecord.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  console.log(
    `[retention] deleted ${result.count} usage records older than ${RETENTION_DAYS} days (cutoff ${cutoff.toISOString()})`
  );
}

main()
  .catch((err) => {
    console.error("[retention] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
