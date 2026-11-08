import type { CouncilAgentSettings } from "@/lib/agent/council";
export interface Thread {
  id: string;
  title?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileAttachment {
  url: string;
  key: string;
  name: string;
  type: string;
  size: number;
}

export interface MessageOptions {
  model?: string;
  provider?: string;
  tools?: string[];
  allowTool?: "allow" | "deny";
  /** Tool call whose arguments were edited in the approval card. */
  toolCallId?: string;
  /** Replacement arguments for `toolCallId` (approve-with-edits). */
  toolArgs?: Record<string, unknown>;
  approveAllTools?: boolean; // if true, skip tool approval prompts
  attachments?: FileAttachment[];
  temperature?: number;
  systemPrompt?: string;
  userId?: string;
  guestId?: string;
  agentMode?: "single" | "multi";
  /** Agent Studio settings, sent in multi-agent mode. */
  council?: CouncilAgentSettings[];
}

export interface MessageRequest {
  threadId: string;
  type: "human";
  content: string;
  model?: string;
  tools?: string[];
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
  type: "tool_call";
}

export interface ToolCallChunk {
  name: string;
  args: string;
  index: number;
  type: "tool_call_chunk";
  id: string;
}

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ContentItem {
  text?: string;
  functionCall?: FunctionCall;
  thoughtSignature?: string;
}

export interface AIMessageData {
  id: string;
  content: string | ContentItem[];
  tool_calls?: ToolCall[];
  tool_call_chunks?: ToolCallChunk[];
  additional_kwargs?: Record<string, unknown>;
  invalid_tool_calls?: unknown[];
  response_metadata?: Record<string, unknown>;
}

export interface ToolMessageData {
  id: string;
  content: string;
  status: string;
  artifact?: unknown[];
  tool_call_id: string;
  name: string;
  metadata?: Record<string, unknown>;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
}

export interface BasicMessageData {
  id: string;
  content: string;
  attachments?: FileAttachment[];
}

export interface ToolApprovalCallbacks {
  /** `editedArgs` is set when the user edited the tool inputs before approving. */
  onApprove: (toolCallId: string, editedArgs?: Record<string, unknown>) => void;
  onDeny: (toolCallId: string) => void;
}

export interface MessageResponse {
  type: "human" | "ai" | "tool" | "error";

  data: BasicMessageData | AIMessageData | ToolMessageData;
}

export interface MultimodalMessageContent {
  type: string;
  text?: string;
  image_url?: { url: string };
}

// Content item types for checkpoint-loaded messages
export interface ImageUrlContentItem {
  type: "image_url";
  image_url?: { url: string };
  file_metadata?: FileAttachment;
  id?: string;
  name?: string;
}

export interface TextContentItem {
  type: "text";
  text: string;
  file_metadata?: FileAttachment;
}
