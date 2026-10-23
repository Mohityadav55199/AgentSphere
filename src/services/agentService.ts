import { ensureAgent } from "@/lib/agent";
import { ensureThread } from "@/lib/thread";
import type { MessageOptions, MessageResponse, ToolCall } from "@/types/message";
import prisma from "@/lib/database/prisma";
import { getHistory } from "@/lib/agent/memory";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  AIMessageChunk,
  ToolMessage,
} from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { processAttachmentsForAI } from "@/lib/storage/content";
import { CallbackHandler } from "@langfuse/langchain";

// Only instantiate when tracing is explicitly enabled to avoid silent errors
// when Langfuse credentials are absent.
const langfuseHandler = process.env.LANGFUSE_ENABLED === "true" ? new CallbackHandler() : null;

/**
 * Returns an async iterable producing incremental AI text chunks for a user text input.
 * Thread is ensured before streaming. The consumer (route) can package into SSE or any protocol.
 */
export async function streamResponse(params: {
  threadId: string;
  userText: string;
  opts?: MessageOptions;
}) {
  const { threadId, userText, opts } = params;
  await ensureThread(threadId, userText, opts?.userId);

  // If allowTool is present, use Command with resume action instead of regular inputs
  if (opts?.allowTool) {
    const inputs = new Command({
      resume: {
        action: opts.allowTool === "allow" ? "continue" : "update",
        data: {},
      },
    });

    const agent = await ensureAgent({
      model: opts?.model,
      provider: opts?.provider,
      tools: opts?.tools,
      approveAllTools: opts?.approveAllTools,
      temperature: opts?.temperature,
      systemPrompt: opts?.systemPrompt,
      agentMode: opts?.agentMode,
    });

    // Type assertion needed for Command union with state update in v1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iterable = await agent.stream(inputs as any, {
      streamMode: ["messages", "updates"],
      configurable: { thread_id: threadId },
      ...(langfuseHandler ? { callbacks: [langfuseHandler] } : {}),
    });

    return generator(iterable);
  }

  // Build multimodal message with attachments
  let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

  if (opts?.attachments && opts.attachments.length > 0) {
    // Process attachments and build content array
    const attachmentContents = await processAttachmentsForAI(opts.attachments);

    // Combine user text with attachment contents
    messageContent = [{ type: "text", text: userText }, ...attachmentContents];
  } else {
    // Simple text message
    messageContent = userText;
  }

  const inputs = {
    messages: [new HumanMessage({ content: messageContent })],
  };

  const agent = await ensureAgent({
    model: opts?.model,
    provider: opts?.provider,
    tools: opts?.tools,
    approveAllTools: opts?.approveAllTools,
    temperature: opts?.temperature,
    systemPrompt: opts?.systemPrompt,
    agentMode: opts?.agentMode,
  });

  // Type assertion needed for Command union with state update in v1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iterable = await agent.stream(inputs as any, {
    streamMode: ["messages", "updates"],
    configurable: { thread_id: threadId },
    ...(langfuseHandler ? { callbacks: [langfuseHandler] } : {}),
  });

  return generator(iterable);
}

