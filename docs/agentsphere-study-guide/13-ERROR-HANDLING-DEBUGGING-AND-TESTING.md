# 🐛 13-ERROR-HANDLING-DEBUGGING-AND-TESTING.md — Troubleshooting & Diagnostics

---

## 📌 Document Metadata & Diagnostic Scope
This guide provides systematic debugging strategies for common failure modes across AgentSphere's frontend, backend route handlers, LangGraph state machine, database, and external tool integrations.

---

## 1. The Diagnostic Toolkit for AgentSphere

When debugging an AI agent system, standard breakpoints are often insufficient due to asynchronous streaming and distributed network dependencies. Use this 4-step diagnostic protocol:

```mermaid
graph TD
    Step1["1. Browser Network Tab<br/>Inspect /api/agent/stream headers, SSE chunks, and status codes"]
    Step2["2. Next.js Terminal Logs<br/>Inspect console.error output, LLM exceptions, and DB connection traces"]
    Step3["3. PostgreSQL Inspection<br/>Run `pnpm prisma:studio` to check Thread, User, and MCPServer rows"]
    Step4["4. MinIO Web Console<br/>Visit http://localhost:9001 to verify file uploads in the `uploads` bucket"]

    Step1 --> Step2 --> Step3 --> Step4
```

---

## 2. Realistic Debugging Scenarios Grounded in Code

