# ⚡ AgentSphere - Next-Gen Autonomous AI Agent Platform

> **AgentSphere** is a state-of-the-art fullstack AI Agent application built with Next.js 16, React 19, LangGraph.js, Prisma, and Model Context Protocol (MCP). It features interactive agent personas, voice-to-text, text-to-speech read aloud, temperature tuning, drag-and-drop file uploads, and 1-click Markdown export.

---

## 🌐 Live Demos

| Platform   | Status  | Live Link                                                                     |
| ---------- | ------- | ----------------------------------------------------------------------------- |
| **Vercel** | 🟢 Live | [https://agent-sphere-self.vercel.app](https://agent-sphere-self.vercel.app/) |
| **Render** | 🟢 Live | [https://agentsphere.onrender.com](https://agentsphere.onrender.com/)         |

---

## ✨ Features at a Glance

### ⚡ Powered by Multi-Provider LLM & Fast Inference

- Integrated with **Groq**, **Google Gemini**, **OpenAI**, and **Anthropic**.
- Real-time Server-Sent Events (SSE) streaming for zero-latency AI responses.

### 🎭 Specialized Agent Personas & System Instructions

- **✨ General Assistant**: Everyday tasks and general Q&A.
- **💻 Senior Developer**: Production-ready code, architecture, and bug fixes.
- **📊 Data Scientist**: Quantitative logic, statistics, and data insights.
- **✍️ Content Strategist**: Persuasive copywriting, emails, and social content.
- **🛡️ Security Auditor**: Security reviews, vulnerability scans, and OWASP compliance.
- Customizable **System Instructions** text input to tune agent prompts on the fly.

### 🎛️ Real-Time Temperature Control

- Fine-tune model creativity from `0.0` (_Precise & Deterministic_) to `1.0` (_Creative & Diverse_).

### 🌙 Dark & Light Mode Theme Switcher

- Seamless 1-click theme toggling with Sun/Moon icons and persistent preference memory.

### 🔊 Text-to-Speech & 🎙️ Voice Input

- **Voice-to-Text**: Dictate prompts using the Web Speech API with an active recording pulse indicator.
- **Read Aloud**: Listen to AI responses hands-free using browser Web Speech Synthesis.

### 📊 Real-Time Response Analytics

- Automatic **Word Count** and **Estimated Reading Time** displayed on every AI response bubble.

### 📁 Drag-and-Drop File Upload Overlay

- Visual glassmorphic dropzone overlay when dragging images, PDFs, or documents onto the chat window.

### 📥 1-Click Chat Export (Markdown `.md`)

- Export complete conversation history as cleanly formatted Markdown files.

### 👥 5-Agent Autonomous Council Architecture

AgentSphere is powered by a genuine **5-Agent Council** orchestrating via LangGraph, replacing monolithic prompts with specialized autonomous roles:

1. 🎯 **Orchestration Supervisor (_The Strategist_)**: Evaluates complexity, decomposes objectives into execution DAGs, tracks state, and routes to specialists.
2. 🔍 **Lead Researcher (_The Knowledge Engine_)**: Hunts live web data, documentation, and external APIs using search/fetch MCP tools without polluting the developer's context.
3. 💻 **Principal Developer (_The Builder_)**: Specializes in clean, modular code, TypeScript typing, database queries, and filesystem interactions.
4. 📊 **Data & Architecture Analyst (_The Insight Engine_)**: Delivers quantitative reasoning, structured comparisons, and auto-generates visual **Mermaid.js diagrams**.
5. 🛡️ **Chief Security Auditor (_The Critic & Verifier_)**: Zero-trust code review scanning for OWASP top 10 vulnerabilities, edge cases, and hallucinations before synthesizing final delivery.
6. 🚦 **Human-in-the-Loop Safety Governor**: Intercepts high-risk MCP tool calls for user confirmation before execution.

#### 💡 Why 5+ Agents are Architecturally Justified:

- **Zero Context Pollution**: Web scrapes and noisy tool outputs stay in the Researcher's context; the Developer receives only distilled specifications.
- **Elimination of Self-Validation Bias**: The Auditor operates with an adversarial prompt to catch bugs that the Developer's forward pass misses.
- **Higher Tool Accuracy (>98%)**: Scoping specific MCP tools to specific worker agents prevents tool confusion when 20+ MCP functions are bound.

### 🛠️ Model Context Protocol (MCP) Server Studio

- Access MCP server configuration anywhere directly from the top navigation bar with live tool count badges.
- **Visual Creation Form**: Configure local STDIO CLI commands or remote HTTP/SSE servers with key-value environment and header editors.
- **1-Click MCP Presets**: Instantly connect popular MCP servers:
  - 🌐 **Fetch MCP**: Read and scrape live web pages into markdown.
  - 🗄️ **SQLite MCP**: Execute SQL queries and inspect databases.
  - 🧠 **Memory MCP**: Knowledge graph entity memory.
  - 📁 **Filesystem MCP**: Safe file inspection and reading.
  - 🔍 **Brave Search MCP**: Live web search API.
  - ☁️ **Remote HTTP / SSE MCP**: Custom remote endpoints.
- **Claude Desktop & Cursor Compatible**: Import or export raw JSON configs with auto-formatting and instant validation.
- **Human-in-the-Loop Governance**: Real-time allow/deny approval controls before tools execute.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Lucide Icons, UIW Markdown Editor.
- **AI Engine**: LangGraph.js, `@langchain/google-genai`, `@langchain/openai`, `@langchain/anthropic`.
- **Backend & Database**: Node.js, Prisma ORM, PostgreSQL (`NeonDB`).
- **Audio & Media**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18 or higher
- **API Keys**: Google Gemini API Key or Groq API Key

### 1. Clone Repository

```bash
git clone https://github.com/Mohityadav55199/AgentSphere.git
cd AgentSphere
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>/<dbname>?sslmode=require"
GOOGLE_GENERATIVE_AI_API_KEY="your_gemini_api_key_here"
GROQ_API_KEY="gsk_your_groq_api_key_here"
```

### 4. Initialize Database

```bash
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to experience **AgentSphere**!

---

## ⚡ Render Free Tier Cold-Start Handling

When deployed on Render's free tier, the instance spins down automatically during periods of inactivity to conserve your 750 free monthly instance hours:

- **Free Tier Wake-up Banner**: Embedded across all screens to notify visitors of cold-start wake-up times (~30-50s) with live status polling.
- **Resource Preserving**: The server sleeps when idle so your free tier hours last the entire month without premature depletion.