// Helper generator function to process stream chunks
async function* generator(
  iterable: AsyncIterable<unknown>,
): AsyncGenerator<MessageResponse, void, unknown> {
  const streamedMessageIds = new Set<string>();

  for await (const chunk of iterable) {
    if (!chunk) continue;

    // Handle tuple format: [type, data]
    if (Array.isArray(chunk) && chunk.length === 2) {
      const [chunkType, chunkData] = chunk;

      // 1. Real-time token-by-token streaming from ChatModel via "messages" streamMode
      if (chunkType === "messages") {
        const [msgChunk, metadata] = Array.isArray(chunkData) ? chunkData : [chunkData, {}];
        if (!msgChunk) continue;

        const isAIMessage =
          msgChunk instanceof AIMessageChunk ||
          msgChunk instanceof AIMessage ||
          (typeof (msgChunk as { _getType?: () => string })?._getType === "function" &&
            (msgChunk as { _getType: () => string })._getType() === "ai") ||
          (msgChunk as Record<string, unknown>)?.type === "ai" ||
          (msgChunk as Record<string, unknown>)?.constructor?.name === "AIMessageChunk" ||
          (msgChunk as Record<string, unknown>)?.constructor?.name === "AIMessage";

        if (isAIMessage) {
          const rawChunk = msgChunk as Record<string, unknown>;
          let textChunk = "";
          if (typeof rawChunk.content === "string") {
            textChunk = rawChunk.content;
          } else if (Array.isArray(rawChunk.content)) {
            textChunk = rawChunk.content
              .filter(
                (c: unknown) =>
                  typeof c === "string" || (typeof c === "object" && c && "text" in c),
              )
              .map((c: string | { text?: string }) => (typeof c === "string" ? c : c?.text || ""))
              .join("");
          }

          const msgId =
            (rawChunk.id as string) || (metadata?.run_id as string) || "current-ai";
          const nodeName = (metadata?.langgraph_node as string) || "";

          streamedMessageIds.add(msgId);

          const toolCalls =
            Array.isArray(rawChunk.tool_calls) && rawChunk.tool_calls.length > 0
              ? (rawChunk.tool_calls as ToolCall[])
              : undefined;

          if (textChunk || toolCalls) {
            yield {
              type: "ai",
              data: {
                id: msgId,
                content: textChunk,
                tool_calls: toolCalls,
                additional_kwargs: {
                  ...((rawChunk.additional_kwargs as Record<string, unknown>) || {}),
                  ...(nodeName ? { agentNode: nodeName } : {}),
                },
              },
            };
          }
        }
      }

      // 2. Node state updates (tool execution outputs, and non-streamed node fallback)
      if (
        chunkType === "updates" &&
        chunkData &&
        typeof chunkData === "object" &&
        !Array.isArray(chunkData)
      ) {
        // Handle updates from any node in single or multi-agent graph
        for (const [nodeName, nodeOutput] of Object.entries(chunkData as Record<string, unknown>)) {
          if (
            nodeOutput &&
            typeof nodeOutput === "object" &&
            !Array.isArray(nodeOutput) &&
            "messages" in nodeOutput
          ) {
            const nodeData = nodeOutput as { messages: unknown };
            const messages = Array.isArray(nodeData.messages)
              ? nodeData.messages
              : [nodeData.messages];

            for (const message of messages) {
              if (!message) continue;

              const isToolMessage =
                message instanceof ToolMessage ||
                (typeof (message as { _getType?: () => string })?._getType === "function" &&
                  (message as { _getType: () => string })._getType() === "tool") ||
                (message as Record<string, unknown>)?.type === "tool" ||
                (message as Record<string, unknown>)?.constructor?.name === "ToolMessage";

              if (isToolMessage) {
                const msg = message as Record<string, unknown>;
                const content =
                  typeof msg.content === "string"
                    ? msg.content
                    : JSON.stringify(msg.content ?? "");
                yield {
                  type: "tool",
                  data: {
                    id: (msg.id as string) || `tool-${Date.now()}`,
                    content,
                    status: (msg.status as string) || "success",
                    tool_call_id: (msg.tool_call_id as string) || "",
                    name: (msg.name as string) || "",
                    additional_kwargs:
                      (msg.additional_kwargs as Record<string, unknown>) || undefined,
                    response_metadata:
                      (msg.response_metadata as Record<string, unknown>) || undefined,
                  },
                };
                continue;
              }

              const msgId = (message as Record<string, unknown>)?.id as string | undefined;
              // If tokens were already streamed for this message, only forward tool_calls if any:
              if (msgId && streamedMessageIds.has(msgId)) {
                const raw = message as Record<string, unknown>;
                if (Array.isArray(raw.tool_calls) && raw.tool_calls.length > 0) {
                  yield {
                    type: "ai",
                    data: {
                      id: msgId,
                      content: "",
                      tool_calls: raw.tool_calls as ToolCall[],
                      additional_kwargs: {
                        ...((raw.additional_kwargs as Record<string, unknown>) || {}),
                        agentNode: nodeName,
                      },
                    },
                  };
                }
                continue;
              }

              const isAIMessage =
                message instanceof AIMessage ||
                message instanceof AIMessageChunk ||
                (typeof (message as { _getType?: () => string })?._getType === "function" &&
                  (message as { _getType: () => string })._getType() === "ai") ||
                (message as Record<string, unknown>)?.type === "ai" ||
                (message as Record<string, unknown>)?.constructor?.name === "AIMessageChunk" ||
                (message as Record<string, unknown>)?.constructor?.name === "AIMessage";

              if (!isAIMessage) continue;

              const messageWithTools = message as Record<string, unknown>;
              if (!messageWithTools.additional_kwargs) {
                messageWithTools.additional_kwargs = {};
              }
              (messageWithTools.additional_kwargs as Record<string, unknown>).agentNode = nodeName;

              const processedMessage = processAIMessage(messageWithTools);
              if (processedMessage) {
                yield processedMessage;
              }
            }
          }
        }
      }
    }
  }
}

