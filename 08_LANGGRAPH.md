# 08 — LangGraph State Machine & Workflow Orchestration

## 1. What is LangGraph?
LangGraph is a framework for building stateful, multi-actor applications with LLMs using **cyclic computational graphs**. 
Unlike basic sequential chains (which only run step A -> step B -> step C and exit), LangGraph allows agents to loop, make decisions, execute tools, evaluate tool results, and even pause for human approval.

---

## 2. Core LangGraph Primitives in AgentSphere

| Primitive | Definition | AgentSphere Code Location |
| :--- | :--- | :--- |
| **State (`MessagesAnnotation`)** | The shared data schema passed between nodes. | `src/lib/agent/builder.ts:138` |
| **Node (`addNode`)** | An asynchronous function that receives state and returns a state update. | `agent` (LLM call), `tools` (ToolNode), `tool_approval` (Human approval) |
| **Edge (`addEdge`)** | Direct connection routing flow from one node to the next. | `START -> agent`, `tools -> agent` |
| **Conditional Edge (`addConditionalEdges`)** | Dynamic branching function that chooses the next node based on current state. | `shouldApproveTool()` routes to `tool_approval` or `END` |
| **Interrupt (`interrupt()`)** | Suspends graph execution at a specific checkpoint waiting for external resume input. | `approveToolCall()` in `src/lib/agent/builder.ts:74` |
| **Checkpointer (`BaseCheckpointSaver`)** | Persists graph state to a storage backend. | `PostgresSaver` in `src/lib/agent/memory.ts` |

---

## 3. AgentSphere LangGraph Workflow Diagram

```
                 +-------------------+
                 |    START NODE     |
                 +---------+---------+
                           |
                           v
                 +-------------------+
                 |    agent Node     | <---------------------+
                 | (Invokes LLM with |                       |
                 |  bound MCP tools) |                       |
                 +---------+---------+                       |
                           |                                 |
                 +---------v---------+                       |
                 | shouldApproveTool |                       |
                 +---------+---------+                       |
                    /             \                          |
       Has Tool Calls?           No Tool Calls               |
                  /                 \                        |
                 v                   v                       |
      +--------------------+     +-------+                   |
      |   tool_approval    |     |  END  |                   |
      +---------+----------+     +-------+                   |
                |                                            |
       Human Review Decision                                 |
       (or approveAllTools)                                  |
         /              \                                    |
     Approved        Rejected / Feedback                     |
       /                  \                                  |
      v                    v                                 |
+-----------+    +-----------------------+                   |
|   tools   |    | Append ToolMessage    |                   |
| (Executes |    | with human feedback   | ------------------+
| MCP tool) |    +-----------------------+
+-----+-----+
      |
      +------------------------------------------------------+
```

---

## 4. Human-In-The-Loop Execution Code Trace (`src/lib/agent/builder.ts`)
1. **Tool Invocation Detected**: The LLM returns a message containing `tool_calls: [{ name: "search_database", args: { query: "..." } }]`.
2. **Conditional Edge**: `shouldApproveTool` inspects `lastMessage.tool_calls` and routes to `tool_approval`.
3. **Execution Paused**: `interrupt({ question: "Is this correct?", toolCall })` pauses graph execution, saves state in PostgreSQL, and yields control back to the client.
4. **Client Resume (`POST /api/agent/stream` with `opts.allowTool`)**:
   - `streamResponse` sends a `new Command({ resume: { action: "continue" } })`.
   - Graph resumes directly from the `tool_approval` checkpoint and proceeds to `tools` node.
