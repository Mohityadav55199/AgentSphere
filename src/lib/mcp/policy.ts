/**
 * Security policy for MCP servers.
 *
 * A `stdio` MCP server is an arbitrary shell command that the backend spawns. On a public
 * deployment that would let any visitor run code on the host, so stdio servers are only
 * enabled when explicitly allowed:
 *   - development: allowed unless MCP_ALLOW_STDIO=false
 *   - production:  blocked unless MCP_ALLOW_STDIO=true
 */
export function isStdioMCPAllowed(): boolean {
  const flag = process.env.MCP_ALLOW_STDIO?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export const STDIO_DISABLED_MESSAGE =
  "stdio MCP servers are disabled on this deployment for security. Use an HTTP MCP server, or set MCP_ALLOW_STDIO=true on a private instance.";

/** Strip OAuth secrets before an MCP server record leaves the backend. */
export function toPublicMCPServer<T extends Record<string, unknown>>(server: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { authTokens, clientInfo, codeVerifier, ...rest } = server;
  return rest;
}
