# 01 — AgentSphere Project Overview

## 1. Executive Summary & Plain English Definition
**AgentSphere** is a modern, production-grade **Full-Stack Autonomous AI Agent Platform** that enables users to interact with customizable Large Language Models (LLMs) equipped with persistent long-term conversational memory, external tool capabilities via the Model Context Protocol (MCP), multi-modal file attachments, and human-in-the-loop tool approvals.

---

## 2. Real-World Analogy (Explain Like I'm 5)
Imagine you are the CEO of a company. 
- A standard chatbot (like basic ChatGPT) is like an intern who can only answer questions from their head and forgets everything when they leave the room.
- **AgentSphere** is an executive operations desk:
  - **The Assistant (AI Agent)**: Understands tasks, plans steps, and works on long-term projects.
  - **The Filing Cabinet (PostgreSQL Checkpointer & Prisma)**: Remembers every single past conversation and project state indefinitely.
  - **The Tool Belt (MCP Servers & Tools)**: Allows the assistant to leave the desk, browse the web, execute code, query databases, or call external APIs with your permission.
  - **The Supervisor Approval (Human-in-the-Loop)**: Before taking risky actions (like making an API purchase or deleting a file), the assistant pauses and asks you: *"Should I execute this tool with these parameters?"*

---

## 3. What Problem Does AgentSphere Solve?
1. **Model Lock-In**: Most AI apps force you into OpenAI or Anthropic. AgentSphere supports dynamic model discovery across Groq, OpenAI, Anthropic, and Google Gemini.
2. **Context Amnesia**: Standard LLM integrations lose state across server restarts. AgentSphere uses PostgreSQL graph checkpoints (`@langchain/langgraph-checkpoint-postgres`) to persist full execution states and conversational histories across sessions.
3. **Inability to Act on the Real World**: Isolated chatbots cannot take actions. AgentSphere integrates the **Model Context Protocol (MCP)**, allowing agents to securely connect to external tools (STDIO or HTTP SSE/JSON-RPC) and enterprise OAuth integrations.
4. **Lack of Control (Safety)**: Autonomous agents can make mistakes. AgentSphere implements LangGraph `interrupt()` checkpoints to pause graph execution and demand human review/confirmation before executing tools.

---

## 4. Who is the User & What Can They Do?
- **End Users & Developers**:
  - Sign up, log in, and manage user profile credentials securely with JWT session cookies.
  - Create, rename, pin, and delete conversation threads.
  - Choose any LLM provider (Groq, OpenAI, Anthropic, Gemini) and specific model dynamically.
  - Configure system prompts and model temperature (creativity vs determinism).
  - Attach images and text documents for multi-modal analysis.
  - Enable and connect MCP servers (e.g. GitHub, Slack, Postgres, Web Search).
  - Review and approve/reject agent tool execution in real-time.

---

## 5. Technology Stack Breakdown & Why Each Exists

| Technology | Role in AgentSphere | Why We Chose It |
| :--- | :--- | :--- |
| **Next.js 16 (App Router)** | Full-Stack React Framework | Unifies frontend UI and backend REST API routes in a single TypeScript project with server rendering and edge-ready streaming. |
| **React 19 & TypeScript** | Declarative UI & Type Safety | Provides reactive functional components, hooks (`useState`, `useEffect`, `useContext`), and static compile-time type safety preventing runtime null/undefined errors. |
| **LangGraph (`@langchain/langgraph`)** | Agentic Workflow Orchestration | Cyclic state graph engine that manages agent decision loops (`agent -> tool_approval -> tools -> agent`) and state persistence. |
| **LangChain Core (`@langchain/core`)** | Multi-Provider LLM Abstraction | Provides standardized interfaces (`BaseChatModel`, `HumanMessage`, `AIMessage`, `DynamicTool`) so we can switch between OpenAI, Anthropic, Google, and Groq without rewriting business logic. |
| **PostgreSQL (Neon Cloud DB)** | Relational & Graph State Storage | Reliable ACID-compliant database storing users, threads, MCP configs, and binary graph checkpoints. |
| **Prisma ORM** | Type-Safe Database Client | Generates TypeScript queries for CRUD operations on `User`, `Thread`, and `MCPServer` models, eliminating raw SQL vulnerabilities. |
| **Model Context Protocol (MCP)** | Extensible Tool Ecosystem | Open standard by Anthropic enabling standardized tool discovery and execution over STDIO and HTTP transports. |
| **Server-Sent Events (SSE)** | Real-Time Response Streaming | Lightweight HTTP streaming protocol that delivers tokens to the user's browser in real-time as the LLM generates them. |
| **Tailwind CSS & Framer Motion** | UI Styling & Micro-Animations | Utility-first CSS for sleek dark-mode glassmorphic aesthetics and smooth transition animations for tool calls and messages. |

---

## 6. High-Level Terminology Glossary
- **Server-Side Rendering (SSR)**: Generating HTML on the server before sending it to the browser for faster first load and SEO.
- **Middleware**: Code that runs before a request completes (e.g., verifying user session cookies).
- **ORM (Object-Relational Mapping)**: A tool (like Prisma) that lets you interact with database tables using JavaScript/TypeScript objects instead of writing raw SQL.
- **State**: The data held in memory at any given point in time (e.g., current message text, logged-in user, active thread ID).
- **Streaming**: Sending data from the server to the client piece-by-piece over an open HTTP connection instead of waiting for the entire response to finish.
