# ⚡ 16-QUICK-REVISION-AND-GLOSSARY.md — Pre-Interview Revision & 50-Term Glossary

---

## 📌 Document Metadata & Purpose

Keep this document open on the day of your interview. It contains quick-reference summaries, elevator pitches, critical diagrams, common interview pitfalls, and a 50-term technical glossary.

---

## 1. The Project Pitches

### The 1-Minute Elevator Pitch

> _"AgentSphere is a production-oriented, full-stack AI platform built with Next.js 16, React 19, LangGraph.js, and PostgreSQL. Unlike traditional chatbots that merely generate text, AgentSphere is an autonomous agentic system: it connects to external tool servers using the Model Context Protocol (MCP), halts execution for human approval before running dangerous tools, and persists conversation turns using PostgreSQL checkpointers. On the frontend, it features optimistic UI updates, Server-Sent Events streaming, multimodal file uploads, and browser-native voice dictation and speech synthesis."_

### The 2-Minute Deep Technical Pitch

> _"Under the hood, AgentSphere addresses the core weaknesses of LLM wrappers: hallucination, unverified tool execution, and session memory loss. We orchestrate execution using a LangGraph StateGraph that loops between an `agent` node and a `tools` node._
>
> _When the model invokes a tool, a conditional edge routes execution to a `tool_approval` node that triggers LangGraph's `interrupt()` primitive. This suspends execution on the server and writes the state to PostgreSQL's `checkpoints` table. The browser receives the tool details and renders an interactive approval card. When the user allows the call, the client resumes execution via a `Command({ resume: { action: 'continue' } })`, routing to the `tools` node and looping back to the model for response synthesis._
>
> _We support Groq, Gemini, OpenAI, and Anthropic, with custom schema sanitization to ensure Gemini compatibility. Our database layer uses Prisma for metadata and PostgresSaver for binary graph state, while custom scrypt and HMAC JWTs handle authentication without external dependencies."_

---

## 2. Whiteboard Architecture Diagram

```
[ User Browser (React 19) ]
         │ (HTTP GET with SSE: /api/agent/stream)
         ▼
[ Next.js 16 Route Handler ]
         │
         ▼
[ LangGraph.js StateGraph ] ──► [ PostgreSQL 17 (Checkpoints) ]
   ├── Node: agent (LLM + bindTools) ──► [ Groq / Gemini / Claude APIs ]
   ├── Edge: shouldApproveTool?
   ├── Node: tool_approval (interrupt)
   └── Node: tools (ToolNode) ──► [ External MCP Tool Servers ]
```

---

## 3. Top 10 Things to Avoid Saying in an Interview

| ❌ What NOT to Say                                        | ✅ What to Say Instead                                                                                                        | Why It Matters                                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| _"We have 5 autonomous agents debating in a swarm."_      | _"We use a LangGraph StateGraph with 5 specialized persona system prompts and dynamic tool binding."_                         | The code implements prompt switching, not a multi-agent debate swarm. Honesty wins interviews. |
| _"We store all chat messages in a Prisma Message table."_ | _"We use Prisma for Thread metadata, while LangGraph's `PostgresSaver` handles conversation message checkpoints."_            | Demonstrates real knowledge of LangGraph's persistence architecture.                           |
| _"Tool calling runs code directly inside the LLM."_       | _"The LLM generates structured JSON tool arguments; our server-side `ToolNode` executes the code."_                           | Models cannot run code; applications run code on behalf of the model.                          |
| _"We use WebSockets for chat streaming."_                 | _"We use Server-Sent Events (SSE) over HTTP because text generation is unidirectional."_                                      | Accurate protocol knowledge.                                                                   |
| _"Our app is 100% bug-free and fully tested."_            | _"The application works end-to-end, but a key improvement I want to build is an automated Vitest and Playwright test suite."_ | Shows senior engineering self-awareness.                                                       |

---

## 4. The 50-Term Technical Glossary

