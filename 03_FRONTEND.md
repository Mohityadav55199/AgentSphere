# 03 — AgentSphere Frontend Architecture & React Fundamentals

## 1. React Fundamentals From Absolute Zero

### What is React?
React is a JavaScript library for building user interfaces. Instead of manually updating the browser DOM using `document.getElementById()`, you write **declarative components** that automatically re-render whenever their underlying **state** changes.

### Core React Building Blocks

| Concept | Plain English Definition | AgentSphere Code Example |
| :--- | :--- | :--- |
| **Component** | A JavaScript function that returns HTML-like markup (JSX). | `MessageList.tsx`, `Header.tsx`, `Thread.tsx` |
| **Props** | Read-only input parameters passed from a parent component to a child component. | `<AIMessage message={msg} isStreaming={true} />` |
| **State (`useState`)** | Internal memory held by a component that triggers a UI re-render when modified. | `const [input, setInput] = useState("")` in `MessageInput.tsx` |
| **Side Effects (`useEffect`)** | Code that runs after rendering (e.g. data fetching, event listeners, timer setup). | Fetching thread messages when `threadId` changes in `useChat.ts` |
| **Context (`useContext`)** | Global state accessible by any component in the tree without passing props manually ("prop drilling"). | `UISettingsContext.tsx` providing active model, provider, and thread list. |

---

## 2. Key Frontend Components in AgentSphere

### 1. `Thread.tsx` (`src/components/Thread.tsx`)
- **Role**: The main chat container.
- **Renders**: Header, MessageList, MessageInput, and human-in-the-loop review modals.
- **Hook Used**: `useChat({ threadId })`

### 2. `MessageList.tsx` (`src/components/MessageList.tsx`)
- **Role**: Iterates over `messages: MessageResponse[]` array.
- **Renders**: `HumanMessage.tsx`, `AIMessage.tsx`, `ToolMessage.tsx`, `ToolCallDisplay.tsx`, and `ErrorMessage.tsx`.
- **Auto-scroll**: Uses React `useRef` pointing to the bottom dummy `<div>` to smoothly scroll down during SSE streaming.

### 3. `AIMessage.tsx` (`src/components/AIMessage.tsx`)
- **Role**: Renders AI markdown responses, code blocks with syntax highlighting, and LaTeX math formulas.
- **Libraries**: `react-markdown`, `remark-gfm`, `rehype-katex`.

### 4. `MessageInput.tsx` (`src/components/MessageInput.tsx`)
- **Role**: Multi-line auto-expanding textarea with file upload attachments, model selector popover, and send button.
- **Event Handling**: Listens for `Enter` key (without `Shift`) to submit messages.

### 5. `ModelConfiguration.tsx` (`src/components/ModelConfiguration.tsx`)
- **Role**: Settings dropdown to switch between providers (Groq, OpenAI, Anthropic, Gemini) and choose specific LLM models dynamically fetched from `/api/agent/models`.

### 6. `MCPServerList.tsx` & `MCPServerForm.tsx` (`src/components/MCPServer*.tsx`)
- **Role**: Interface to configure STDIO and HTTP MCP servers, view server health, and trigger OAuth authentication flows.

---

## 3. Frontend Data Flow & React Hooks in Action

```
[User enters text in MessageInput]
            ↓
  onChange -> setInput(e.target.value)
            ↓
[User presses Enter or clicks Send]
            ↓
  handleSubmit -> onSubmit(input, attachments)
            ↓
[useChat hook triggers sendMessage]
            ↓
  1. Optimistically appends HumanMessage to local React state (instant UI feedback)
  2. Sets isStreaming = true (shows pulsing typing indicator)
  3. Initiates fetch('/api/agent/stream?content=...&threadId=...')
  4. Reads SSE ReadableStream line-by-line via TextDecoder
  5. Dynamically appends incoming token chunks to AIMessage state
  6. On stream completion, marks isStreaming = false
```
