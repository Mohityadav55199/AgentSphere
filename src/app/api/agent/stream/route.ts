import { NextRequest } from "next/server";
import { streamResponse } from "@/services/agentService";
import type { MessageResponse, FileAttachment } from "@/types/message";
import { getCurrentUser } from "@/lib/auth";
import { checkThreadAccess } from "@/lib/thread";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sanitizeAttachments } from "@/lib/storage/attachments";
import { getGuestId, getOrCreateGuestId } from "@/lib/guest";
import { MAX_MESSAGE_LENGTH, MAX_SYSTEM_PROMPT_LENGTH } from "@/lib/limits";
import { StreamBody } from "./schema";
import { normalizeCouncilSettings, type CouncilAgentSettings } from "@/lib/agent/council";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Clients cannot read a non-200 body as SSE, so request errors are delivered as an SSE error event. */
function sseError(message: string, threadId?: string) {
  const body = `event: error\ndata: ${JSON.stringify({ message, threadId })}\n\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** Normalised request, whether it came from the POST body or legacy GET query params. */
interface StreamInput {
  content: string;
  threadId: string;
  model?: string;
  provider?: string;
  allowTool?: "allow" | "deny";
  tools?: string[];
  approveAllTools: boolean;
  attachments?: FileAttachment[];
  temperature?: number;
  systemPrompt?: string;
  agentMode: "single" | "multi";
  toolCallId?: string;
  toolArgs?: Record<string, unknown>;
  council?: CouncilAgentSettings[];
}

function clampTemperature(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 2) : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * POST /api/agent/stream — preferred. The message travels in a JSON body, so long or non-ASCII
 * messages work (a GET URL is capped at ~16KB by Node's header limit, and URL-encoding a Hindi or
 * Chinese character costs 9 bytes, so even 2,000 characters could fail).
 */
export async function POST(req: NextRequest) {
  // Requiring JSON makes cross-site form posts impossible (they cannot set this content type
  // without a CORS preflight, which this route does not allow).
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return sseError("Content-Type must be application/json");
  }
  const parsed = StreamBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return sseError(
      issue
        ? `Invalid request: ${issue.path.join(".") || "body"} ${issue.message}`
        : "Invalid request",
    );
  }
  const b = parsed.data;
  return runStream(req, {
    content: b.content ?? "",
    threadId: b.threadId,
    model: b.model || undefined,
    provider: b.provider || undefined,
    allowTool: b.allowTool,
    tools: b.tools?.map((t) => t.trim()).filter(Boolean),
    approveAllTools: b.approveAllTools ?? false,
    attachments: sanitizeAttachments(b.attachments),
    temperature: clampTemperature(b.temperature),
    systemPrompt: b.systemPrompt || undefined,
    agentMode: b.agentMode === "multi" ? "multi" : "single",
    toolCallId: b.toolCallId,
    toolArgs: b.allowTool === "allow" && b.toolCallId ? b.toolArgs : undefined,
    council: b.agentMode === "multi" ? normalizeCouncilSettings(b.council) : undefined,
  });
}

/** GET /api/agent/stream — legacy query-string form, kept for API compatibility. */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams;

  let attachments: FileAttachment[] | undefined;
  const attachmentsParam = q.get("attachments");
  if (attachmentsParam) {
    try {
      attachments = sanitizeAttachments(JSON.parse(attachmentsParam));
    } catch {
      return sseError("attachments must be a JSON array");
    }
  }

  const allowToolParam = q.get("allowTool");
  const allowTool =
    allowToolParam === "allow" || allowToolParam === "deny" ? allowToolParam : undefined;
  const toolCallId = q.get("toolCallId") || undefined;
  let toolArgs: Record<string, unknown> | undefined;
  const toolArgsParam = q.get("toolArgs");
  if (toolArgsParam && toolCallId && allowTool === "allow") {
    try {
      const parsed = JSON.parse(toolArgsParam);
      if (isPlainObject(parsed)) toolArgs = parsed;
    } catch {
      return sseError("Edited tool arguments are not valid JSON");
    }
  }

  return runStream(req, {
    content: q.get("content") || "",
    threadId: q.get("threadId") || "",
    model: q.get("model") || undefined,
    provider: q.get("provider") || undefined,
    allowTool,
    tools: q
      .get("tools")
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    approveAllTools: q.get("approveAllTools") === "true",
    attachments,
    temperature: clampTemperature(q.get("temperature")),
    systemPrompt: q.get("systemPrompt") || undefined,
    agentMode: q.get("agentMode") === "multi" ? "multi" : "single",
    toolCallId,
    toolArgs,
  });
}

async function runStream(req: NextRequest, input: StreamInput): Promise<Response> {
  const { threadId, content } = input;

  // Every request spends LLM API credits, so cap how fast one client can fire them.
  const limit = rateLimit(`stream:ip:${getClientIp(req)}`, 30, 60 * 1000);
  if (!limit.ok) {
    return sseError(`Too many requests. Please wait ${limit.retryAfter}s and try again.`);
  }

  // Without a thread id, every such request would share one checkpoint ("unknown").
  if (!threadId) return sseError("threadId is required");
  if (!input.allowTool && !content.trim() && !input.attachments?.length) {
    return sseError("Message content is required", threadId);
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return sseError(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`, threadId);
  }
  if (input.systemPrompt && input.systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    return sseError(
      `System prompt is too long (max ${MAX_SYSTEM_PROMPT_LENGTH} characters)`,
      threadId,
    );
  }

  const user = await getCurrentUser();

  // Block continuing (or tool-approving) a thread that belongs to another user.
  // Mint the guest cookie now: it cannot be set once the stream has started.
  const guestId = user ? await getGuestId() : await getOrCreateGuestId();
  const access = await checkThreadAccess(threadId, user?.id, guestId);
  if (access.status === "forbidden") {
    return sseError("You do not have access to this thread", threadId);
  }

  const abortController = new AbortController();

  // If incoming request is aborted, cancel agent execution
  req.signal?.addEventListener("abort", () => {
    abortController.abort();
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: MessageResponse) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial comment to establish stream
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Run the agent streaming in the background
      (async () => {
        try {
          const iterable = await streamResponse({
            threadId,
            userText: content,
            opts: {
              model: input.model,
              provider: input.provider,
              tools: input.tools,
              allowTool: input.allowTool,
              toolCallId: input.toolCallId,
              toolArgs: input.toolArgs,
              approveAllTools: input.approveAllTools,
              attachments: input.attachments,
              temperature: input.temperature,
              systemPrompt: input.systemPrompt,
              agentMode: input.agentMode,
              council: input.council,
              userId: user?.id,
              guestId,
            },
          });
          for await (const chunk of iterable) {
            if (abortController.signal.aborted) {
              break;
            }
            // Only forward AI/tool chunks; ignore human/system
            if (chunk.type === "ai" || chunk.type === "tool") {
              send(chunk);
            }
          }

          if (!abortController.signal.aborted) {
            // Signal completion
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
          }
        } catch (err: unknown) {
          if (!abortController.signal.aborted) {
            const message = (err as Error)?.message || "Stream error";
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ message, threadId })}\n\n`),
            );
          }
        } finally {
          try {
            controller.close();
          } catch {
            // Controller was already closed or aborted
          }
        }
      })();
    },
    cancel() {
      // Cleanly abort in-flight execution when client disconnects
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
