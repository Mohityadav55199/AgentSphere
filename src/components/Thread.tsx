import { MessageInput } from "./MessageInput";
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
  const { messages, isLoadingHistory, isSending, sendMessage, approveToolExecution } =
    useChatThread({ threadId });
  const firstMessageInitiatedRef = useRef(false);
  const [awaitingFirstResponse, setAwaitingFirstResponse] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleSendMessage = async (message: string, opts?: MessageOptions) => {
    const wasEmpty = messages.length === 0;
    await sendMessage(message, opts);
    if (wasEmpty) {
      firstMessageInitiatedRef.current = true;
      setAwaitingFirstResponse(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
  };

  // Detect first AI/tool/error message arrival after initial user message to trigger redirect
  useEffect(() => {
    if (awaitingFirstResponse && !isSending) {
      const hasNonHuman = messages.some((m) => m.type !== "human");
      if (hasNonHuman) {
        setAwaitingFirstResponse(false);
        if (onFirstMessageSent) onFirstMessageSent(threadId);
      }
    }
  }, [awaitingFirstResponse, isSending, messages, onFirstMessageSent, threadId]);

  if (isLoadingHistory) {
    return (
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-2">Loading conversation history...</p>
      </div>
    );
  }

  const PROMPT_SUGGESTIONS = [
    {
      icon: "💻",
      title: "Write Code",
      prompt: "Write a Python script to parse JSON data and log key metrics.",
    },
    {
      icon: "⚡",
      title: "Fast Analysis",
      prompt: "Explain how transformer models work in simple terms.",
    },
    {
      icon: "✍️",
      title: "Draft Content",
      prompt: "Draft a professional product launch announcement email.",
    },
    {
      icon: "💡",
      title: "Brainstorm Ideas",
      prompt: "Give me 5 creative ideas for an AI side project.",
    },
  ];

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative absolute inset-0 flex flex-col bg-gradient-to-b from-gray-50/50 via-white to-gray-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center border-4 border-dashed border-blue-500 bg-blue-600/10 backdrop-blur-md transition-all">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 p-8 shadow-2xl dark:bg-gray-900/90">
            <UploadCloud className="h-12 w-12 text-blue-600 animate-bounce" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Drop files to attach</h3>
            <p className="text-xs text-gray-500">Attach images, documents, or text files directly to AgentSphere</p>
          </div>
        </div>
      )}
      {messages.length > 0 ? (
        <>
          <div className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
                <MessageList messages={messages} approveToolExecution={approveToolExecution} />
              </div>
            </ScrollArea>
          </div>
          <div className="flex-shrink-0">
            <div className="w-full p-4 pb-6">
              <div className="mx-auto max-w-3xl">
                <MessageInput onSendMessage={handleSendMessage} isLoading={isSending} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-3xl space-y-8">
            {/* Hero Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-800/40 dark:from-indigo-950/60 dark:to-blue-950/60 dark:text-indigo-300">
                <span>✨</span> Powered by LangGraph & Groq
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                What would you like to build today?
              </h1>
              <p className="mx-auto max-w-lg text-sm text-gray-500 dark:text-gray-400">
                AgentSphere is ready to assist with coding, analysis, creative writing, and autonomous tool workflows.
              </p>
            </div>

            {/* Prompt Suggestion Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isSending}
                  className="group flex flex-col gap-1.5 rounded-xl border border-gray-200/80 bg-white/80 p-4 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/40 hover:shadow-md dark:border-gray-800/80 dark:bg-gray-900/80 dark:hover:border-blue-700 dark:hover:from-gray-900 dark:hover:to-blue-950/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-semibold text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500">
                      Send ↵
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {item.title}
                  </div>
                  <div className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    "{item.prompt}"
                  </div>
                </button>
              ))}
            </div>

            {/* Input Box */}
            <MessageInput onSendMessage={handleSendMessage} isLoading={isSending} />
          </div>
        </div>
      )}
    </div>
  );
};
