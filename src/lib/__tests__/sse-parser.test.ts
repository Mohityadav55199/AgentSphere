import { describe, expect, it } from "vitest";
import { createSSEParser, type SSEEvent } from "@/services/sseClient";

function collect(chunks: string[]) {
  const events: SSEEvent[] = [];
  const parser = createSSEParser((e) => events.push(e));
  for (const chunk of chunks) parser.push(chunk);
  parser.end();
  return events;
}

describe("createSSEParser", () => {
  it("parses default message events and named events", () => {
    expect(collect([': connected\n\ndata: {"a":1}\n\nevent: done\ndata: {}\n\n'])).toEqual([
      { event: "message", data: '{"a":1}' },
      { event: "done", data: "{}" },
    ]);
  });

  it("reassembles events split across arbitrary chunk boundaries", () => {
    const stream =
      'data: {"type":"ai","data":{"content":"héllo"}}\n\nevent: error\ndata: {"message":"x"}\n\n';
    const chunks = stream.match(/[\s\S]{1,3}/g)!;
    expect(collect(chunks)).toEqual([
      { event: "message", data: '{"type":"ai","data":{"content":"héllo"}}' },
      { event: "error", data: '{"message":"x"}' },
    ]);
  });

  it("joins multi-line data and handles CRLF", () => {
    expect(collect(["data: line1\r\ndata: line2\r\n\r\n"])).toEqual([
      { event: "message", data: "line1\nline2" },
    ]);
  });

  it("ignores comments and events without data, and flushes a trailing event", () => {
    expect(collect([": ping\n\nevent: noop\n\ndata: last"])).toEqual([
      { event: "message", data: "last" },
    ]);
  });
});