### Scenario 1: The SSE Stream Hangs Indefinitely Without Output
- **Symptom**: User hits Send; loading spinner animates endlessly; no response text appears.
- **Root Cause Analysis**:
  1. **Missing or Expired LLM Key**: In [src/lib/agent/util.ts](file:///c:/Projects/AgentSphere/src/lib/agent/util.ts#L34-L58), if an API key is missing, the code passes `"missing-api-key"`. The LLM provider immediately throws an unauthorized error.
  2. **Uncaught LangGraph Interrupt**: If `approveAllTools` is `false`, the graph paused execution at `interrupt()` waiting for client resumption, but the frontend failed to render the approval card.
- **How to Investigate**:
  - Open Chrome DevTools $\rightarrow$ **Network** tab $\rightarrow$ Click on `stream?content=...` $\rightarrow$ Select the **EventStream** tab.
  - If you see `: connected\n\n` followed by `event: error`, inspect the error JSON payload.
- **Fix**: Check your `.env` file to ensure `GROQ_API_KEY` or `GOOGLE_API_KEY` is present and valid.

---

### Scenario 2: Google Gemini Throws `400 Bad Request` on Tool Execution
- **Symptom**: Prompt works fine with OpenAI/Groq, but immediately crashes when switching provider to Google Gemini with MCP tools enabled.
- **Root Cause Analysis**:
  - Gemini's function calling API rejects standard JSON Schema draft-07 keywords.
  - If a new MCP tool exports a schema containing an unsupported keyword that wasn't included in `UNSUPPORTED_SCHEMA_KEYWORDS` in [src/lib/agent/util.ts:L76](file:///c:/Projects/AgentSphere/src/lib/agent/util.ts#L76), Gemini throws a validation exception.
- **How to Investigate**:
  - Check the Next.js server terminal logs for `GoogleGenerativeAIError: [400 Bad Request] Invalid function declaration`.
- **Fix**:
  - Inspect the raw tool schema logged from `client.getTools()`. Add any offending keyword to `UNSUPPORTED_SCHEMA_KEYWORDS` in [src/lib/agent/util.ts](file:///c:/Projects/AgentSphere/src/lib/agent/util.ts#L76).

---

### Scenario 3: Database Connection Refused (`ECONNREFUSED 127.0.0.1:5434`)
- **Symptom**: Next.js terminal logs show: `PrismaClientInitializationError: Can't reach database server at localhost:5434`.
- **Root Cause Analysis**:
  - Docker container is stopped, or the user assumed PostgreSQL runs on the default port `5432` rather than `5434`.
- **How to Investigate**:
  - Run `docker compose ps` in your terminal. Check if `agentsphere-db-1` is in status `Up`.
- **Fix**:
  ```bash
  docker compose up -d db
  ```
  Verify that your `.env` file specifies port `5434`:
  `DATABASE_URL="postgresql://user:password@localhost:5434/mydb?schema=public"`

---

### Scenario 4: File Upload Returns `400 Bad Request` or Fails Silently
- **Symptom**: Dragging a file into the chat window fails with *"File appears to be binary, not text"* or *"Upload failed"*.
- **Root Cause Analysis**:
  - In [src/lib/storage/validation.ts](file:///c:/Projects/AgentSphere/src/lib/storage/validation.ts), strict file size and MIME checks are enforced:
    - Images: Max 5MB
    - Documents (PDF): Max 10MB
    - Text files: Max 2MB
  - In [src/app/api/agent/upload/route.ts:L42-L57](file:///c:/Projects/AgentSphere/src/app/api/agent/upload/route.ts#L42-L57), if a file is submitted as `application/octet-stream` with a `.txt` extension, `isValidTextContent()` scans the buffer. If binary control characters are found, it rejects the file to prevent binary injection.
- **Fix**: Ensure the uploaded file matches supported MIME types and does not exceed size limits. Verify MinIO is running on port 9000.

---

### Scenario 5: Clicking "Allow" on a Tool Call Does Nothing
- **Symptom**: Tool approval card displays [Allow] and [Deny], but clicking [Allow] does not resume the AI response.
- **Root Cause Analysis**:
  - The client sent `allowTool=allow`, but the server's checkpointer could not find the suspended thread state in the `checkpoints` table (e.g. if the `threadId` changed or the database was restarted without persistent volumes).
- **How to Investigate**:
  - Inspect `GET /api/agent/stream?allowTool=allow&threadId=...` in the Network tab.
  - Verify that the `threadId` in the query parameter exactly matches the thread ID of the interrupted turn.

---

## 3. Testing Audit & Missing Test Suite `[AUDIT FINDING]`

### Verified Repository Status
- **Unit Tests**: `NOT FOUND` (0 test files in repository).
- **Integration Tests**: `NOT FOUND`.
- **E2E Tests**: `NOT FOUND`.
- **Test Scripts in `package.json`**: No `"test"` script is defined.

### Proposed Production Testing Strategy

If asked in an interview: *"How would you test this application?"*, present this 3-tier testing roadmap:

```mermaid
graph TD
    Tier1["1. Unit Testing (Vitest)<br/>- Test `sanitizeSchema()` with complex JSON schemas<br/>- Test `hashPassword()` and `verifyPassword()`<br/>- Test `generateSmartTitle()`"]
    Tier2["2. Integration Testing (Node Test Runner / Supertest)<br/>- Mock LLM calls and verify StateGraph transitions<br/>- Test `/api/agent/upload` with sample multipart buffers<br/>- Test `/api/auth/login` cookie issuance"]
    Tier3["3. End-to-End Testing (Playwright)<br/>- Automate browser: User logs in -> sends message<br/>- Verify SSE token accumulation in DOM<br/>- Click [Allow] on tool approval and verify final text"]

    Tier1 --> Tier2 --> Tier3
```

1. **Unit Testing (Vitest)**:
   - Test [src/lib/agent/util.ts](file:///c:/Projects/AgentSphere/src/lib/agent/util.ts#L141-L228) against deeply nested schemas with all 32 disallowed keywords to ensure Gemini compatibility.
   - Test [src/lib/auth.ts](file:///c:/Projects/AgentSphere/src/lib/auth.ts) to verify that `verifyPassword` rejects tampered hashes and that `verifyToken` correctly invalidates expired JWTs.
2. **Integration Testing**:
   - Use mock LLMs (`FakeListChatModel` from `@langchain/core/utils/testing`) to simulate an AI model emitting tool calls without spending real API credits.
   - Assert that `AgentBuilder` triggers an interrupt when `approveAllTools: false` and proceeds directly when `approveAllTools: true`.
3. **End-to-End Testing (Playwright)**:
   - Automate browser interactions: typing a message, verifying the optimistic UI update, checking SSE chunk rendering, and testing voice button interactions.

Proceed to [14-DESIGN-DECISIONS-TRADEOFFS-AND-IMPROVEMENTS.md](file:///c:/Projects/AgentSphere/docs/agentsphere-study-guide/14-DESIGN-DECISIONS-TRADEOFFS-AND-IMPROVEMENTS.md) to explore architectural design choices, trade-offs, and future improvements.
