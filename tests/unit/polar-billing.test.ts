/**
 * Tests for Polar billing logic
 *
 * Covers:
 * - computeOrderPaidUpdate: idempotent spend recording (retry safety)
 * - computeOrderPaidUpdate: auto-upgrade against post-increment spend (no double-add)
 * - mapProductToTier: unknown products fall back to the free tier
 * - getPolarApiBase: env-driven sandbox vs production endpoints
 */

import {
  computeOrderPaidUpdate,
  getPolarApiBase,
  mapProductToTier,
  OrderPaidBillingSnapshot,
} from "../../src/lib/polar";

// ── Helpers ──

function billing(overrides: Partial<OrderPaidBillingSnapshot> = {}): OrderPaidBillingSnapshot {
  return {
    totalSpendMicro: 0n,
    monthlySpendMicro: 0n,
    tier: "free",
    autoUpgrade: true,
    ...overrides,
  };
}

// ── computeOrderPaidUpdate ──

describe("computeOrderPaidUpdate", () => {
  test("retry with existing invoice records no spend", () => {
    const current = billing({ totalSpendMicro: 5_000_000n, monthlySpendMicro: 5_000_000n });

    const result = computeOrderPaidUpdate(current, 1_000_000, true);

    expect(result.shouldRecordSpend).toBe(false);
    expect(result.spendUpdates).toBeUndefined();
  });

  test("retry re-evaluates upgrade against current total without adding spend", () => {
    // Total already crossed the tier_1 threshold (e.g. first delivery crashed
    // before the tier update). A retry must not add spend again, but still
    // converges on the tier the spend entitles the user to.
    const current = billing({ totalSpendMicro: 5_000_000n, tier: "free" });

    const result = computeOrderPaidUpdate(current, 1_000_000, true);

    expect(result.shouldRecordSpend).toBe(false);
    expect(result.spendUpdates).toBeUndefined();
    expect(result.upgradedTier).toBe("tier_1");
  });

  test("first delivery increments spend exactly once", () => {
    const current = billing({ totalSpendMicro: 2_000_000n, monthlySpendMicro: 500_000n });

    const result = computeOrderPaidUpdate(current, 1_000_000, false);

    expect(result.shouldRecordSpend).toBe(true);
    expect(result.spendUpdates).toEqual({
      totalSpendMicro: 3_000_000n,
      monthlySpendMicro: 1_500_000n,
    });
  });

  test("first delivery for a brand-new account sets spend to the order amount", () => {
    const result = computeOrderPaidUpdate(null, 2_500_000, false);

    expect(result.shouldRecordSpend).toBe(true);
    expect(result.spendUpdates).toEqual({
      totalSpendMicro: 2_500_000n,
      monthlySpendMicro: 2_500_000n,
    });
  });

  test("auto-upgrade uses post-increment spend (no double-add)", () => {
    // 4_000_000 + 1_000_000 = 5_000_000 → exactly the tier_1 threshold.
    // Double-adding would yield 6_000_000 and corrupt spendUpdates too.
    const current = billing({ totalSpendMicro: 4_000_000n, monthlySpendMicro: 4_000_000n, tier: "free" });

    const result = computeOrderPaidUpdate(current, 1_000_000, false);

    expect(result.spendUpdates?.totalSpendMicro).toBe(5_000_000n);
    expect(result.upgradedTier).toBe("tier_1");
  });

  test("auto-upgrade skips tiers above the post-increment spend", () => {
    // 49M + 2M = 51M → crosses tier_2 ($50) but not tier_3 ($200)
    const current = billing({ totalSpendMicro: 49_000_000n, tier: "tier_1" });

    const result = computeOrderPaidUpdate(current, 2_000_000, false);

    expect(result.upgradedTier).toBe("tier_2");
  });

  test("no upgrade when autoUpgrade is disabled", () => {
    const current = billing({ totalSpendMicro: 4_000_000n, tier: "free", autoUpgrade: false });

    const result = computeOrderPaidUpdate(current, 1_000_000, false);

    expect(result.shouldRecordSpend).toBe(true);
    expect(result.upgradedTier).toBeUndefined();
  });

  test("no downgrade when spend is below the next threshold", () => {
    const current = billing({ totalSpendMicro: 1_000_000n, tier: "free" });

    const result = computeOrderPaidUpdate(current, 1_000_000, false);

    expect(result.shouldRecordSpend).toBe(true);
    expect(result.upgradedTier).toBeUndefined();
  });
});

// ── mapProductToTier ──

describe("mapProductToTier", () => {
  const originalTierMap = process.env.POLAR_TIER_MAP;

  beforeEach(() => {
    delete process.env.POLAR_TIER_MAP;
  });

  afterAll(() => {
    if (originalTierMap === undefined) {
      delete process.env.POLAR_TIER_MAP;
    } else {
      process.env.POLAR_TIER_MAP = originalTierMap;
    }
  });

  test("unknown product maps to free", () => {
    expect(mapProductToTier("prod_unknown")).toBe("free");
  });

  test("metadata scca_tier wins", () => {
    expect(mapProductToTier("prod_unknown", { scca_tier: "tier_3" })).toBe("tier_3");
  });

  test("POLAR_TIER_MAP lookup applies when metadata is absent", () => {
    process.env.POLAR_TIER_MAP = JSON.stringify({ prod_a: "tier_2" });
    expect(mapProductToTier("prod_a")).toBe("tier_2");
  });
});

// ── getPolarApiBase ──

describe("getPolarApiBase", () => {
  const originalEnv = process.env.POLAR_ENVIRONMENT;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.POLAR_ENVIRONMENT;
    } else {
      process.env.POLAR_ENVIRONMENT = originalEnv;
    }
  });

  test("defaults to the sandbox API", () => {
    delete process.env.POLAR_ENVIRONMENT;
    expect(getPolarApiBase()).toBe("https://sandbox-api.polar.sh/v1");
  });

  test("production environment uses the production API", () => {
    process.env.POLAR_ENVIRONMENT = "production";
    expect(getPolarApiBase()).toBe("https://api.polar.sh/v1");
  });
});
