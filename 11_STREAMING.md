# 11 — Server-Sent Events (SSE) & Streaming Architecture

## 1. Why Streaming is Essential for AI Applications
Large Language Models generate text one token at a time. A 500-word response can take 4–10 seconds to generate completely.
- **Traditional Request-Response**: User stares at a blank screen / loading spinner for 10 seconds, leading to perceived sluggishness and high bounce rates.
- **Streaming (SSE)**: The first word appears in under 200 milliseconds (Time-To-First-Token / TTFT). The user starts reading immediately while subsequent tokens flow in real-time.

---

## 2. Server-Sent Events (SSE) Protocol

SSE is a standardized, unidirectional HTTP streaming protocol (`Content-Type: text/event-stream`):
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"content": "Hello", "type": "ai"}

data: {"content": " world", "type": "ai"}

data: [DONE]
```

---

## 3. End-to-End Streaming Lifecycle in AgentSphere

```
1. Client (useChat.ts) initiates fetch:
   fetch('/api/agent/stream?content=Hello&threadId=123&provider=groq&model=llama-3.3-70b-versatile')

2. Server (src/app/api/agent/stream/route.ts):
   Creates a new ReadableStream with an underlying AsyncGenerator:
   const stream = new ReadableStream({
     async start(controller) {
       for await (const chunk of generator) {
         controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
       }
       controller.close();
     }
   });
   return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });

3. Backend Orchestration (src/services/agentService.ts):
   Calls agent.stream(inputs, { streamMode: ['updates'] })
   As the LLM emits tokens or tool calls, the generator yields MessageResponse objects.

4. Client Receiver (src/hooks/useChat.ts):
   const response = await fetch(...);
   const reader = response.body.getReader();
   const decoder = new TextDecoder();
   while (true) {
     const { done, value } = await reader.read();
     if (done) break;
     const chunkText = decoder.decode(value);
     // Parses 'data: {...}' lines and updates React message state incrementally
   }
```
