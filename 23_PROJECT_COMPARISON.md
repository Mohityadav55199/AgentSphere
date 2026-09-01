# 23 — Portfolio Project Comparison & Interview Strategy

## 1. Project Comparison Matrix

| Feature | EventSphere | ShopVerse | AgentSphere |
| :--- | :--- | :--- | :--- |
| **Domain** | Event Management & Booking Platform | E-Commerce Marketplace | Autonomous AI Agent Platform |
| **Primary Stack** | React, Node.js, Express, MongoDB | Next.js, React, Node.js, PostgreSQL | Next.js 16, React 19, TypeScript, PostgreSQL |
| **Database & ORM** | MongoDB + Mongoose | PostgreSQL + Prisma | Neon PostgreSQL + Prisma + LangGraph Checkpointer |
| **Authentication** | JWT + Cookie Session | OAuth + NextAuth | Custom scrypt + Stateless JWT (HttpOnly Cookie) |
| **Real-time Feature** | WebSockets (Socket.io for seat updates) | Stripe Webhook Notifications | Server-Sent Events (SSE Token Streaming) |
| **Standout Complexity** | Concurrency control & ticket locking | Payment gateway integration & cart checkout | LangGraph cyclic state machine, MCP & Human-in-the-loop |

---

## 2. Which Project Should You Lead With in the Interview?
- **Lead Project**: **AgentSphere**. It demonstrates modern, high-value engineering: AI agent orchestration, state machines, micro-services via MCP, real-time SSE streaming, and advanced TypeScript architecture.
- **Backend Demonstration**: **AgentSphere** (LangGraph state engine, scrypt security, Prisma relations) or **EventSphere** (MongoDB aggregations, Express routes).
- **Frontend Demonstration**: **AgentSphere** (React 19 hooks, optimistic updates, auto-expanding inputs, markdown/LaTeX rendering).
- **System Design Demonstration**: **AgentSphere** (Cyclic state graphs, checkpoint recovery, multi-transport MCP tool architecture).
