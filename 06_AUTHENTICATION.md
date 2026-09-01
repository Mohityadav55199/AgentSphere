# 06 — AgentSphere Authentication & Security Architecture

## 1. Authentication vs Authorization
- **Authentication (AuthN)**: Answering *"Who are you?"* (Verifying user identity via email and password).
- **Authorization (AuthZ)**: Answering *"What are you allowed to do?"* (Verifying that User A can only view and delete their own threads, not User B's).

---

## 2. Authentication Flow in AgentSphere (`src/lib/auth.ts`)

```
[REGISTRATION]
User fills email & password -> POST /api/auth/register
            ↓
Backend generates random 16-byte cryptographic salt:
crypto.randomBytes(16).toString("hex")
            ↓
Derives 64-byte key using Node.js scrypt KDF:
crypto.scryptSync(password, salt, 64).toString("hex")
            ↓
Stores "salt:hash" in PostgreSQL User table.

[LOGIN]
User submits email & password -> POST /api/auth/login
            ↓
Fetch user from DB by email
            ↓
Extract stored salt & hash, recompute scrypt with provided password
            ↓
Compare using timing-safe buffer comparison to prevent timing attacks:
crypto.timingSafeEqual(storedHashBuffer, computedHashBuffer)
            ↓
[SUCCESSFUL AUTHENTICATION -> JWT GENERATION]
Create JWT Token:
- Header: { alg: "HS256", typ: "JWT" } (base64url)
- Payload: { id, email, name, exp: 7 days } (base64url)
- Signature: crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url")
            ↓
Set HttpOnly, Secure, SameSite=Lax Cookie:
Response.cookies.set("agentsphere_auth_token", token, {
  httpOnly: true, // Prevents JavaScript/XSS access to token
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60,
  path: "/"
})
```

---

## 3. Session Verification in Protected Endpoints
When any request arrives at a protected endpoint (e.g. `/api/auth/me` or `/api/agent/threads`):
1. `getCurrentUser()` reads `agentsphere_auth_token` from incoming HTTP request cookies.
2. Extracts header, payload, and signature.
3. Re-computes HMAC SHA256 signature using server-side `JWT_SECRET`.
4. Performs `crypto.timingSafeEqual` check and validates expiration timestamp (`exp < Date.now() / 1000`).
5. Returns typed `UserSession { id, email, name }` or `null`.
