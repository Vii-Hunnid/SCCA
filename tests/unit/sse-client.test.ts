/**
 * Tests for the buffered SSE client reader.
 *
 * Regression coverage: the previous parser split raw chunks on "\n" with no
 * carry-over buffer, so a network chunk ending mid-event silently dropped
 * tokens.
 */

import { readSSEStream } from "../../src/lib/sse-client";

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream as any);
}

function collect() {
  const tokens: string[] = [];
  const done: Record<string, unknown>[] = [];
  const errors: string[] = [];
  return {
    tokens,
    done,
    errors,
    handlers: {
      onToken: (t: string) => tokens.push(t),
      onDone: (d: Record<string, unknown>) => done.push(d),
      onError: (m: string) => errors.push(m),
    },
  };
}

describe("readSSEStream", () => {
  test("reads well-formed events", async () => {
    const c = collect();
    const res = sseResponse([
      `data: ${JSON.stringify({ token: "Hel" })}\n\ndata: ${JSON.stringify({ token: "lo" })}\n\ndata: ${JSON.stringify({ done: true, messageCount: 2 })}\n\n`,
    ]);
    await readSSEStream(res, c.handlers);
    expect(c.tokens).toEqual(["Hel", "lo"]);
    expect(c.done).toEqual([{ done: true, messageCount: 2 }]);
    expect(c.errors).toEqual([]);
  });

  test("buffers events split across chunk boundaries", async () => {
    const c = collect();
    // The first chunk ends in the middle of a JSON payload AND the second
    // ends mid-header — the old parser dropped both tokens.
    const event1 = `data: ${JSON.stringify({ token: "first" })}\n\n`;
    const event2 = `data: ${JSON.stringify({ token: "second" })}\n\n`;
    const payload = event1 + event2;
    const res = sseResponse([
      payload.slice(0, 12),
      payload.slice(12, 40),
      payload.slice(40),
    ]);
    await readSSEStream(res, c.handlers);
    expect(c.tokens).toEqual(["first", "second"]);
    expect(c.errors).toEqual([]);
  });

  test("handles byte-at-a-time delivery", async () => {
    const c = collect();
    const payload = `data: ${JSON.stringify({ token: "abc" })}\n\n`;
    const res = sseResponse(payload.split(""));
    await readSSEStream(res, c.handlers);
    expect(c.tokens).toEqual(["abc"]);
  });

  test("propagates server-sent errors through onError", async () => {
    const tokens: string[] = [];
    const res = sseResponse([
      `data: ${JSON.stringify({ token: "partial" })}\n\ndata: ${JSON.stringify({ error: "AI request failed — please try again" })}\n\n`,
    ]);
    await expect(
      readSSEStream(res, {
        onToken: (t) => tokens.push(t),
        onDone: () => {},
        onError: (m) => {
          throw new Error(m);
        },
      })
    ).rejects.toThrow("AI request failed");
    expect(tokens).toEqual(["partial"]);
  });

  test("flushes a trailing event without final blank line", async () => {
    const c = collect();
    const res = sseResponse([`data: ${JSON.stringify({ token: "end" })}\n`]);
    await readSSEStream(res, c.handlers);
    expect(c.tokens).toEqual(["end"]);
  });

  test("ignores malformed JSON lines without corrupting state", async () => {
    const c = collect();
    const res = sseResponse([
      `data: {not-json\n\ndata: ${JSON.stringify({ token: "ok" })}\n\n`,
    ]);
    await readSSEStream(res, c.handlers);
    expect(c.tokens).toEqual(["ok"]);
  });
});
