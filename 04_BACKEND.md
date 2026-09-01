# 04 — AgentSphere Backend Architecture & Node.js Fundamentals

## 1. Backend Fundamentals From Zero

### What is a Backend?
The backend is the server-side software responsible for business logic, database operations, security authentication, and external service communication (like LLM APIs) that cannot be trusted to run on a user's browser.

### Core Backend Concepts & MERN Parity

| Concept | Explanation | Node/Express Equivalent | AgentSphere Implementation |
| :--- | :--- | :--- | :--- |
| **Runtime** | JavaScript execution environment outside browser | Node.js v20+ | Node.js with Turbopack / Next.js server engine |
| **API** | Application Programming Interface (Contract between client and server) | `app.get('/api/...', (req, res) => ...)` | Next.js Route Handlers: `export async function GET(req: NextRequest)` in `src/app/api/*/route.ts` |
| **REST** | Representational State Transfer (Standard HTTP verbs for resource management) | `GET`, `POST`, `PUT`, `DELETE` | Standard REST endpoints for threads, servers, auth, and models |
| **Request Object** | Contains HTTP headers, query params, cookies, and JSON body | `req.query`, `req.body`, `req.cookies` | `NextRequest`, `req.nextUrl.searchParams`, `await req.json()` |
| **Response Object** | Returns HTTP status code, headers, and JSON / Stream data | `res.status(200).json(data)` | `NextResponse.json(data, { status: 200 })` or `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })` |
| **Middleware** | Interceptor functions for auth/logging | `app.use(authMiddleware)` | `getCurrentUser()` in `src/lib/auth.ts` executed inside route handlers |

---

## 2. API Routes Directory & Route Map in AgentSphere

```
src/app/api/
├── agent/
│   ├── stream/route.ts          -> GET: Real-time SSE chat streaming endpoint
│   ├── history/[threadId]/route.ts -> GET: Retrieve past messages for a thread from LangGraph checkpointer
│   ├── threads/route.ts         -> GET: List user threads | POST: Create thread | DELETE: Remove thread
│   ├── models/route.ts          -> GET: Dynamic discovery of active LLM models across Groq, OpenAI, etc.
│   └── upload/route.ts          -> POST: Multi-part file and image upload handling
├── auth/
│   ├── login/route.ts           -> POST: Password validation + JWT HttpOnly cookie generation
│   ├── register/route.ts        -> POST: User registration with scrypt password hashing
│   ├── logout/route.ts          -> POST: Cookie invalidation
│   ├── me/route.ts              -> GET: Current user session introspection
│   └── profile/route.ts         -> PUT: User profile updates (name/password)
├── mcp-servers/
│   ├── route.ts                 -> GET: List MCP servers | POST: Add new STDIO/HTTP server
│   └── [id]/route.ts            -> PUT: Update server config | DELETE: Remove server
├── mcp-tools/
│   └── route.ts                 -> GET: Dynamically fetch discovered tools from all active MCP servers
├── oauth/
│   ├── callback/[serverId]/route.ts -> GET: OAuth2 authorization code exchange & token storage
│   └── check/[serverId]/route.ts    -> GET: Check OAuth token expiration status
└── openapi/
    └── route.ts                 -> GET: Auto-generated OpenAPI v3 specification documentation
```
