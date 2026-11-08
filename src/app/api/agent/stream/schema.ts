import { z } from "@/lib/api/openapi/zod";
import { registry } from "@/lib/api/openapi/registry";
import { MAX_MESSAGE_LENGTH, MAX_SYSTEM_PROMPT_LENGTH } from "@/lib/limits";

const StreamQuery = z.object({
  content: z.string().openapi({ description: "User message text", example: "Hello" }),
  threadId: z.string().optional().openapi({ description: "Thread identifier" }),
  model: z.string().optional().openapi({ description: "LLM model name" }),
  provider: z
    .string()
    .optional()
    .openapi({ description: "Model provider (openai/google/anthropic)" }),
  allowTool: z
    .enum(["allow", "deny"])
    .optional()
    .openapi({ description: "Tool approval decision" }),
  tools: z
    .string()
    .optional()
    .openapi({ description: "Comma-separated list of enabled tool names" }),
  approveAllTools: z
    .enum(["true", "false"])
    .optional()
    .openapi({ description: "Skip per-tool approval prompts" }),
  attachments: z
    .string()
    .optional()
    .openapi({ description: "JSON-encoded array of FileAttachment objects" }),
});

registry.registerPath({
  method: "get",
  path: "/api/agent/stream",
  operationId: "streamAgentResponse",
  summary: "Stream an agent response (SSE)",
  description:
    "Server-Sent Events stream of incremental AI/tool message chunks from the LangGraph agent.\n\n" +
    "Event format:\n" +
    "- `data: <MessageResponse JSON>` — incremental ai/tool chunks\n" +
    "- `event: done` / `data: {}` — completion\n" +
    "- `event: error` / `data: { message, threadId }` — stream error",
  tags: ["Agent"],
  request: { query: StreamQuery },
  responses: {
    200: {
      description: "SSE stream of message chunks",
      content: {
        "text/event-stream": {
          schema: z.string().openapi({ description: "Server-Sent Events stream" }),
        },
      },
    },
  },
});

// Preferred: message in a JSON body (no URL length limit, safe for long/non-ASCII text).
export const StreamBody = z
  .object({
    threadId: z.string().min(1).max(100).openapi({ description: "Thread identifier" }),
    content: z
      .string()
      .max(MAX_MESSAGE_LENGTH)
      .optional()
      .openapi({ description: "User message text (omit when resuming a tool approval)" }),
    model: z.string().max(200).optional(),
    provider: z.string().max(50).optional(),
    allowTool: z
      .enum(["allow", "deny"])
      .optional()
      .openapi({ description: "Tool approval decision" }),
    toolCallId: z.string().max(200).optional().openapi({ description: "Tool call being edited" }),
    toolArgs: z
      .record(z.string(), z.unknown())
      .optional()
      .openapi({ description: "Replacement arguments for toolCallId (approve with edits)" }),
    tools: z.array(z.string().max(200)).max(100).optional(),
    approveAllTools: z.boolean().optional(),
    attachments: z.array(z.unknown()).max(10).optional().openapi({
      description: "FileAttachment objects returned by /api/agent/upload",
    }),
    temperature: z.number().optional(),
    systemPrompt: z.string().max(MAX_SYSTEM_PROMPT_LENGTH).optional(),
    agentMode: z.enum(["single", "multi"]).optional(),
    council: z
      .array(z.unknown())
      .max(10)
      .optional()
      .openapi({ description: "Agent Studio settings per council role (multi-agent mode)" }),
  })
  .openapi("StreamRequest");

registry.registerPath({
  method: "post",
  path: "/api/agent/stream",
  operationId: "streamAgentResponsePost",
  summary: "Stream an agent response (SSE, JSON body)",
  description:
    "Same SSE stream as the GET form, but the request is a JSON body. Requires " +
    "`Content-Type: application/json`. Use this for anything beyond short messages.",
  tags: ["Agent"],
  request: { body: { content: { "application/json": { schema: StreamBody } } } },
  responses: {
    200: {
      description: "SSE stream of message chunks",
      content: {
        "text/event-stream": {
          schema: z.string().openapi({ description: "Server-Sent Events stream" }),
        },
      },
    },
  },
});
