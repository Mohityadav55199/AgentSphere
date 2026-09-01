# 09 — LangChain Core & Multi-Model Integration

## 1. What is LangChain Core?
LangChain provides the fundamental abstractions and standardized data structures for interacting with Large Language Models. 
Without LangChain, switching from OpenAI to Anthropic would require rewriting prompt formats, response parsers, tool calling schemas, and error handlers.

---

## 2. Core LangChain Primitives Used in AgentSphere

### 1. Message Types (`@langchain/core/messages`)
- `HumanMessage`: Represents user input (supports multimodal text + image URLs).
- `AIMessage`: Represents assistant output (can contain text content and `tool_calls` array).
- `ToolMessage`: Represents output returned by an executed tool (linked via `tool_call_id`).
- `SystemMessage`: Sets model instructions, persona, and behavioral constraints.

### 2. Chat Model Interfaces (`@langchain/core/language_models/chat_models`)
- `BaseChatModel`: Standard base class for LLMs (`invoke`, `stream`, `bindTools`).

### 3. Dynamic Tools (`@langchain/core/tools`)
- `DynamicTool`: Wraps JavaScript/TypeScript async functions into LLM-callable schemas with input validation via Zod schemas.

---

## 3. The Hierarchy: How Everything Fits Together

```
+========================================================================+
|                       APPLICATION LAYER (Next.js)                      |
|                  UI Components & Route Handlers                        |
+===================================+====================================+
                                    |
                                    v
+========================================================================+
|                   WORKFLOW LAYER (@langchain/langgraph)                |
|           Cyclic State Graphs, Checkpointers & Approval Edges          |
+===================================+====================================+
                                    |
                                    v
+========================================================================+
|                    FRAMEWORK LAYER (@langchain/core)                   |
|        Unified Chat Models, Standard Messages, Dynamic Tools           |
+===================================+====================================+
                                    |
                                    v
+========================================================================+
|                     PROVIDER LAYER (SDKs / APIs)                       |
|           Groq Cloud  |  OpenAI  |  Anthropic  |  Google Gemini        |
+========================================================================+
```