// Helper function to process any AI message and return the appropriate MessageResponse
function processAIMessage(message: Record<string, unknown>): MessageResponse | null {
  const toolCalls =
    Array.isArray(message.tool_calls) && message.tool_calls.length > 0
      ? (message.tool_calls as ToolCall[])
      : undefined;

  const hasFunctionCallInContent =
    Array.isArray(message.content) &&
    message.content.some(
      (item: unknown) => item && typeof item === "object" && "functionCall" in item,
    );

  const hasToolCall = Boolean(toolCalls && toolCalls.length > 0) || hasFunctionCallInContent;

  if (hasToolCall) {
    let textContent = "";
    if (typeof message.content === "string") {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      textContent = message.content
        .filter(
          (c: unknown) =>
            typeof c === "string" || (typeof c === "object" && c && "text" in c),
        )
        .map((c: string | { text?: string }) => (typeof c === "string" ? c : c?.text || ""))
        .join("");
    }

    return {
      type: "ai",
      data: {
        id: (message.id as string) || Date.now().toString(),
        content: textContent,
        tool_calls: toolCalls,
        additional_kwargs: (message.additional_kwargs as Record<string, unknown>) || undefined,
        response_metadata: (message.response_metadata as Record<string, unknown>) || undefined,
      },
    };
  } else {
    // Handle regular text content - extract text from various content types
    let text = "";
    if (typeof message.content === "string") {
      text = message.content;
    } else if (Array.isArray(message.content)) {
      text = message.content
        .map((c: string | { text?: string }) => (typeof c === "string" ? c : c?.text || ""))
        .join("");
    } else {
      text = String(message.content ?? "");
    }

    // Only return message if we have actual text content
    if (text.trim()) {
      return {
        type: "ai",
        data: {
          id: (message.id as string) || Date.now().toString(),
          content: text,
          additional_kwargs: (message.additional_kwargs as Record<string, unknown>) || undefined,
        },
      };
    }
  }
  return null;
}

/** Fetch prior messages for a thread from the LangGraph checkpoint/memory system. */
export async function fetchThreadHistory(threadId: string): Promise<MessageResponse[]> {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return [];
  try {
    const history = await getHistory(threadId);
    return history.map((msg: BaseMessage) => {
      if (typeof (msg as { toDict?: () => unknown }).toDict === "function") {
        return (msg as { toDict: () => unknown }).toDict() as MessageResponse;
      }
      const raw = msg as unknown as Record<string, unknown>;
      if (raw.type && raw.data) {
        return raw as unknown as MessageResponse;
      }
      const type =
        (typeof (msg as { _getType?: () => string })._getType === "function"
          ? (msg as { _getType: () => string })._getType()
          : (raw.type as string)) || "ai";
      return {
        type: type === "human" || type === "ai" || type === "tool" ? type : "ai",
        data: {
          id: (raw.id as string) || Date.now().toString(),
          content:
            typeof raw.content === "string" ? raw.content : JSON.stringify(raw.content || ""),
          tool_calls: raw.tool_calls,
          additional_kwargs: raw.additional_kwargs,
        },
      } as MessageResponse;
    });
  } catch (e) {
    console.error("fetchThreadHistory error", e);
    return [];
  }
}