1. **LLM (Large Language Model)**: A neural network trained on vast text data to predict the next token. _(Analogy: An ultra-advanced autocomplete)._
2. **Token**: The basic chunk of text processed by an LLM (~4 characters). _(Analogy: The syllables of AI language)._
3. **Context Window**: Maximum tokens an LLM can process in one turn. _(Analogy: The size of a desk where reference books can sit)._
4. **Temperature**: Hyperparameter controlling randomness in model output. _(0.0 = deterministic math, 1.0 = creative fiction)._
5. **Prompt Engineering**: Designing system instructions to guide model outputs reliably.
6. **System Message**: Directive setting the AI's role and rules before user queries are evaluated.
7. **Human Message**: Input provided by the user.
8. **AI Message**: Text or tool calls returned by the model.
9. **Tool Message**: The output string returned by a completed tool execution.
10. **Tool Calling (Function Calling)**: Model's ability to output structured JSON matching a predefined schema to request an external action.
11. **Agent**: A system that pairs an LLM with tools and a cyclic control loop to achieve a goal.
12. **LangChain**: An abstraction library providing wrappers for models, tools, and message formats.
13. **LangGraph**: An orchestration engine for building cyclic, stateful multi-step AI workflows.
14. **StateGraph**: A graph in LangGraph where nodes receive and modify a shared state object.
15. **MessagesAnnotation**: A prebuilt LangGraph channel schema that reduces and appends conversation history.
16. **Node**: A discrete step or function in a graph (e.g. `agent`, `tools`).
17. **Edge**: A directed link between two nodes.
18. **Conditional Edge**: A dynamic branch that decides the next node based on state values.
19. **Interrupt**: A LangGraph primitive that pauses graph execution and waits for human input.
20. **Command**: A LangGraph object used to resume execution or change graph routing (`new Command({ goto: 'tools' })`).
21. **Checkpointer**: A persistence adapter that serializes graph states at every turn into a database.
22. **PostgresSaver**: LangGraph's official PostgreSQL persistence engine.
23. **MCP (Model Context Protocol)**: An open standard by Anthropic connecting AI models to external tools over `stdio` and `http`.
24. **stdio Transport**: Communicating with local processes via standard input and standard output.
25. **SSE (Server-Sent Events)**: One-way HTTP streaming from server to client over a persistent connection.
26. **WebSockets**: Full-duplex, two-way network protocol over a persistent TCP socket.
27. **Next.js App Router**: Folder-based fullstack React framework utilizing React Server Components.
28. **Route Handler**: Backend API endpoint in Next.js (`src/app/api/.../route.ts`).
29. **React 19**: Modern UI library with concurrent rendering, automatic batching, and async hooks.
30. **Optimistic UI**: Updating the screen instantly before server confirmation to eliminate perceived latency.
31. **TanStack React Query**: Asynchronous server-cache management library for React.
32. **Prisma ORM**: Type-safe database mapping library for TypeScript and Node.js.
33. **PostgreSQL**: Robust, open-source object-relational database management system.
34. **MinIO**: High-performance, S3-compatible object storage server running in Docker.
35. **AWS S3 SDK**: Amazon Web Services client used for uploading and retrieving object storage blobs.
36. **Multipart Upload**: Uploading large files in concurrent byte chunks to improve speed and reliability.
37. **Base64 Encoding**: Converting binary data (images, PDFs) into ASCII string formats for JSON transmission.
38. **Multimodal Model**: An AI model capable of processing multiple modalities (text and images) simultaneously.
39. **scrypt**: A memory-hard key derivation function designed to resist hardware brute-force attacks.
40. **Salt**: Random bytes added to a password before hashing to protect against rainbow table attacks.
41. **Timing Attack**: A side-channel attack where an adversary measures nanosecond execution times to deduce secrets.
42. **crypto.timingSafeEqual**: Constant-time buffer comparison function neutralizing timing attacks.
43. **JWT (JSON Web Token)**: An open standard (RFC 7519) compact token containing signed claims.
44. **httpOnly Cookie**: A cookie inaccessible to client-side JavaScript, protecting against XSS attacks.
45. **CSRF (Cross-Site Request Forgery)**: An attack tricking a browser into executing unauthorized actions on a trusted site.
46. **XSS (Cross-Site Scripting)**: An attack injecting malicious scripts into trusted web pages.
47. **OpenAPI / Swagger**: Standardized specification for describing RESTful APIs.
48. **OpenTelemetry (OTel)**: Vendor-neutral telemetry framework for distributed tracing and metrics.
49. **Langfuse**: Open-source observability platform for tracing LLM execution steps, tokens, and latencies.
50. **Web Speech API**: Browser-native API providing `SpeechRecognition` and `SpeechSynthesis`.

Proceed to [17-LEARNING-EXERCISES.md](file:///c:/Projects/AgentSphere/docs/agentsphere-study-guide/17-LEARNING-EXERCISES.md) for hands-on code exploration and feature extension challenges.
