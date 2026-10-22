# 🎓 17-LEARNING-EXERCISES.md — Hands-On Code Challenges & Solutions

---

## 📌 Document Metadata & Learning Strategy

These 10 progressive exercises are designed to guide you through hands-on code investigation of the AgentSphere repository.

_Rule_: Try to solve each challenge by inspecting the code before reading the provided solutions at the bottom of the document!

---

## Part 1: Hands-On Exercises

### Exercise 1: Trace the API Endpoint That Returns Available Models

- **Objective**: Find where the application discovers which LLMs are configured.
- **Starting Point**: [src/components/ModelConfiguration.tsx](file:///c:/Projects/AgentSphere/src/components/ModelConfiguration.tsx)
- **Instructions**:
  1. Open `ModelConfiguration.tsx` and identify which API endpoint provides the model list.
  2. Locate the route handler file that serves this endpoint.
  3. Determine how the backend detects if Groq, Google Gemini, OpenAI, or Anthropic are available.
  4. Find the fallback models for Google Gemini if live discovery fails.
- **Hints**: Look for `fetch("/api/agent/...")` in `UISettingsContext.tsx`.

---

### Exercise 2: Inspect Where the LLM is Actually Invoked

- **Objective**: Pinpoint the exact line of code that dispatches the prompt to the AI provider.
- **Starting Point**: [src/lib/agent/builder.ts](file:///c:/Projects/AgentSphere/src/lib/agent/builder.ts)
- **Instructions**:
  1. Open `builder.ts` and locate the `callModel` method.
  2. Find where tools are bound to the model.
  3. Find the method call that executes the inference.
  4. What message is prepended to the user's conversation history before invocation?
- **Hints**: Look for `.bindTools()` and `.invoke()`.

---

### Exercise 3: Identify Where Human-in-the-Loop Pauses Execution

- **Objective**: Find the exact line of code that suspends LangGraph when an agent requests a tool.
- **Starting Point**: [src/lib/agent/builder.ts](file:///c:/Projects/AgentSphere/src/lib/agent/builder.ts)
- **Instructions**:
  1. Locate the `approveToolCall` method.
  2. Identify the LangGraph primitive that freezes execution.
  3. Determine what data is passed to the client when the graph is interrupted.
  4. Find which parameter bypasses this pause when the user wants autonomous execution.
- **Hints**: Look for `interrupt` and `this.approveAllTools`.

---

### Exercise 4: Trace the Password Hashing Mechanism

- **Objective**: Understand how user passwords are encrypted and verified.
- **Starting Point**: [src/lib/auth.ts](file:///c:/Projects/AgentSphere/src/lib/auth.ts)
- **Instructions**:
  1. Open `src/lib/auth.ts` and find `hashPassword()` and `verifyPassword()`.
  2. How many bytes of random salt are generated?
  3. Which Node.js cryptographic algorithm derives the hash?
  4. What function is used to compare the hashes, and why?
- **Hints**: Look for `crypto.scryptSync` and `crypto.timingSafeEqual`.

---

### Exercise 5: Locate the Gemini JSON Schema Sanitizer

- **Objective**: Find the utility that strips prohibited keywords from MCP tool schemas.
- **Starting Point**: [src/lib/agent/util.ts](file:///c:/Projects/AgentSphere/src/lib/agent/util.ts)
- **Instructions**:
  1. Locate `UNSUPPORTED_SCHEMA_KEYWORDS`.
  2. Identify 3 keywords that Google Gemini rejects.
  3. Find how union types like `["string", "null"]` are transformed.
  4. What happens if a tool schema has an empty `properties: {}` block?
- **Hints**: Look for `normalizeType` and `sanitizeSchema`.

---

### Exercise 6: Trace Thread Deletion and Identify the Orphaned Checkpoint Issue

- **Objective**: Understand how Prisma deletes threads and where the persistence gap lies.
- **Starting Point**: [src/app/api/agent/threads/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/threads/route.ts)
- **Instructions**:
  1. Locate the `DELETE` handler.
  2. Find which Prisma model method deletes the record.
  3. Read the developer comment on line 117. What happens to the LangGraph checkpoint records in PostgreSQL when a thread is deleted?
- **Hints**: Look for `await prisma.thread.delete`.

---

### Exercise 7: Predict What Breaks: Changing the Database Port

- **Objective**: Predict the cascading failure if someone changes `POSTGRES_PORT` from `5434` to `5432` in `compose.yaml`.
- **Scenario**: A developer opens `compose.yaml` and edits line 9 to map port `5432:5432`.
- **Questions**:
  1. What happens if the host machine already has a local PostgreSQL service running?
  2. If the developer doesn't update `.env`, what happens when Next.js starts?
  3. Which specific files rely on `POSTGRES_PORT`?

---

### Exercise 8: Predict What Breaks: Deleting the Schema Sanitizer

- **Objective**: Predict what happens if you remove `sanitizeTool(tool)` from [src/lib/agent/mcp.ts](file:///c:/Projects/AgentSphere/src/lib/agent/mcp.ts).
- **Scenario**: A developer comments out line 123 in `src/lib/agent/mcp.ts`:
  ```typescript
  // const sanitizedTools = tools.map((tool) => sanitizeTool(tool));
  const sanitizedTools = tools;
  ```
- **Questions**:
  1. Will the application still run with Groq or OpenAI?
  2. What happens when the user switches to Google Gemini and asks a question that triggers an MCP tool?
  3. What HTTP status code and error message will be returned in the server terminal?

---

### Exercise 9: Trace Multimodal Image Conversion

- **Objective**: Trace how an uploaded image file becomes input tokens for an LLM.
- **Starting Point**: [src/lib/storage/content.ts](file:///c:/Projects/AgentSphere/src/lib/storage/content.ts)
- **Instructions**:
  1. Locate `processAttachmentsForAI()`.
  2. Find where the image is retrieved from object storage.
  3. How is the image formatted before being attached to the `HumanMessage`?
- **Hints**: Look for `getFileBuffer` and `data:${attachment.type};base64,...`.

---

### Exercise 10: Design a Safe Improvement: Adding Rate Limiting

- **Objective**: Propose an architectural design to prevent API abuse on `/api/agent/stream`.
- **Scenario**: You are asked in an interview: _"How would you prevent users from spamming our expensive LLM endpoint?"_
- **Requirements**:
  1. Which library or tool would you choose?
  2. Where would the rate limit check run (client, middleware, or route handler)?
  3. What HTTP status code should be returned when the limit is exceeded?

---

## Part 2: Detailed Solutions & Walkthroughs

### Solution 1: Available Models Discovery

- **API Endpoint**: `GET /api/agent/models`, fetched in [src/contexts/UISettingsContext.tsx:L124](file:///c:/Projects/AgentSphere/src/contexts/UISettingsContext.tsx#L124).
- **Route Handler**: [src/app/api/agent/models/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/models/route.ts).
- **Key Detection**: `isValidKey(process.env[config.envKey])` checks that keys are present, non-empty, and don't start with `"your_"`.
- **Gemini Fallbacks**: `["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]`.

---

### Solution 2: LLM Invocation Line

- **Method**: `callModel()` in [src/lib/agent/builder.ts:L123-L135](file:///c:/Projects/AgentSphere/src/lib/agent/builder.ts#L123-L135).
- **Tool Binding**: Line 132: `const modelInvoker = this.model.bindTools(this.tools);`
- **Execution**: Line 133: `const response = await modelInvoker.invoke(messages);`
- **Prepended Message**: `new SystemMessage(this.systemPrompt)` is prepended to `state.messages` to ensure consistent instructions.

---

### Solution 3: Human-in-the-Loop Interrupt

- **Method**: `approveToolCall()` in [src/lib/agent/builder.ts:L61-L121](file:///c:/Projects/AgentSphere/src/lib/agent/builder.ts#L61-L121).
- **Interrupt Primitive**: Line 74: `const humanReview = interrupt<...>(...)`.
- **Payload Emitted**: `{ question: "Is this correct?", toolCall: toolCall }`.
- **Bypass Flag**: `this.approveAllTools` (Line 62). If `true`, returns `new Command({ goto: "tools" })` immediately.

---

### Solution 4: Password Security

- **Salt Size**: 16 bytes: `crypto.randomBytes(16).toString("hex")` (Line 14).
- **Algorithm**: `crypto.scryptSync(password, salt, 64)` (64-byte derived key).
- **Comparison Function**: `crypto.timingSafeEqual(...)` (Line 23). Prevents timing attacks by executing in constant time regardless of where differences occur.

---

### Solution 5: Gemini Schema Sanitizer

- **Location**: [src/lib/agent/util.ts:L76-L112](file:///c:/Projects/AgentSphere/src/lib/agent/util.ts#L76-L112).
- **Keywords**: `$schema`, `examples`, `additionalProperties`, `anyOf`, `definitions`.
- **Union Types**: `normalizeType()` extracts the first non-null type string (e.g. `["string", "null"]` $\rightarrow$ `"string"`).
- **Empty Properties**: Lines 217-225 delete both `properties` and `required` from the schema object to prevent Gemini 400 errors.

---

### Solution 6: Thread Deletion & Orphaned Checkpoints

- **Location**: [src/app/api/agent/threads/route.ts:L115](file:///c:/Projects/AgentSphere/src/app/api/agent/threads/route.ts#L115).
- **Prisma Method**: `await prisma.thread.delete({ where: { id } });`
- **Orphaned State**: Lines 117-119 note: _"LangGraph checkpoint data will become orphaned... The checkpointer will simply not find any thread metadata for this thread_id."_ Checkpoint rows remain in the PostgreSQL `checkpoints` table unless explicitly purged via SQL.

---

### Solution 7: Database Port Conflict

1. If port `5432` is already in use by a local PostgreSQL service, Docker throws an address binding error (`bind: address already in use`).
2. If `POSTGRES_PORT` is changed but `.env` still has `5434`, Next.js throws `PrismaClientInitializationError: Can't reach database server at localhost:5434`.
3. Files affected: `compose.yaml` (container port mapping), `.env` (`DATABASE_URL` string), and `CLAUDE.md`.

---

### Solution 8: Schema Sanitizer Removal

1. The app will continue working with OpenAI and Groq because their function calling engines support standard JSON Schema draft-07.
2. When switching to Google Gemini with MCP tools, Gemini's API will reject the unsanitized schema with an HTTP 400 Bad Request.
3. Next.js terminal logs will display: `GoogleGenerativeAIError: [400 Bad Request] Invalid function declaration`.

---

### Solution 9: Multimodal Image Pipeline

- **Method**: `processAttachmentsForAI()` in [src/lib/storage/content.ts](file:///c:/Projects/AgentSphere/src/lib/storage/content.ts).
- **Buffer Retrieval**: `await getFileBuffer(attachment.key)` reads the image bytes from MinIO/S3.
- **Formatting**: Converts the buffer into a base64 Data URI:
  ```typescript
  {
    type: "image_url",
    image_url: { url: `data:${attachment.type};base64,${buffer.toString("base64")}` }
  }
  ```

---

### Solution 10: Rate Limiting Architecture Design

1. **Library**: Use `@upstash/ratelimit` paired with `@upstash/redis` (sliding window algorithm).
2. **Placement**: In Next.js middleware (`src/middleware.ts`) or inside [src/app/api/agent/stream/route.ts](file:///c:/Projects/AgentSphere/src/app/api/agent/stream/route.ts) before `streamResponse()` is called.
3. **Identifier**: Rate limit by authenticated `user.id`, falling back to `req.headers.get("x-forwarded-for")` for guest IPs (e.g., 10 requests per minute).
4. **HTTP Status**: Return `HTTP 429 Too Many Requests` with a `Retry-After` header.

You have completed the entire learning guide! Return to [00-START-HERE.md](file:///c:/Projects/AgentSphere/docs/agentsphere-study-guide/00-START-HERE.md) for master review.
