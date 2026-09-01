# 15 — Error Handling & Resilience Architecture

## 1. Multi-Tier Error Propagation in AgentSphere

```
+========================================================================+
|                              FRONTEND TIER                             |
|  - Error Boundary catches React rendering crashes                     |
|  - useChat hook catches fetch / SSE network errors and displays       |
|    ErrorMessage.tsx toast                                              |
+===================================+====================================+
                                    | HTTP Status & JSON Errors
                                    v
+========================================================================+
|                             API ROUTE TIER                             |
|  - try...catch wraps every route handler                              |
|  - Zod validation errors return 400 Bad Request                        |
|  - Authentication failures return 401 Unauthorized                     |
|  - Resource not found returns 404 Not Found                            |
|  - Unexpected errors log to server and return 500 Internal Server Error|
+===================================+====================================+
                                    | Exceptions
                                    v
+========================================================================+
|                        AGENT & WORKFLOW TIER                           |
|  - Invalid LLM model names fallback to active default model            |
|  - Failed MCP tools return structured ToolMessage with error string to |
|    allow agent to self-correct rather than crashing execution graph    |
|  - Database checkpointer failure falls back to in-memory MemorySaver   |
+========================================================================+
```

---

## 2. Failure Scenarios & System Recovery

1. **Database Down**: `createCheckpointer()` catches connection errors and gracefully falls back to `MemorySaver()`, keeping chat running in ephemeral memory.
2. **LLM API Rate Limited or Invalid Key**: Route handler catches 429/401 from provider SDK and streams a clear error message to the UI instead of hanging.
3. **MCP Subprocess Crashes**: Tool execution wraps child process calls in timeouts; errors are returned as tool feedback to the LLM agent.
