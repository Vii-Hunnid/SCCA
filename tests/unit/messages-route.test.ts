/**
 * Tests for POST /api/scca/conversations/[id]/messages
 *
 * Covers the v2 invariants:
 * - the user message is persisted BEFORE the AI stream starts
 * - the assistant response is persisted only after a complete stream
 * - a mid-stream failure keeps the user message but persists no assistant
 *   response
 * - client abort discards the partial assistant response
 * - auth, validation, 404, and rate-limit paths
 */

import { NextRequest } from "next/server";

// ── Mocks (hoisted) ──
const mockRequireUser = jest.fn();
const mockGetConversation = jest.fn();
const mockAppendAtomic = jest.fn();
const mockAuditLog = jest.fn();
const mockStreamAI = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockRecordUsage = jest.fn();
const mockGetBilling = jest.fn();

jest.mock("@/lib/session", () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock("@/lib/db/client", () => ({
  getSCCAConversationById: (...args: unknown[]) => mockGetConversation(...args),
  appendMessageAtomically: (...args: unknown[]) => mockAppendAtomic(...args),
  replaceSCCAMessageTokens: jest.fn(),
  createAuditLog: (...args: unknown[]) => mockAuditLog(...args),
}));

jest.mock("@/lib/rate-limit", () => {
  const actual = jest.requireActual("@/lib/rate-limit");
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
    recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
    getOrCreateBillingAccount: (...args: unknown[]) => mockGetBilling(...args),
  };
});

jest.mock("@/lib/ai/client", () => {
  const actual = jest.requireActual("@/lib/ai/client");
  return {
    ...actual,
    streamAIResponse: (...args: unknown[]) => mockStreamAI(...args),
  };
});

// Route under test — imported after mocks
import { POST } from "../../src/app/api/scca/conversations/[id]/messages/route";

const CONV_ID = "conv-1";

function makeConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: CONV_ID,
    userId: "user-1",
    title: "Test",
    model: "llama-3.3-70b-versatile",
    messageTokens: [],
    messageCount: 1,
    merkleRoot: null,
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>, signal?: AbortSignal) {
  return new NextRequest(
    `http://localhost/api/scca/conversations/${CONV_ID}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    }
  );
}

const params = { params: Promise.resolve({ id: CONV_ID }) };

async function readStream(res: Response) {
  const events: Array<Record<string, unknown>> = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of block.split("\n")) {
        if (line.startsWith("data: ")) {
          events.push(JSON.parse(line.slice(6)));
        }
      }
    }
  }
  return { events, reader };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireUser.mockResolvedValue({
    id: "user-1",
    email: "u@example.com",
    name: null,
    masterKeySalt: "c2FsdHNhbHQ=",
    masterKey: Buffer.alloc(32, 1),
  });
  mockGetConversation.mockResolvedValue(makeConversation());
  mockCheckRateLimit.mockResolvedValue({
    allowed: true,
    tier: "free",
    limits: { rpm: 10, rpd: 200, tpm: 10_000, tpd: 200_000 },
    current: { rpm: 0, rpd: 0, tpm: 0, tpd: 0 },
    remaining: { rpm: 10, rpd: 200, tpm: 10_000, tpd: 200_000 },
  });
  mockGetBilling.mockResolvedValue({ tier: "free" });
  mockAppendAtomic
    .mockResolvedValueOnce({ sequence: 1, root: "r1" })
    .mockResolvedValueOnce({ sequence: 2, root: "r2" });
  mockAuditLog.mockResolvedValue({});
  mockRecordUsage.mockResolvedValue(undefined);
});

describe("POST messages", () => {
  test("401 when unauthenticated", async () => {
    mockRequireUser.mockResolvedValueOnce(null);
    const res = await POST(
      makeRequest({ content: "hi" }),
      params
    );
    expect(res.status).toBe(401);
    expect(mockAppendAtomic).not.toHaveBeenCalled();
  });

  test("400 on invalid content", async () => {
    const res = await POST(makeRequest({ content: "   " }), params);
    expect(res.status).toBe(400);
    expect(mockAppendAtomic).not.toHaveBeenCalled();
  });

  test("400 on disallowed model", async () => {
    const res = await POST(
      makeRequest({ content: "hi", model: "gpt-4" }),
      params
    );
    expect(res.status).toBe(400);
    expect(mockAppendAtomic).not.toHaveBeenCalled();
  });

  test("404 when conversation missing", async () => {
    mockGetConversation.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ content: "hi" }), params);
    expect(res.status).toBe(404);
  });

  test("429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      tier: "free",
      limits: { rpm: 10, rpd: 200, tpm: 10_000, tpd: 200_000 },
      current: { rpm: 10, rpd: 0, tpm: 0, tpd: 0 },
      remaining: { rpm: 0, rpd: 200, tpm: 10_000, tpd: 200_000 },
      retryAfterMs: 60_000,
    });
    const res = await POST(makeRequest({ content: "hi" }), params);
    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Remaining-RPM")).toBe("0");
    expect(mockAppendAtomic).not.toHaveBeenCalled();
  });

  test("persists user message BEFORE streaming, assistant after", async () => {
    mockStreamAI.mockImplementation(async function* () {
      yield "Hel";
      yield "lo";
    });

    const res = await POST(makeRequest({ content: "hi" }), params);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const { events } = await readStream(res);

    const done = events.find((e) => e.done);
    expect(done).toBeDefined();
    expect(done!.messageCount).toBe(3);

    // Ordering invariant: user persisted before the AI stream started
    expect(mockAppendAtomic).toHaveBeenCalledTimes(2);
    expect(mockAppendAtomic.mock.invocationCallOrder[0]).toBeLessThan(
      mockStreamAI.mock.invocationCallOrder[0]
    );
    expect(mockAppendAtomic).toHaveBeenNthCalledWith(
      1,
      CONV_ID,
      "hi",
      "user",
      expect.any(Buffer),
      expect.any(Buffer)
    );
    expect(mockAppendAtomic).toHaveBeenNthCalledWith(
      2,
      CONV_ID,
      "Hello",
      "assistant",
      expect.any(Buffer),
      expect.any(Buffer)
    );

    expect(mockRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200 })
    );
  });

  test("AI failure keeps the user message, persists no assistant response", async () => {
    mockStreamAI.mockImplementation(async function* () {
      yield "par";
      throw new Error("groq exploded");
    });

    const res = await POST(makeRequest({ content: "hi" }), params);
    const { events } = await readStream(res);

    const errEvent = events.find((e) => e.error);
    expect(errEvent).toBeDefined();
    // Generic message — no internals leaked
    expect(String(errEvent!.error)).not.toContain("groq exploded");

    // User message persisted exactly once; assistant never persisted
    expect(mockAppendAtomic).toHaveBeenCalledTimes(1);
    expect(mockAppendAtomic).toHaveBeenCalledWith(
      CONV_ID,
      "hi",
      "user",
      expect.any(Buffer),
      expect.any(Buffer)
    );

    expect(mockRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });

  test("client abort discards the partial assistant response", async () => {
    mockStreamAI.mockImplementation(async function* (_c: unknown, _m: unknown, _mo: unknown, opts: { signal: AbortSignal }) {
      yield "par";
      // Wait until aborted, then end the generator
      await new Promise<void>((resolve) => {
        if (opts.signal.aborted) return resolve();
        opts.signal.addEventListener("abort", () => resolve(), { once: true });
      });
    });

    const controller = new AbortController();
    const res = await POST(makeRequest({ content: "hi" }, controller.signal), params);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    // Read until the first token event arrives
    let text = "";
    while (!text.includes('"token"')) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }

    // Stop, like the user pressing the Stop button
    controller.abort();
    await reader.cancel();

    // Give the stream callback a tick to finish
    await new Promise((r) => setTimeout(r, 50));

    // Only the user message was persisted — no partial assistant response
    expect(mockAppendAtomic).toHaveBeenCalledTimes(1);
    expect(mockAppendAtomic).toHaveBeenCalledWith(
      CONV_ID,
      "hi",
      "user",
      expect.any(Buffer),
      expect.any(Buffer)
    );
  });
});
