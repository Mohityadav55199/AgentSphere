# 13 — OAuth 2.0 with PKCE for MCP Server Integrations

## 1. What is OAuth 2.0 & Why is it Required in AgentSphere?
When an AI agent connects to external tools (like GitHub, Google Drive, or Slack via MCP servers), we cannot and should not ask the user for their plain-text password.
**OAuth 2.0** allows users to securely grant AgentSphere limited access (tokens) without exposing their master passwords.

---

## 2. OAuth 2.0 Authorization Flow with PKCE in AgentSphere

```
1. USER INITIATES CONNECTION (UI):
   User clicks "Connect" on an OAuth-enabled MCP server in MCPServerList.tsx.

2. PKCE CODE VERIFIER GENERATION (Backend):
   - Generates random code_verifier (high-entropy cryptographic string).
   - Generates code_challenge = base64url(SHA256(code_verifier)).
   - Stores code_verifier temporarily on the MCPServer database record.
   - Redirects user to authorization server:
     https://auth-server.com/authorize?client_id=...&code_challenge=...&redirect_uri=/api/oauth/callback/[serverId]

3. USER CONSENT:
   User logs in on the third-party provider and grants permission.

4. CALLBACK & TOKEN EXCHANGE (/api/oauth/callback/[serverId]/route.ts):
   - Authorization server redirects back with ?code=xyz.
   - AgentSphere retrieves stored code_verifier from DB.
   - Makes backend POST request to token endpoint exchanging code + code_verifier for:
     { access_token, refresh_token, expires_at }
   - Stores encrypted authTokens in MCPServer record and updates oauthStatus = "CONNECTED".

5. AUTHORIZED TOOL CALLS:
   Subsequent MCP HTTP calls inject Authorization: Bearer <access_token> in headers.
```
