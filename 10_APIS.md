# 10 — AgentSphere API Endpoints & Request Specifications

## Complete API Route Reference

| Method | Endpoint | Purpose | Auth Required? | Input Schema | DB Access? | External API? | Response |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/agent/stream` | Stream AI response via SSE | Optional | Query params: `content`, `threadId`, `provider`, `model`, `allowTool` | Yes (Checkpointer & Threads) | Yes (Groq/OpenAI/Anthropic/Gemini) | `text/event-stream` SSE tokens |
| `GET` | `/api/agent/history/[threadId]` | Fetch message history | Optional | URL param: `threadId` | Yes (`postgresCheckpointer.get()`) | No | `200 JSON { messages: [...] }` |
| `GET` | `/api/agent/threads` | List user's conversation threads | Yes (Cookie) | None | Yes (`prisma.thread.findMany`) | No | `200 JSON { threads: [...] }` |
| `POST` | `/api/agent/threads` | Create or update thread title | Optional | Body: `{ id?, title, isPinned? }` | Yes (`prisma.thread.upsert`) | No | `201 JSON { thread: {...} }` |
| `DELETE` | `/api/agent/threads` | Delete a conversation thread | Yes (Cookie) | Query param: `id` | Yes (`prisma.thread.delete`) | No | `200 JSON { success: true }` |
| `GET` | `/api/agent/models` | List available models & providers | No | None | No | Yes (Groq/OpenAI status checks) | `200 JSON { models: [...], providers: {...} }` |
| `POST` | `/api/agent/upload` | Upload files / images | Optional | `multipart/form-data` | No | S3 / Local Storage | `200 JSON { fileId, url, name, size, type }` |
| `POST` | `/api/auth/register` | Register new user account | No | Body: `{ name, email, password }` | Yes (`prisma.user.create`) | No | `201 JSON { user: {...} }` + Set-Cookie |
| `POST` | `/api/auth/login` | Authenticate user | No | Body: `{ email, password }` | Yes (`prisma.user.findUnique`) | No | `200 JSON { user: {...} }` + Set-Cookie |
| `POST` | `/api/auth/logout` | End user session | No | None | No | No | `200 JSON { success: true }` (Clears Cookie) |
| `GET` | `/api/auth/me` | Current session info | Yes (Cookie) | None | Yes (`prisma.user.findUnique`) | No | `200 JSON { user: {...} }` |
| `PUT` | `/api/auth/profile` | Update profile info/password | Yes (Cookie) | Body: `{ name?, password?, currentPassword? }` | Yes (`prisma.user.update`) | No | `200 JSON { user: {...} }` |
| `GET` | `/api/mcp-servers` | List configured MCP servers | No | None | Yes (`prisma.mCPServer.findMany`) | No | `200 JSON { servers: [...] }` |
| `POST` | `/api/mcp-servers` | Add new MCP server | No | Body: `{ name, type, command?, args?, url?, headers? }` | Yes (`prisma.mCPServer.create`) | No | `201 JSON { server: {...} }` |
| `PUT` | `/api/mcp-servers/[id]` | Update MCP server settings | No | Body: `{ enabled?, command?, ... }` | Yes (`prisma.mCPServer.update`) | No | `200 JSON { server: {...} }` |
| `DELETE` | `/api/mcp-servers/[id]` | Remove MCP server | No | URL param: `id` | Yes (`prisma.mCPServer.delete`) | No | `200 JSON { success: true }` |
| `GET` | `/api/mcp-tools` | Discovered MCP tools list | No | None | Yes (`prisma.mCPServer.findMany`) | Yes (Connects to MCP servers) | `200 JSON { tools: [...] }` |
| `GET` | `/api/openapi` | OpenAPI v3 JSON Schema | No | None | No | No | `200 JSON (OpenAPI Spec)` |
