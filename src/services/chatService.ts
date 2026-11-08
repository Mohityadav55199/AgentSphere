import type { MessageOptions, MessageResponse, Thread } from "@/types/message";
import { openPostEventStream, type MessageStream } from "./sseClient";
import { readSavedCouncilSettings } from "@/lib/agent/council";

export interface ChatServiceConfig {
  baseUrl?: string;
  endpoints?: {
    history?: string;
    chat?: string;
    stream?: string;
    threads?: string;
  };
  headers?: Record<string, string>;
}

const config: ChatServiceConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "/api/agent",
  endpoints: {
    history: "/history",
    chat: "/chat",
    stream: "/stream",
    threads: "/threads",
  },
};

function getUrl(endpoint: keyof Required<ChatServiceConfig>["endpoints"]): string {
  return `${config.baseUrl}${config.endpoints?.[endpoint] || ""}`;
}

export async function fetchMessageHistory(threadId: string): Promise<MessageResponse[]> {
  const response = await fetch(`${getUrl("history")}/${threadId}`, {
    headers: config.headers,
  });
  if (!response.ok) {
    throw new Error("Failed to load history");
  }
  const data = await response.json();
  return data as MessageResponse[];
}

/**
 * Open the SSE response stream for a message (or a tool-approval resume).
 * Sent as a POST with a JSON body so long and non-ASCII messages are not limited by URL length.
 */
export function createMessageStream(
  threadId: string,
  message: string,
  opts?: MessageOptions,
): MessageStream {
  return openPostEventStream(getUrl("stream"), {
    threadId,
    content: message,
    model: opts?.model,
    provider: opts?.provider,
    tools: opts?.tools?.length ? opts.tools : undefined,
    allowTool: opts?.allowTool,
    toolCallId: opts?.toolCallId,
    toolArgs: opts?.toolArgs,
    approveAllTools: opts?.approveAllTools,
    temperature: opts?.temperature,
    systemPrompt: opts?.systemPrompt,
    agentMode: opts?.agentMode,
    attachments: opts?.attachments?.length ? opts.attachments : undefined,
    // Agent Studio settings apply to the 5-agent council only.
    council: opts?.agentMode === "multi" ? (opts.council ?? readSavedCouncilSettings()) : undefined,
  });
}

export async function fetchThreads(): Promise<Thread[]> {
  const response = await fetch(getUrl("threads"), {
    headers: config.headers,
  });
  if (!response.ok) {
    throw new Error("Failed to load threads");
  }
  return await response.json();
}

export async function createNewThread(): Promise<Thread> {
  const response = await fetch(getUrl("threads"), {
    method: "POST",
    headers: config.headers,
  });
  if (!response.ok) {
    throw new Error("Failed to create thread");
  }
  return await response.json();
}

export async function deleteThread(threadId: string): Promise<void> {
  const response = await fetch(getUrl("threads"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({ id: threadId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete thread");
  }
}

export async function deleteEmptyThreads(): Promise<number> {
  const response = await fetch(`${getUrl("threads")}?empty=true`, {
    method: "DELETE",
    headers: config.headers,
  });
  if (!response.ok) {
    throw new Error("Failed to clear empty threads");
  }
  const data = await response.json();
  return data.count ?? 0;
}

export async function updateThread(params: {
  id: string;
  title?: string;
  isPinned?: boolean;
}): Promise<Thread> {
  const response = await fetch(getUrl("threads"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error("Failed to update thread");
  }
  return await response.json();
}
