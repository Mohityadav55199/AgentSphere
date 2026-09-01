# 02 — AgentSphere Complete Architecture

## 1. High-Level System Architecture

```
+===================================================================================+
|                                    CLIENT TIER                                     |
|  +-----------------------------------------------------------------------------+  |
|  | Browser (React 19 Functional UI + Tailwind CSS + Framer Motion)              |  |
|  | - ThreadList & Sidebar: Manage chat threads & history                       |  |
|  | - MessageList & AIMessage: Markdown/LaTeX display & tool execution cards      |  |
|  | - MessageInput: Text, file attachments & model selector                     |  |
|  | - MCPServerList: Configure & test custom MCP tools / OAuth connections      |  |
|  +---------------------------------------+-------------------------------------+  |
+==========================================|========================================+
                                           | HTTP REST / SSE Stream (Fetch API)
                                           v
+===================================================================================+
|                          NEXT.JS 16 APPLICATION BACKEND                            |
|                                                                                   |
|  +---------------------------+       +-----------------------------------------+  |
|  |    API ROUTE HANDLERS     |       |           AUTHENTICATION LAYER          |  |
|  | /api/auth/*               |       | - JWT Token generation (HS256)          |  |
|  | /api/agent/stream (SSE)   | <---> | - HttpOnly Cookie extraction            |  |
|  | /api/agent/threads        |       | - Password hashing with crypto.scrypt   |  |
|  | /api/agent/models         |       +-----------------------------------------+  |
|  | /api/mcp-servers & tools  |                                                    |
|  +-------------+-------------+                                                    |
|                |                                                                  |
|                v                                                                  |
|  +-----------------------------------------------------------------------------+  |
|  |                         AGENT SERVICE ORCHESTRATION                         |  |
|  |                     (src/services/agentService.ts)                          |  |
|  | - ensureThread(): Verify/create thread record in database                   |  |
|  | - ensureAgent(): Initialize model factory & bind active MCP tools           |  |
|  | - streamResponse(): LangGraph execution loop + SSE chunk packaging         |  |
|  +-------------------------------------+---------------------------------------+  |
+========================================|==========================================+
                                         |
            +----------------------------+----------------------------+
            |                                                         |
            v                                                         v
+=======================+                                 +=======================+
|   LANGGRAPH STATE     |                                 |    DATABASE & STORAGE |
|   EXECUTION ENGINE    |                                 |                       |
|                       |                                 | +-------------------+ |
|   +---------------+   |                                 | | Prisma ORM Client | |
|   |  START NODE   |   |                                 | | - User            | |
|   +-------+-------+   |                                 | | - Thread          | |
|           v           |                                 | | - MCPServer       | |
|   +---------------+   |                                 | +---------+---------+ |
|   |  agent Node   |   |                                 |           |           |
|   | (LLM Invoker) |   |                                 |           v           |
|   +-------+-------+   |                                 | +-------------------+ |
|           |           |                                 | | Neon PostgreSQL   | |
|     (tool_calls?)     |                                 | | - Relational Data | |
|       /       \       |                                 | | - Checkpointer:   | |
|     YES        NO     |                                 | |   checkpoints,    | |
|     /           \     |                                 | |   checkpoint_     | |
|    v             v    |                                 | |   writes/blobs    | |
| +-------------+ +---+ |                                 | +-------------------+ |
| |tool_approval| |END| |                                 |                       |
| +------+------+ +---+ |                                 | +-------------------+ |
|        |              |                                 | | S3 / Local Disk   | |
|   (Approved?)         |                                 | | File Attachments  | |
|    /       \          |                                 | +-------------------+ |
|  YES        NO        |                                 +=======================+
|   v          v        |
| +-----+  +-------+    |
| |tools|  | agent |    |
| +--+--+  | Node  |    |
|    |     +-------+    |
|    +--------^         |
+=======================+
            |
            +------------------------------------+
            |                                    |
            v                                    v
+=======================+            +=======================+
|  MULTI-PROVIDER LLMS  |            |   MODEL CONTEXT       |
|                       |            |   PROTOCOL (MCP)      |
| - Groq                |            |                       |
| - OpenAI              |            | - Stdio Process Spawn |
| - Anthropic Claude    |            | - HTTP SSE Endpoints  |
| - Google Gemini       |            | - OAuth2 Connectors   |
+=======================+            +=======================+
```

---

## 2. Component Layer Responsibilities

### A. Frontend Tier (`src/components`, `src/contexts`, `src/hooks`)
- **State Management**:
  - `UISettingsContext.tsx`: Active LLM provider, selected model, temperature, system prompt, tool approval mode, and active threads.
  - `useChat.ts`: Manages message streaming, SSE chunk decoding, auto-scrolling, human review approvals, and attachment state.
- **Presentation**:
  - `Thread.tsx` & `MessageList.tsx`: High-performance conversation feed rendering markdown, tool execution states, and code blocks.
  - `ModelConfiguration.tsx`: Real-time model switcher populated dynamically via `/api/agent/models`.

### B. Backend API Tier (`src/app/api/*`)
- Follows Next.js 16 App Router Route Handlers (`route.ts`).
- Standardized RESTful endpoints with Zod input schema validation, standard HTTP status codes (200, 201, 400, 401, 404, 500), and unified error payloads.

### C. Agent Execution Tier (`src/lib/agent/*`)
- **`AgentBuilder` (`src/lib/agent/builder.ts`)**: Constructs the compiled LangGraph workflow with tool nodes and human-in-the-loop approval edges.
- **`ensureAgent` (`src/lib/agent/index.ts`)**: Caches and dynamically builds agents based on requested provider/model and active MCP servers.
- **`util.ts` (`src/lib/agent/util.ts`)**: Multi-provider LLM factory (`createChatModel`) instantiating `ChatGroq`, `ChatOpenAI`, `ChatAnthropic`, or `ChatGoogleGenerativeAI`.

### D. Persistence Tier (`prisma/schema.prisma` & `src/lib/agent/memory.ts`)
- **Metadata**: User accounts, Thread metadata, and MCP server configurations stored in PostgreSQL via Prisma ORM.
- **Graph State & History**: LangGraph Postgres Saver (`@langchain/langgraph-checkpoint-postgres`) stores binary execution snapshots and message channel states per `thread_id`.
