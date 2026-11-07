import { afterEach, describe, expect, it, vi } from "vitest";
import { isStdioMCPAllowed, toPublicMCPServer } from "@/lib/mcp/policy";

afterEach(() => vi.unstubAllEnvs());

describe("isStdioMCPAllowed", () => {
  it("is blocked in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MCP_ALLOW_STDIO", "");
    expect(isStdioMCPAllowed()).toBe(false);
  });

  it("can be explicitly enabled in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MCP_ALLOW_STDIO", "true");
    expect(isStdioMCPAllowed()).toBe(true);
  });

  it("is allowed in development unless explicitly disabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MCP_ALLOW_STDIO", "");
    expect(isStdioMCPAllowed()).toBe(true);
    vi.stubEnv("MCP_ALLOW_STDIO", "false");
    expect(isStdioMCPAllowed()).toBe(false);
  });
});

describe("toPublicMCPServer", () => {
  it("removes OAuth secrets and keeps everything else", () => {
    const server = {
      id: "1",
      name: "github",
      url: "https://example.com/mcp",
      authTokens: { access_token: "secret" },
      clientInfo: { client_secret: "secret" },
      codeVerifier: "secret",
    };
    expect(toPublicMCPServer(server)).toEqual({
      id: "1",
      name: "github",
      url: "https://example.com/mcp",
    });
  });
});
