/**
 * Client-side SSE stream reader.
 *
 * Network chunks can split an SSE event at any byte, so raw `chunk.split("\n")`
 * loses tokens. This buffers incomplete events and only parses complete
 * `data:` lines separated by a blank line.
 */

export interface SSEHandlers {
  onToken: (token: string) => void;
  onDone: (data: Record<string, unknown>) => void;
  /** Throwing inside onError aborts the read and propagates to the caller */
  onError: (message: string) => void;
}

export async function readSSEStream(
  response: Response,
  handlers: SSEHandlers
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  const handleEventBlock = (block: string) => {
    for (const line of block.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).replace(/^ /, "");
      if (!payload) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(payload);
      } catch {
        // Not valid JSON — ignore rather than corrupt state
        continue;
      }

      if (data.token) handlers.onToken(String(data.token));
      if (data.error) {
        handlers.onError(
          typeof data.error === "string" ? data.error : "Request failed"
        );
      }
      if (data.done) handlers.onDone(data);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are delimited by a blank line — only parse complete events
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      handleEventBlock(block);
    }
  }

  // Flush any trailing event without a final blank line
  const trailing = buffer.trim();
  if (trailing.startsWith("data:")) {
    handleEventBlock(buffer);
  }
}
