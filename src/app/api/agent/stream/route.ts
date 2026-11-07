import { NextRequest } from "next/server";
import { streamResponse } from "@/services/agentService";
import type { MessageResponse, FileAttachment } from "@/types/message";
import { getCurrentUser } from "@/lib/auth";
import { checkThreadAccess } from "@/lib/thread";
import { getGuestId, getOrCreateGuestId } from "@/lib/guest";

const MAX_CONTENT_LENGTH = 20_000;

/** EventSource cannot read non-200 bodies, so request errors are delivered as an SSE error event. */
function sseError(message: string, threadId?: string) {
  const body = `event: error
data: ${JSON.stringify({ message, threadId })}

`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE endpoint that streams incremental AI response chunks produced by the LangGraph React agent.
 * Query params:
 *  - content: user message text
 *  - threadId: conversation id; history is loaded from the LangGraph checkpointer
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userContent = searchParams.get("content") || "";
  const threadId = searchParams.get("threadId") || "";
  const model = searchParams.get("model") || undefined;
  const provider = searchParams.get("provider") || undefined;
  const allowTool = searchParams.get("allowTool") as "allow" | "deny" | null;
  const toolsParam = searchParams.get("tools") || "";
  const approveAllTools = searchParams.get("approveAllTools") === "true";
  const attachmentsParam = searchParams.get("attachments") || "";

  const temperatureParam = searchParams.get("temperature");
  const parsedTemperature = temperatureParam ? Number.parseFloat(temperatureParam) : NaN;
  const temperature = Number.isFinite(parsedTemperature)
    ? Math.min(Math.max(parsedTemperature, 0), 2)
    : undefined;
  const systemPrompt = searchParams.get("systemPrompt") || undefined;
  const agentMode: "single" | "multi" =
    searchParams.get("agentMode") === "multi" ? "multi" : "single";

  const tools = toolsParam
    ? toolsParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;

  // Parse attachments from JSON
  let attachments: FileAttachment[] | undefined;
  if (attachmentsParam) {
    try {
      const parsed = JSON.parse(attachmentsParam);
      attachments = Array.isArray(parsed) ? (parsed as FileAttachment[]) : undefined;
    } catch (error) {
      console.error("Failed to parse attachments:", error);
    }
  }

  // Without a thread id, every such request would share one checkpoint ("unknown").
  if (!threadId) return sseError("threadId is required");
  if (!allowTool && !userContent.trim() && !attachments?.length) {
    return sseError("Message content is required", threadId);
  }
  if (userContent.length > MAX_CONTENT_LENGTH) {
    return sseError(`Message is too long (max ${MAX_CONTENT_LENGTH} characters)`, threadId);
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
            userText: userContent,
            opts: {
              model,
              provider,
              tools,
              allowTool: allowTool || undefined,
              approveAllTools,
              attachments,
              temperature,
              systemPrompt,
              agentMode,
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
            controller.enqueue(encoder.encode("event: done\n"));
            controller.enqueue(encoder.encode("data: {}\n\n"));
          }
        } catch (err: unknown) {
          if (!abortController.signal.aborted) {
            // Emit an error event
            controller.enqueue(encoder.encode("event: error\n"));
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ message: (err as Error)?.message || "Stream error", threadId })}\n\n`,
              ),
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
