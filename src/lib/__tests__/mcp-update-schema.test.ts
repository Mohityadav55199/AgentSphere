import { describe, expect, it } from "vitest";
import { UpdateMCPServerBody } from "@/app/api/mcp-servers/schema";

describe("UpdateMCPServerBody", () => {
  // Regression: the edit form sends null for fields of the other transport type, which the
  // schema rejected, so every edit failed with a misleading "ID is required".
  it("accepts the payload the edit form actually sends", () => {
    const result = UpdateMCPServerBody.safeParse({
      id: "abc",
      name: "fetch",
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-fetch"],
      env: null,
      url: null,
      headers: null,
    });
    expect(result.success).toBe(true);
  });

  it("still rejects a malformed URL", () => {
    expect(UpdateMCPServerBody.safeParse({ id: "abc", url: "not a url" }).success).toBe(false);
  });
});
