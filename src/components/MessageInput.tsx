import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  ArrowUp,
  Loader2,
  Eye,
  EyeOff,
  Paperclip,
  X,
  Mic,
  MicOff,
  FileText,
} from "lucide-react";
import { MessageOptions, FileAttachment } from "@/types/message";
import { SettingsPanel } from "./SettingsPanel";
import { useUISettings } from "@/contexts/UISettingsContext";
import { MAX_ATTACHMENTS } from "@/lib/storage/validation";

interface MessageInputProps {
  onSendMessage: (message: string, opts?: MessageOptions) => Promise<void>;
  isLoading?: boolean;
  maxLength?: number;
}

export const MessageInput = ({
  onSendMessage,
  isLoading = false,
  maxLength = 2000,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    hideToolMessages,
    toggleToolMessages,
    provider,
    setProvider,
    model,
    setModel,
    approveAllTools,
    setApproveAllTools,
    temperature,
    systemPrompt,
    agentMode,
  } = useUISettings();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.start();
    } catch (e) {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [message]);

  const uploadFiles = async (files: File[]) => {
    const remainingSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
    if (remainingSlots <= 0) {
      alert(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      return;
    }

    setIsUploading(true);
    try {
      const selectedFiles = files.slice(0, remainingSlots);
      if (selectedFiles.length < files.length) {
        alert(
          `Only the first ${remainingSlots} file(s) were selected (max ${MAX_ATTACHMENTS} attachments).`,
        );
      }

      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/agent/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data = await response.json();
        return {
          url: data.url,
          key: data.key,
          name: data.name,
          type: data.type,
          size: data.size,
        } as FileAttachment;
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error("File upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeAttachment = (key: string) => {
    setAttachments((prev) => prev.filter((att) => att.key !== key));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachments.length === 0) || isLoading) return;

    await onSendMessage(message, {
      model,
      provider,
      tools: [],
      approveAllTools: approveAllTools,
      attachments: attachments.length > 0 ? attachments : undefined,
      temperature,
      systemPrompt,
      agentMode,
    });
    setMessage("");
    setAttachments([]);
  };
  // Calculate remaining characters
  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars < maxLength * 0.1; // Less than 10% remaining
  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative mx-auto flex w-full flex-col rounded-2xl border bg-white/90 shadow-md backdrop-blur-md transition-all duration-200 dark:bg-gray-900/90 ${
          isDragging
            ? "border-blue-500 bg-blue-50/40 ring-4 ring-blue-500/20 dark:bg-blue-950/30"
            : isFocused
              ? "border-blue-500/80 shadow-lg ring-2 shadow-blue-500/10 ring-blue-500/20 dark:border-blue-500/80"
              : "border-gray-200/80 dark:border-gray-800"
        }`}
      >
        {/* Drag and drop overlay */}
        {isDragging && (
          <div className="animate-in fade-in-0 pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500 bg-blue-50/90 text-blue-600 backdrop-blur-xs duration-150 dark:bg-blue-950/90 dark:text-blue-300">
            <Paperclip className="mb-1 h-8 w-8 animate-bounce" />
            <p className="text-sm font-semibold">Drop files here to attach to chat</p>
            <p className="text-xs text-blue-500/80 dark:text-blue-400/80">
              Images, PDFs, Markdown, Code
            </p>
          </div>
        )}

        {/* Settings Panel */}
        <SettingsPanel
          isExpanded={settingsExpanded}
          onToggle={() => setSettingsExpanded(!settingsExpanded)}
          provider={provider}
          setProvider={setProvider}
          model={model}
          setModel={setModel}
        />

        {/* Input Section */}
        <div className="px-4 pt-3 pb-2">
          {/* File Attachments Display */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((attachment) => {
                const isImg = attachment.type?.startsWith("image/");
                return (
                  <div
                    key={attachment.key}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/90 p-1.5 pr-2.5 text-xs text-gray-800 shadow-xs dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200"
                  >
                    {isImg ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="h-8 w-8 rounded border border-gray-200 object-cover dark:border-gray-700"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <FileText className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="max-w-[160px] truncate text-[11px] leading-tight font-medium">
                        {attachment.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {attachment.size < 1024
                          ? "<1KB"
                          : `${(attachment.size / 1024).toFixed(0)}KB`}
                      </span>
                    </div>
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => removeAttachment(attachment.key)}
                      className="ml-1 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-700 dark:hover:text-red-400"
                      aria-label="Remove attachment"
                      title="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <textarea
            value={message}
            ref={textareaRef}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={"Type your message..."}
            maxLength={maxLength}
            className="max-h-[200px] min-h-[60px] w-full flex-1 resize-none overflow-auto pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
            rows={1}
            aria-label="Message input"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,application/pdf,text/markdown,text/plain,.md,.markdown,.txt"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="File upload"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              {/* Character counter */}
              <div
                className={`font-mono text-[11px] ${isNearLimit ? "font-semibold text-amber-500" : "text-gray-400"}`}
              >
                {remainingChars}/{maxLength}
              </div>

              {/* Auto-approve tools setting - always visible */}
              <label className="flex cursor-pointer items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={approveAllTools}
                  onChange={(e) => setApproveAllTools(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Auto-approve
                </span>
              </label>

              {/* Tool messages toggle */}
              <button
                suppressHydrationWarning
                type="button"
                onClick={toggleToolMessages}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={hideToolMessages ? "Show tool messages" : "Hide tool messages"}
              >
                {hideToolMessages ? (
                  <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-gray-500" />
                )}
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {hideToolMessages ? "Show tools" : "Hide tools"}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Audio Waveform feedback when recording */}
              {isListening && (
                <div className="flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2 py-1 dark:border-red-900/40 dark:bg-red-950/60">
                  <span className="h-2 w-0.5 animate-pulse rounded-full bg-red-500" />
                  <span className="h-4 w-0.5 animate-pulse rounded-full bg-red-500 delay-75" />
                  <span className="h-3 w-0.5 animate-pulse rounded-full bg-red-500 delay-150" />
                  <span className="h-4.5 w-0.5 animate-pulse rounded-full bg-red-500 delay-100" />
                  <span className="ml-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                    Listening
                  </span>
                </div>
              )}

              {/* Voice Input Button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={toggleSpeechRecognition}
                disabled={isLoading}
                className={`h-8 w-8 rounded-full p-0 transition-all ${
                  isListening
                    ? "animate-pulse bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
                title={isListening ? "Listening... Click to stop" : "Voice input"}
                aria-label="Voice input"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              {/* File upload button */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading || attachments.length >= MAX_ATTACHMENTS}
                className="h-8 w-8 rounded-full p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                title={`Attach file (${attachments.length}/${MAX_ATTACHMENTS})`}
                aria-label="Attach file"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>

              {/* Send Button */}
              <Button
                type="submit"
                size="sm"
                disabled={(!message.trim() && attachments.length === 0) || isLoading}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-0 transition-all ${
                  (message.trim() || attachments.length > 0) && !isLoading
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs hover:brightness-110 active:scale-95"
                    : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
                title="Send message (Enter)"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
