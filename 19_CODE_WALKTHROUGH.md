# 19 — Top 10 File Code Walkthroughs

## 1. `src/lib/agent/builder.ts` (Agent Graph Builder)
- **Role**: Defines the LangGraph state machine.
- **Key Functions**:
  - `build()`: Creates `StateGraph(MessagesAnnotation)`, registers `agent`, `tools`, and `tool_approval` nodes, adds conditional edges, and compiles graph with the checkpointer.
  - `shouldApproveTool(state)`: Checks if the last message contains tool calls; routes to `tool_approval` if found.
  - `approveToolCall(state)`: Uses `interrupt()` to pause execution and await user confirmation or feedback.
  - `callModel(state)`: Invokes the LLM with bound tools and system prompt.

---

## 2. `src/services/agentService.ts` (Agent Service Orchestration)
- **Role**: Coordinates database thread initialization, multimodal attachment ingestion, agent execution, and SSE chunk generation.
- **Key Functions**:
  - `streamResponse({ threadId, userText, opts })`: Ensures thread exists in Prisma, prepares multimodal messages, streams LangGraph updates, and converts graph output into an async generator of `MessageResponse` objects.

---

## 3. `src/lib/auth.ts` (Custom Cryptographic Authentication)
- **Role**: Handles scrypt password hashing and HMAC-SHA256 JWT session tokens without third-party blackbox libraries.
- **Key Functions**:
  - `hashPassword(password)`: Generates a 16-byte random salt and derives a 64-byte scrypt key.
  - `verifyPassword(password, storedHash)`: Constant-time safe password verification.
  - `signToken(payload)` & `verifyToken(token)`: Signs and validates base64url JWT tokens with 7-day expiration.
  - `getCurrentUser()`: Extracts and verifies auth cookies from incoming HTTP requests.

---

## 4. `src/lib/agent/memory.ts` (PostgreSQL Checkpointer Memory)
- **Role**: Connects LangGraph to PostgreSQL for long-term thread state persistence.
- **Key Functions**:
  - `createCheckpointer()`: Initializes `PostgresSaver.fromConnString(DATABASE_URL)` with fallback to `MemorySaver()`.
  - `getHistory(threadId)`: Retrieves stored message history from the PostgreSQL checkpointer.

---

## 5. `src/lib/agent/util.ts` (Multi-Provider Model Factory)
- **Role**: Instantiates chat models dynamically across Groq, OpenAI, Anthropic, and Google Gemini.
- **Key Functions**:
  - `createChatModel({ provider, model, temperature })`: Factory returning the correct LangChain model instance.
  - `getDefaultProvider()` & `getDefaultModel()`: Inspects environment variables to choose the best available provider dynamically.

---

## 6. `src/app/api/agent/stream/route.ts` (SSE Stream Route Handler)
- **Role**: Next.js 16 route handler that transforms the backend async generator into a standard HTTP Server-Sent Events stream.

---

## 7. `src/app/api/agent/models/route.ts` (Dynamic Model Discovery Route)
- **Role**: Probes active provider APIs (e.g. Groq) at runtime and returns a list of accessible models.

---

## 8. `src/hooks/useChat.ts` (Frontend Streaming & Chat Hook)
- **Role**: Manages the entire frontend chat lifecycle: sending messages, reading SSE streams, auto-scrolling, handling tool approvals, and optimistic UI updates.

---

## 9. `src/contexts/UISettingsContext.tsx` (Global UI State Context)
- **Role**: Provides global access to the active LLM provider, selected model, tool approval toggles, and user thread lists.

---

## 10. `prisma/schema.prisma` (Database Schema)
- **Role**: Declarative schema for PostgreSQL tables: `User`, `Thread`, `MCPServer`, and relational constraints.
