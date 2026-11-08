/** Cookie that binds an MCP OAuth authorization to the browser that started it (CSRF protection). */
export function oauthStateCookie(serverId: string): string {
  return `agentsphere_oauth_state_${serverId}`;
}

export function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax so the cookie is still sent on the top-level redirect back from the provider.
    sameSite: "lax" as const,
    maxAge: 10 * 60,
    path: "/api/oauth",
  };
}
