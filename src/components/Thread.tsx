import Link from "next/link";
import { MessageInput, type MessageInputHandle } from "./MessageInput";
import MessageList from "./MessageList";
import { useChatThread } from "@/hooks/useChatThread";
import { Loader2, UploadCloud } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { MessageOptions } from "@/types/message";

interface ThreadProps {
  threadId: string;
  onFirstMessageSent?: (threadId: string) => void;
}

export const Thread = ({ threadId, onFirstMessageSent }: ThreadProps) => {
  const { messages, isLoadingHistory, historyError, isSending, sendMessage, approveToolExecution } =
    useChatThread({ threadId });
  const [awaitingFirstResponse, setAwaitingFirstResponse] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<MessageInputHandle>(null);
  const redirectedRef = useRef(false);

  const handleSendMessage = async (message: string, opts?: MessageOptions) => {
    const wasEmpty = messages.length === 0;
    await sendMessage(message, opts);
    if (wasEmpty) setAwaitingFirstResponse(true);
  };

  /** Only react to drags that carry files (not selected text or links). */
  const isFileDrag = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    // The overlay covers the whole thread (including the input), so the drop lands here.
    // Previously the files were silently discarded; hand them to the input's uploader.
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void inputRef.current?.addFiles(files);
  };

  // After the first exchange on the home page, move to the thread's own URL (once).
  const firstResponseArrived =
    awaitingFirstResponse && !isSending && messages.some((m) => m.type !== "human");
  useEffect(() => {
    if (firstResponseArrived && !redirectedRef.current) {
      redirectedRef.current = true;
      onFirstMessageSent?.(threadId);
    }
  }, [firstResponseArrived, onFirstMessageSent, threadId]);

  if (isLoadingHistory) {
    return (
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-2">Loading conversation history...</p>
      </div>
    );
  }

  // A failed load (e.g. someone else's thread, or a network error) used to fall through to the
  // empty "new chat" screen, inviting the user to type into a thread they cannot use.
  if (historyError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          This conversation could not be loaded.
        </p>
        <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400">
          It may belong to another account, have been deleted, or the server may be waking up.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Start a new chat
        </Link>
      </div>
    );
  }

  const PROMPT_SUGGESTIONS = [
    {
      icon: "👥",
      title: "5-Agent Swarm",
      prompt:
        "Design and implement a rate-limited API gateway in TypeScript with an architecture flowchart.",
    },
    {
      icon: "🛡️",
      title: "Secure Engineering",
      prompt: "Write a secure JWT auth middleware with refresh tokens and verify OWASP edge cases.",
    },
    {
      icon: "📊",
      title: "Architecture & Diagram",
      prompt: "Compare PostgreSQL vs DynamoDB for real-time analytics with a Mermaid diagram.",
    },
    {
      icon: "🔍",
      title: "Deep Tech Research",
      prompt:
        "Research and compare LangGraph, AutoGen, and CrewAI architectures for production multi-agent systems.",
    },
  ];

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-gray-50/50 via-white to-gray-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center border-4 border-dashed border-blue-500 bg-blue-600/10 backdrop-blur-md transition-all">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 p-8 shadow-2xl dark:bg-gray-900/90">
            <UploadCloud className="h-12 w-12 animate-bounce text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Drop files to attach
            </h3>
            <p className="text-xs text-gray-500">
              Attach images, documents, or text files directly to AgentSphere
            </p>
          </div>
        </div>
      )}
      {messages.length > 0 ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
                <MessageList messages={messages} approveToolExecution={approveToolExecution} />
              </div>
            </ScrollArea>
          </div>
          <div className="flex-shrink-0 border-t border-gray-200/50 p-3 backdrop-blur-xs sm:p-4 dark:border-gray-800/50 dark:bg-gray-950/40">
            <div className="mx-auto max-w-3xl">
              <MessageInput
                ref={inputRef}
                onSendMessage={handleSendMessage}
                isLoading={isSending}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-4 sm:py-6">
          <div className="my-auto w-full max-w-3xl space-y-4 sm:space-y-6">
            {/* Hero Header */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs dark:border-indigo-800/40 dark:from-indigo-950/60 dark:to-blue-950/60 dark:text-indigo-300">
                <span>✨</span> 5-Agent Council & Model Context Protocol (MCP)
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                What would you like to build today?
              </h1>
              <p className="mx-auto max-w-lg text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                AgentSphere deploys a collaborative 5-agent council (Supervisor, Researcher,
                Developer, Analyst, and Auditor) with live MCP tool access.
              </p>
            </div>

            {/* Prompt Suggestion Cards */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  suppressHydrationWarning
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isSending}
                  className="group flex flex-col gap-1 rounded-xl border border-gray-200/80 bg-white/80 p-3 text-left shadow-xs backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/40 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-900/80 dark:hover:border-blue-700 dark:hover:from-gray-900 dark:hover:to-blue-950/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-semibold text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500">
                      Send ↵
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-900 sm:text-sm dark:text-gray-100">
                    {item.title}
                  </div>
                  <div className="line-clamp-2 text-[11px] text-gray-500 dark:text-gray-400">
                    &ldquo;{item.prompt}&rdquo;
                  </div>
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="pt-1">
              <MessageInput
                ref={inputRef}
                onSendMessage={handleSendMessage}
                isLoading={isSending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
