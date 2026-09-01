# 20 — 50 Multi-Level AgentSphere Interview Questions & Answers

## Level 1: Basic Project Questions
1. **Q: What is AgentSphere in one sentence?**
   - **A**: AgentSphere is a full-stack autonomous AI agent platform with persistent PostgreSQL memory, multi-provider LLM support, Model Context Protocol (MCP) tool integration, and human-in-the-loop tool approvals.
2. **Q: Why did you build AgentSphere instead of using standard chat interfaces?**
   - **A**: Standard chat interfaces suffer from provider lock-in, lose conversational state across restarts, cannot interact with external tools safely, and lack human review safeguards before executing risky actions.

## Level 2: Technical & Architecture Questions
3. **Q: How does data move when a user sends a prompt?**
   - **A**: The React `useChat` hook optimistically updates the UI and initiates an HTTP GET to `/api/agent/stream`. The Next.js route handler passes the prompt to `agentService.ts`, which persists the thread in Prisma, compiles the LangGraph state machine with the active LLM and MCP tools, and streams response tokens back to the browser via Server-Sent Events.
4. **Q: How is conversation history persisted?**
   - **A**: We use `@langchain/langgraph-checkpoint-postgres`. Every state transition in the agent graph (including message arrays) is saved into the PostgreSQL `checkpoints` and `checkpoint_blobs` tables keyed by `thread_id`.

## Level 3: AI & LangGraph Questions
5. **Q: How does human-in-the-loop tool approval work in your LangGraph workflow?**
   - **A**: The `agent` node binds MCP tools to the LLM. If the model emits a `tool_call`, a conditional edge routes execution to `tool_approval`. This node executes `interrupt()`, suspending graph execution and saving state to PostgreSQL. When the user confirms in the UI, the client sends a `resume` command to resume the graph and execute the tool.

## Level 4: Security & Authentication
6. **Q: How does user authentication work in AgentSphere?**
   - **A**: We implemented custom scrypt password hashing with unique random salts and stateless HMAC-SHA256 JWT session tokens stored inside secure `HttpOnly`, `SameSite=Lax` cookies, protecting against XSS and timing attacks.

## Level 5: Debugging & Edge Cases
7. **Q: What happens if the database goes down while a user is chatting?**
   - **A**: Our `createCheckpointer()` utility catches connection failures and gracefully falls back to an in-memory `MemorySaver()`, allowing the active chat session to continue without crashing.
