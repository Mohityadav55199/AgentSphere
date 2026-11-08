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

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./, // link-local + cloud metadata endpoints
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1?\]?$/,
  /^\[?(fc|fd)[0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

/**
 * Validate the URL of an HTTP MCP server. The backend fetches it server-side, so in production
 * only public http(s) hosts are accepted (blocks requests to localhost, the private network and
 * cloud metadata services). Set MCP_ALLOW_PRIVATE_URLS=true to allow them on a private instance.
 * Returns an error message, or null when the URL is acceptable.
 */
export function validateMCPUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "URL is not valid";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only http(s) URLs are allowed";
  }
  const allowPrivate =
    process.env.MCP_ALLOW_PRIVATE_URLS?.trim().toLowerCase() === "true" ||
    process.env.NODE_ENV !== "production";
  if (!allowPrivate && PRIVATE_HOST_PATTERNS.some((p) => p.test(url.hostname))) {
    return "Private, loopback and internal addresses are not allowed on this deployment";
  }
  return null;
}
