/**
 * Server-Sent Events over a POST request.
 *
 * The browser's EventSource can only send GET requests, which forced the whole chat message into
 * the URL (and hit the ~16KB header limit). This reads the same `text/event-stream` format from a
 * fetch() response and exposes the small EventSource-like surface the chat hook uses.
 */

export interface SSEEvent {
  event: string;
  data: string;
}

/**
 * Incremental SSE parser: feed text chunks as they arrive; complete events are emitted.
 * Handles `event:`/`data:` fields, multi-line data, comments and CRLF line endings.
 */
export function createSSEParser(onEvent: (event: SSEEvent) => void) {
  let buffer = "";

  const dispatch = (block: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (!line || line.startsWith(":")) continue; // blank or comment
      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "event") event = value || "message";
      else if (field === "data") data.push(value);
    }
    if (data.length > 0) onEvent({ event, data: data.join("\n") });
  };

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n?/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
    },
    /** Flush a trailing event that was not followed by a blank line. */
    end() {
      if (buffer.trim()) dispatch(buffer);
      buffer = "";
    },
  };
}

type Listener = (event: MessageEvent<string>) => void;

/** The subset of the EventSource API used by useChatThread. */
export interface MessageStream {
  onmessage: Listener | null;
  addEventListener(type: "done" | "error", listener: Listener): void;
  close(): void;
}

export function openPostEventStream(url: string, body: unknown): MessageStream {
  const controller = new AbortController();
  const listeners: Record<string, Listener[]> = { done: [], error: [] };
  let closed = false;
  let finished = false;

  const stream: MessageStream = {
    onmessage: null,
    addEventListener(type, listener) {
      listeners[type].push(listener);
    },
    close() {
      closed = true;
      controller.abort();
    },
  };

  const emit = (type: string, data: string) => {
    if (closed) return;
    const event = new MessageEvent<string>(type, { data });
    if (type === "message") {
      stream.onmessage?.(event);
      return;
    }
    if (type === "done" || type === "error") finished = true;
    for (const listener of listeners[type] ?? []) listener(event);
  };
  const fail = (message: string) => emit("error", JSON.stringify({ message }));

  void (async () => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        let message = `Request failed (HTTP ${response.status})`;
        try {
          message = JSON.parse(text).error || message;
        } catch {
          // not JSON
        }
        fail(message);
        return;
      }

      const parser = createSSEParser(({ event, data }) => emit(event, data));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
      parser.push(decoder.decode());
      parser.end();

      if (!finished) fail("The connection closed before the response finished.");
    } catch {
      if (!closed) fail("Network error: could not reach the server.");
    }
  })();

  return stream;
}
