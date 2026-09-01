# 24 — Simulated 30-Minute Mock Interview Guide

## Mock Interview Simulation Structure

### Part 1: Elevator Pitch (Minutes 0–5)
- **Interviewer**: *"Tell me about yourself and your standout project, AgentSphere."*
- **Candidate Strategy**: Give the 60-second structured pitch (Problem -> Solution -> Architecture -> Impact). Emphasize full-stack ownership, Next.js 16, LangGraph, PostgreSQL checkpointer, and MCP.

---

### Part 2: Technical Deep Dive & Code Architecture (Minutes 5–15)
- **Interviewer**: *"Walk me through what happens under the hood when a user clicks 'Send' on a prompt that requires searching a database."*
- **Candidate Strategy**: Trace the full request lifecycle:
  1. Frontend React optimistic state update in `useChat.ts`.
  2. SSE stream initiation to `/api/agent/stream`.
  3. `agentService.ts` fetching/creating thread in Prisma and compiling LangGraph.
  4. LLM emitting `tool_call`.
  5. Conditional edge routing to `tool_approval` node.
  6. Human-in-the-loop `interrupt()` checkpointing to PostgreSQL.
  7. Client sending approval token and tool execution via MCP client.
  8. Streaming final response tokens back via Server-Sent Events.

---

### Part 3: Data Persistence & Security (Minutes 15–22)
- **Interviewer**: *"How do you handle authentication and database persistence without risking security breaches?"*
- **Candidate Strategy**: Detail scrypt password hashing, timing-safe buffer comparisons (`crypto.timingSafeEqual`), HttpOnly JWT session cookies, and Prisma parameterized queries.

---

### Part 4: Edge Cases, Failure Recovery & Tradeoffs (Minutes 22–28)
- **Interviewer**: *"What happens if the PostgreSQL database connection drops while the agent is running?"*
- **Candidate Strategy**: Explain how `createCheckpointer()` gracefully falls back to `MemorySaver()`, keeping the chat alive in ephemeral memory while logging diagnostic warnings.

---

### Part 5: Candidate Questions for Interviewer (Minutes 28–30)
- *"How does the engineering team at SocialAngel approach testing and CI/CD for full-stack features?"*
- *"What are the biggest scalability challenges the team is currently tackling?"*
