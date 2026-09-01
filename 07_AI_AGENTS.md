# 07 — AgentSphere AI Agent & Multi-Provider Architecture

## 1. AI Fundamentals from Zero

### What is an LLM?
A Large Language Model (e.g. LLaMA, GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) is a neural network trained on vast text datasets to predict the most probable next token (word fragment).

### What is an AI Agent?
A basic LLM is purely passive: you send text, it returns text.
An **AI Agent** wraps the LLM inside an autonomous execution loop with:
1. **Perception**: Receiving user instructions and file context.
2. **Reasoning & Planning**: Deciding which actions/tools to invoke.
3. **Action (Tool Calling)**: Calling external functions or APIs (e.g., searching a database, running code).
4. **Observation**: Receiving tool outputs and synthesizing a final response.
5. **Memory**: Storing past conversation turns to maintain context over long-term goals.

---

## 2. Multi-Provider Model Factory (`src/lib/agent/util.ts`)

AgentSphere provides a unified abstraction over four major LLM providers:

```
                  +------------------------------------------------+
                  |            createChatModel(config)             |
                  +-----------------------+------------------------+
                                          |
        +------------------+--------------+-------------+------------------+
        |                  |                            |                  |
        v                  v                            v                  v
+---------------+  +---------------+            +---------------+  +---------------+
|     GROQ      |  |    OPENAI     |            |   ANTHROPIC   |  | GOOGLE GEMINI |
|  (ChatGroq)   |  | (ChatOpenAI)  |            | (ChatAnthropic|  | (ChatGoogle   |
|               |  |               |            |               |  |  GenerativeAI)|
| Ultra-fast    |  | GPT-4o,       |            | Claude 3.5    |  | Gemini 1.5    |
| LPU Inference |  | GPT-4o-mini   |            | Sonnet        |  | Flash/Pro     |
+---------------+  +---------------+            +---------------+  +---------------+
```

### Dynamic Model Discovery (`src/app/api/agent/models/route.ts`)
Instead of hardcoding obsolete models, AgentSphere queries the provider APIs at runtime to list only available, accessible models for the configured API keys.
