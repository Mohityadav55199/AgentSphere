# ⚡ AgentSphere - Next-Gen Autonomous AI Agent Platform

> **AgentSphere** is a state-of-the-art fullstack AI Agent application built with Next.js 16, React 19, LangGraph.js, Prisma, and Model Context Protocol (MCP). It features interactive agent personas, voice-to-text, text-to-speech read aloud, temperature tuning, drag-and-drop file uploads, and 1-click Markdown export.

---

## 🌐 Live Demos

| Platform | Status | Live Link |
| --- | --- | --- |
| **Vercel** | 🟢 Live | [https://agent-sphere-self.vercel.app](https://agent-sphere-self.vercel.app/) |
| **Render** | 🟢 Live | [https://agentsphere.onrender.com](https://agentsphere.onrender.com/) |

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
- Fine-tune model creativity from `0.0` (*Precise & Deterministic*) to `1.0` (*Creative & Diverse*).

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

### 🛠️ Model Context Protocol (MCP) & Tool Approval
- Connect custom MCP servers via Web UI (stdio and HTTP transports).
- Human-in-the-loop tool execution approval with interactive allow/deny controls.

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

## 📜 License

Distributed under the IIIT License. See `LICENSE` for details.
