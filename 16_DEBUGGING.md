# 16 — Practical Debugging Guide & Scenarios

## 1. Top Debugging Scenarios for Technical Interviews

### Scenario 1: "Messages are not appearing or stream fails immediately"
- **Symptom**: User clicks send, loading indicator blinks for a split second, but no response renders.
- **Root Cause Investigation**:
  1. Inspect Browser Console & Network Tab (`/api/agent/stream`). Look for HTTP 400/401/500 status.
  2. If status is 404/500 with message `The model X does not exist`: check `src/app/api/agent/models/route.ts` and verify if the requested model name is active for the configured API key.
  3. Check terminal server logs for checkpointer connection issues: `Failed to get history from checkpointer`.

### Scenario 2: "User logs in, but `/api/auth/me` returns 401 Unauthorized"
- **Symptom**: Login succeeds, but refreshing the page logs the user out.
- **Investigation**:
  1. Inspect browser cookies in DevTools -> Application -> Cookies.
  2. Verify `agentsphere_auth_token` cookie is present.
  3. If missing: Check `SameSite` and `Secure` attributes. In local `http://localhost`, `secure: true` will prevent cookies from being set if HTTPS is not enabled.
  4. If present: Check `JWT_SECRET` in `.env`. If `JWT_SECRET` changed or is undefined across server restarts, token signature verification fails in `verifyToken()`.

### Scenario 3: "Agent gets stuck during tool execution"
- **Symptom**: Chat shows "Waiting for tool review..." but does not proceed.
- **Investigation**:
  1. Check `approveAllTools` setting in `UISettingsContext.tsx`.
  2. LangGraph `interrupt()` requires an explicit resume command (`opts.allowTool = "allow"`).
  3. Verify `useChat.ts` sent the confirmation payload to `/api/agent/stream`.
