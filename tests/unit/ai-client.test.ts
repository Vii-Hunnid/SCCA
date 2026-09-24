/**
 * Tests for AI client resilience helpers.
 */

import { trimContextToBudget } from "../../src/lib/ai/client";

describe("trimContextToBudget", () => {
  const small = Array.from({ length: 5 }, (_, i) => ({
    role: "user" as const,
    content: `x`.repeat(100),
  }));

  test("returns context unchanged when under budget", () => {
    const result = trimContextToBudget(small, 10_000);
    expect(result.trimmed).toBe(false);
    expect(result.messages).toHaveLength(5);
  });

  test("drops oldest turns when over budget, keeps newest", () => {
    const big = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 ? "assistant" : "user") as "user" | "assistant",
      content: `message-${i}-`.padEnd(500, "x"),
    }));
    const result = trimContextToBudget(big, 2_000);
    expect(result.trimmed).toBe(true);

    const total = result.messages.reduce((n, m) => n + m.content.length, 0);
    expect(total).toBeLessThanOrEqual(2_500); // one message may exceed budget alone

    // Newest message is always kept
    expect(result.messages[result.messages.length - 1].content).toBe(
      big[big.length - 1].content
    );
  });

  test("keeps at least the newest message even if it alone exceeds budget", () => {
    const huge = [
      { role: "user" as const, content: "x".repeat(50_000) },
      { role: "assistant" as const, content: "y".repeat(50_000) },
    ];
    const result = trimContextToBudget(huge, 1_000);
    expect(result.trimmed).toBe(true);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
    expect(result.messages[result.messages.length - 1].content).toBe(
      huge[1].content
    );
  });

  test("empty context is a no-op", () => {
    const result = trimContextToBudget([], 100);
    expect(result.trimmed).toBe(false);
    expect(result.messages).toHaveLength(0);
  });
});
