import { afterEach, describe, expect, it, vi } from "vitest";
import { validateMCPUrl } from "@/lib/mcp/policy";

afterEach(() => vi.unstubAllEnvs());

describe("validateMCPUrl in production", () => {
  const prod = () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MCP_ALLOW_PRIVATE_URLS", "");
  };

  it("accepts public http(s) URLs", () => {
    prod();
    expect(validateMCPUrl("https://mcp.example.com/mcp")).toBeNull();
    expect(validateMCPUrl("http://example.org:8080/x")).toBeNull();
  });

  it("rejects non-http schemes and garbage", () => {
    prod();
    expect(validateMCPUrl("file:///etc/passwd")).not.toBeNull();
    expect(validateMCPUrl("ftp://example.com")).not.toBeNull();
    expect(validateMCPUrl("not a url")).not.toBeNull();
  });

  it.each([
    "http://localhost:3000/mcp",
    "http://127.0.0.1/mcp",
    "http://10.1.2.3/mcp",
    "http://172.20.0.5/mcp",
    "http://192.168.1.10/mcp",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/mcp",
    "http://service.internal/mcp",
  ])("rejects private or internal address %s", (url) => {
    prod();
    expect(validateMCPUrl(url)).not.toBeNull();
  });

  it("does not block public hosts that merely look similar", () => {
    prod();
    expect(validateMCPUrl("https://172.example.com/mcp")).toBeNull();
    expect(validateMCPUrl("http://8.8.8.8/mcp")).toBeNull();
  });

  it("allows private addresses when explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MCP_ALLOW_PRIVATE_URLS", "true");
    expect(validateMCPUrl("http://localhost:3000/mcp")).toBeNull();
  });
});

describe("validateMCPUrl in development", () => {
  it("allows localhost", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(validateMCPUrl("http://localhost:8787/mcp")).toBeNull();
  });
});
