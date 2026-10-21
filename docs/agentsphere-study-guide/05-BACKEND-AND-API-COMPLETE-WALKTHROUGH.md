# ⚡ 05-BACKEND-AND-API-COMPLETE-WALKTHROUGH.md — Backend Architecture & API Catalog

---

## 📌 Document Metadata & Route Verification
- **Target Repository**: `AgentSphere`
- **Backend Architecture**: Next.js 16 App Router Route Handlers (`src/app/api/`) running in Node.js runtime (`export const runtime = "nodejs"`).
- **Verification Rule**: Every endpoint listed below is verified against existing source code files.

---

## 1. The Backend Architecture: Next.js Route Handlers

Unlike classical Node.js apps that run an Express.js server on port 5000 and a React frontend on port 3000, **AgentSphere uses Next.js Route Handlers**:
- Each folder inside `src/app/api/` containing a `route.ts` file acts as an independent HTTP route handler.
- Methods are exported as named async functions: `export async function GET(req: NextRequest) { ... }`, `POST`, `PATCH`, `DELETE`.
- Handlers run within the Node.js server environment with access to server secrets, file buffers, Prisma, and native Node.js modules like `crypto`.

---

## 2. Complete API Endpoint Inventory

| Method & Route | Purpose | Auth Required | Input | Validation | DB / Models | External Calls | Source File |
|---|---|---|---|---|---|---|---|
| `GET /api/agent/stream` | Streams AI response via SSE | Optional (associates user if cookie present) | Query params: `content`, `threadId`, `model`, `provider`, `allowTool`, `temperature`, etc. | Manual parsing & type casting | `Thread` (metadata) + LangGraph `checkpoints` | LLM APIs (Groq, Gemini, OpenAI, Claude), MCP servers | [src/app/api/agent/stream/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/stream/route.ts) |
| `GET /api/agent/threads` | Lists conversation threads | Optional (returns user's or guest threads) | Headers (Cookies) | None | `Thread.findMany` (ordered by `isPinned`, `updatedAt`) | None | [src/app/api/agent/threads/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/threads/route.ts#L18-L40) |
| `POST /api/agent/threads` | Creates a new thread | Optional | None | None | `Thread.create` (`title: "New thread"`) | None | [src/app/api/agent/threads/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/threads/route.ts#L42-L66) |
| `PATCH /api/agent/threads` | Renames or pins a thread | No (ID check) | JSON Body: `{ id, title?, isPinned? }` | Zod `UpdateThreadBody` | `Thread.update` | None | [src/app/api/agent/threads/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/threads/route.ts#L68-L98) |
| `DELETE /api/agent/threads` | Deletes a thread | No (ID check) | JSON Body: `{ id }` | Zod `DeleteThreadBody` | `Thread.delete` | None | [src/app/api/agent/threads/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/threads/route.ts#L100-L126) |
| `GET /api/agent/history/[threadId]` | Fetches full conversation messages | No | Path param: `threadId` | Path check | LangGraph `postgresCheckpointer` | None | [src/app/api/agent/history/[threadId]/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/history/%5BthreadId%5D/route.ts) |
| `GET /api/agent/models` | Returns available providers & models | No | None | Validates API key presence in `process.env` | None | Groq Models API (`api.groq.com/openai/v1/models`) | [src/app/api/agent/models/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/models/route.ts) |
| `POST /api/agent/upload` | Uploads files to S3/MinIO | No | Multipart Form Data: `file` | Size & MIME validation (`validateFile`) | None | MinIO / AWS S3 (`PutObjectCommand`, `Upload`) | [src/app/api/agent/upload/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/upload/route.ts) |
| `GET /api/mcp-servers` | Lists all MCP servers | No | None | None | `MCPServer.findMany` | None | [src/app/api/mcp-servers/route.ts](file:///c:/Projects/AgentSphere/src/app/api/mcp-servers/route.ts#L6-L16) |
| `POST /api/mcp-servers` | Registers new MCP server | No | JSON Body: `{ name, type, command?, args?, url?, headers? }` | Manual type & required fields | `MCPServer.create` | None | [src/app/api/mcp-servers/route.ts](file:///c:/Projects/AgentSphere/src/app/api/mcp-servers/route.ts#L18-L55) |
| `PATCH /api/mcp-servers` | Updates server config/status | No | JSON Body: `{ id, ...updates }` | Zod `UpdateMCPServerBody` | `MCPServer.update` | None | [src/app/api/mcp-servers/route.ts](file:///c:/Projects/AgentSphere/src/app/api/mcp-servers/route.ts#L57-L97) |
| `DELETE /api/mcp-servers` | Deletes an MCP server | No | Query param: `id` | ID presence check | `MCPServer.delete` | None | [src/app/api/mcp-servers/route.ts](file:///c:/Projects/AgentSphere/src/app/api/mcp-servers/route.ts#L99-L120) |
| `GET /api/mcp-tools` | Returns grouped MCP tools list | No | None | None | `MCPServer.findMany({ enabled: true })` | Dispatches tool discovery to MCP servers | [src/app/api/mcp-tools/route.ts](file:///c:/Projects/AgentSphere/src/app/api/mcp-tools/route.ts) |
| `GET /api/oauth/check/[serverId]` | Checks OAuth requirement | No | Path param: `serverId` | ID presence check | `MCPServer.findFirst` | MCP Auth Discovery endpoint | [src/app/api/oauth/check/[serverId]/route.ts](file:///c:/Projects/AgentSphere/src/app/api/oauth/check/%5BserverId%5D/route.ts) |
| `GET /api/oauth/callback/[serverId]` | OAuth code exchange callback | No | Path param: `serverId`, query: `code` | Code presence check | `MCPServer.update` (tokens & status) | OAuth Token Endpoint (`transport.finishAuth`) | [src/app/api/oauth/callback/[serverId]/route.ts](file:///c:/Projects/AgentSphere/src/app/api/oauth/callback/%5BserverId%5D/route.ts) |
| `POST /api/auth/register` | Registers new user account | No | JSON Body: `{ name, email, password }` | Password length >= 6, email unique | `User.create` | None | [src/app/api/auth/register/route.ts](file:///c:/Projects/AgentSphere/src/app/api/auth/register/route.ts) |
| `POST /api/auth/login` | Authenticates user & sets cookie | No | JSON Body: `{ email, password }` | Email/password check, scrypt verification | `User.findUnique` | None | [src/app/api/auth/login/route.ts](file:///c:/Projects/AgentSphere/src/app/api/auth/login/route.ts) |
| `POST /api/auth/logout` | Clears auth session cookie | No | None | None | None | None | [src/app/api/auth/logout/route.ts](file:///c:/Projects/AgentSphere/src/app/api/auth/logout/route.ts) |
| `GET /api/auth/me` | Returns current user session | Yes (via cookie) | Cookie: `agentsphere_auth_token` | JWT verification (`verifyToken`) | None (reads token payload) | None | [src/app/api/auth/me/route.ts](file:///c:/Projects/AgentSphere/src/app/api/auth/me/route.ts) |
| `GET /api/auth/profile` | Fetches user profile data | Yes | Cookie: `agentsphere_auth_token` | JWT verification | `User.findUnique` | None | [src/app/api/auth/profile/route.ts](file:///c:/Projects/AgentSphere/src/app/api/auth/profile/route.ts#L7-L23) |
| `PATCH /api/auth/profile` | Updates user name or password | Yes | JSON Body: `{ name?, currentPassword?, newPassword? }` | Password verification & length check | `User.update` | None | [src/app/api/auth/profile/route.ts](file:///c:/Projects/AgentSphere/src/app/api/auth/profile/route.ts#L25-L93) |
| `GET /api/openapi` | Serves OpenAPI 3.1 JSON spec | No | None | None | None | None | [src/app/api/openapi/route.ts](file:///c:/Projects/AgentSphere/src/app/api/openapi/route.ts) |
| `GET /api-docs` | Interactive Scalar API reference | No | None | None | None | None | [src/app/api-docs/route.ts](file:///c:/Projects/AgentSphere/src/app/api-docs/route.ts) |

---

## 3. Deep Dive: Key Endpoints Traced Step-by-Step

### 3.1 `GET /api/agent/stream` (The Core Streaming Engine)
- **Path**: [src/app/api/agent/stream/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/stream/route.ts)
- **Execution Flow**:
  1. Extracts query parameters: `content`, `threadId`, `model`, `provider`, `allowTool`, `approveAllTools`, `attachments`, `temperature`, `systemPrompt`.
  2. Inspects session cookie via `getCurrentUser()` to identify if a logged-in user owns the request.
  3. Instantiates a `ReadableStream<Uint8Array>`.
  4. Pushes immediate connection comment: `: connected\n\n`.
  5. Calls `streamResponse()` in [src/services/agentService.ts](file:///c:/Projects/AgentSphere/src/services/agentService.ts):
     - Ensures thread exists in Prisma (`ensureThread()`).
     - If `allowTool` is present, creates `new Command({ resume: { action: ... } })`.
     - Otherwise, constructs a `HumanMessage` (attaching processed image/document blocks if attachments exist).
     - Obtains agent from `ensureAgent()` and calls `agent.stream()`.
  6. Iterates over chunks; encodes `data: ${JSON.stringify(chunk)}\n\n`.
  7. On finish, sends `event: done\ndata: {}\n\n` and closes the stream controller.
- **Success Response**: `HTTP 200` with `Content-Type: text/event-stream; charset=utf-8`.
- **Error Response**: Sends `event: error\ndata: {"message": "..."}\n\n`.

---

### 3.2 `POST /api/agent/upload` (Multimodal Storage Engine)
- **Path**: [src/app/api/agent/upload/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/upload/route.ts)
- **Execution Flow**:
  1. Parses `request.formData()` and extracts `file`.
  2. Runs `validateFile(file)` in [src/lib/storage/validation.ts](file:///c:/Projects/AgentSphere/src/lib/storage/validation.ts):
     - Validates MIME type against allowlist (PNG, JPEG, PDF, Markdown, Plain Text).
     - Checks size constraints: Images $\le$ 5MB, Documents $\le$ 10MB, Text $\le$ 2MB.
  3. If MIME type is `application/octet-stream`, inspects buffer content to verify it contains genuine text characters rather than binary executables (`isValidTextContent`).
  4. Generates unique UUID key: `${randomUUID()}.${extension}`.
  5. If file size $> 5\text{MB}$, invokes multipart upload (`uploadLargeFile`); otherwise invokes standard upload (`uploadFile`).
  6. Sends payload to MinIO or AWS S3.
- **Success Response**:
  ```json
  {
    "success": true,
    "url": "http://localhost:9000/uploads/4f1a...png",
    "key": "4f1a...png",
    "name": "diagram.png",
    "type": "image/png",
    "size": 104288
  }
  ```

---

### 3.3 `POST /api/auth/register` & `POST /api/auth/login`
- **Paths**: [src/app/api/auth/register/route.ts](file:///c:/Projects/AgentSphere/src/app/api/auth/register/route.ts), [src/app/api/auth/login/route.ts](file:///c:/Projects/AgentSphere/src/app/api/auth/login/route.ts)
- **Execution Flow**:
  1. Parses request body JSON.
  2. Normalizes email: `email.toLowerCase().trim()`.
  3. For register: generates a 16-byte random salt and hashes password via `crypto.scryptSync(password, salt, 64)`. Stores `salt:hash` in `User` table.
  4. For login: fetches user by unique email, extracts stored salt, computes hash of provided password, and verifies match via `crypto.timingSafeEqual`.
  5. Creates signed JWT using HMAC-SHA256 (`signToken({ id, email, name })`).
  6. Sets `agentsphere_auth_token` in response cookies with flags: `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 7 days`.

---

## 4. How to Safely Add a New API Endpoint

Follow this checklist to add an endpoint without breaking architecture:

1. **Create the Folder & Route File**:
   - Create `src/app/api/my-feature/route.ts`.
2. **Export Runtime Flags**:
   - `export const dynamic = "force-dynamic";`
   - `export const runtime = "nodejs";`
3. **Co-locate a Zod Schema**:
   - Create `src/app/api/my-feature/schema.ts`.
   - Define request/response Zod schemas: `export const MyFeatureBody = z.object({...}).openapi("MyFeatureBody");`
   - Call `registry.registerPath({...})` to document it.
4. **Register in OpenAPI Barrel**:
   - Open [src/lib/api/openapi/routes.ts](file:///c:/Projects/AgentSphere/src/lib/api/openapi/routes.ts) and add: `import "@/app/api/my-feature/schema";`.
5. **Handle Errors Cleanly**:
   - Always wrap route logic in `try / catch` blocks and return typed JSON: `NextResponse.json({ error: message }, { status: 500 })`.

Proceed to [06-LANGCHAIN-LANGGRAPH-AND-AGENTS.md](file:///c:/Projects/AgentSphere/docs/agentsphere-study-guide/06-LANGCHAIN-LANGGRAPH-AND-AGENTS.md) to explore the LangGraph state machine, nodes, edges, and agent workflows in depth.
