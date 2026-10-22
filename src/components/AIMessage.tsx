import { useState, useEffect } from "react";
import type { MessageResponse, ToolApprovalCallbacks } from "@/types/message";
import { Copy, Check, Sparkles, Volume2, VolumeX, Download } from "lucide-react";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { getMessageContent, hasToolCalls, getToolCalls } from "@/services/messageUtils";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { useUISettings } from "@/contexts/UISettingsContext";
import MDEditor from "@uiw/react-md-editor";
import { AgentCouncilTimeline } from "./AgentCouncilTimeline";
import { MermaidRenderer } from "./MermaidRenderer";
import { AgentThoughtAccordion } from "./AgentThoughtAccordion";
import { TelemetryBar } from "./TelemetryBar";

interface AIMessageProps {
  message: MessageResponse;
  approvalCallbacks?: ToolApprovalCallbacks;
  showApprovalButtons?: boolean;
}

interface ThoughtSection {
  id: string;
  icon: string;
  name: string;
  title: string;
  content: string;
  badgeBg: string;
}

function parseCouncilSections(text: string): {
  thoughts: ThoughtSection[];
  mainContent: string;
} {
  if (!text) return { thoughts: [], mainContent: "" };

  const thoughts: ThoughtSection[] = [];
  let remainingText = text;

  // 1. 🎯 Supervisor Plan
  const supMatch = text.match(/### 🎯\s*Supervisor Plan([\s\S]*?)(?=(### [🔍💻📊🛡️]|$))/i);
  if (supMatch) {
    thoughts.push({
      id: "supervisor",
      icon: "🎯",
      name: "Supervisor",
      title: "Task Decomposition & Execution Plan",
      content: supMatch[1].trim(),
      badgeBg:
        "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
    });
    remainingText = remainingText.replace(supMatch[0], "");
  }

  // 2. 🔍 Research & Context Findings
  const resMatch = text.match(
    /### 🔍\s*(Research|Context)[\s\S]*?Findings([\s\S]*?)(?=(### [🎯💻📊🛡️]|$))/i,
  );
  if (resMatch) {
    thoughts.push({
      id: "researcher",
      icon: "🔍",
      name: "Researcher",
      title: "Context, References & Documentation",
      content: resMatch[2].trim(),
      badgeBg:
        "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
    });
    remainingText = remainingText.replace(resMatch[0], "");
  }

  // 3. 📊 Data & Architecture Analysis
  const anaMatch = text.match(
    /### 📊\s*Data & Architecture Analysis([\s\S]*?)(?=(### [🎯🔍💻🛡️]|$))/i,
  );
  if (anaMatch) {
    thoughts.push({
      id: "analyst",
      icon: "📊",
      name: "Analyst",
      title: "Quantitative Insights & Trade-offs",
      content: anaMatch[1].trim(),
      badgeBg:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    });
    remainingText = remainingText.replace(anaMatch[0], "");
  }

  // 4. 🛡️ Security Audit & Verification
  const audMatch = text.match(
    /### 🛡️\s*Security Audit & Verification([\s\S]*?)(?=(### [🎯🔍💻📊]|$))/i,
  );
  if (audMatch) {
    thoughts.push({
      id: "auditor",
      icon: "🛡️",
      name: "Auditor",
      title: "Zero-Trust Security & Edge Case Audit",
      content: audMatch[1].trim(),
      badgeBg:
        "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
    });
    remainingText = remainingText.replace(audMatch[0], "");
  }

  // Clean up any empty lines from developer heading
  let cleanMain = remainingText.trim();
  cleanMain = cleanMain.replace(/^### 💻\s*Developer Implementation\s*/i, "");

  return { thoughts, mainContent: cleanMain || text };
}

export const AIMessage = ({
  message,
  approvalCallbacks,
  showApprovalButtons = false,
}: AIMessageProps) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messageContent = getMessageContent(message);
  const hasTools = hasToolCalls(message);
  const toolCalls = getToolCalls(message);
  const { hideToolMessages, theme, model, provider } = useUISettings();
  const activeNode =
    "additional_kwargs" in message.data && message.data.additional_kwargs
      ? (message.data.additional_kwargs.agentNode as string | undefined)
      : undefined;

  // Parse Council CoT thought steps from the main implementation
  const { thoughts, mainContent } = parseCouncilSections(messageContent);

  // Word count and reading time analytics
  const wordCount = messageContent ? messageContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Text-to-speech is not supported in your browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(messageContent);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = async () => {
    if (!messageContent) return;
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const shouldShowTools = hasTools && !hideToolMessages;
  const hasVisibleContent = messageContent || shouldShowTools;

  if (!hasVisibleContent) {
    return null;
  }

  return (
    <div className="group animate-fade-in flex gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="max-w-[85%] space-y-2">
        {messageContent && (
          <div
            className={cn(
              "relative rounded-2xl p-4 shadow-sm transition-all",
              "border border-gray-100 bg-white/90 text-gray-800 dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-100",
              "backdrop-blur-sm",
            )}
          >
            {/* 5-Agent Council Stepper & Pipeline */}
            <AgentCouncilTimeline content={messageContent} activeNode={activeNode} />

            {/* Collapsible Agent Thought Accordions (CoT) */}
            {thoughts.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {thoughts.map((th) => (
                  <AgentThoughtAccordion
                    key={th.id}
                    icon={th.icon}
                    name={th.name}
                    title={th.title}
                    content={th.content}
                    badgeBg={th.badgeBg}
                    defaultOpen={false}
                  />
                ))}
              </div>
            )}

            {/* Main Response Markdown with Interactive Code & Mermaid Renderer */}
            <div
              data-color-mode={theme}
              className="[&_hr]:!my-1 [&_hr]:h-px [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-gray-300 [&_li]:my-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
            >
              <MDEditor.Markdown
                source={mainContent}
                style={{
                  backgroundColor: "transparent",
                  color: "inherit",
                  padding: 0,
                  fontSize: "0.875rem",
                  lineHeight: "1.55",
                }}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const lang = match ? match[1].toLowerCase() : "";
                    const codeString = String(children).replace(/\n$/, "");

                    if (lang === "mermaid") {
                      return <MermaidRenderer code={codeString} />;
                    }

                    if (match) {
                      return (
                        <div className="my-3 overflow-hidden rounded-xl border border-gray-200 bg-[#0d1117] text-gray-200 shadow-xs dark:border-gray-800">
                          <div className="flex items-center justify-between border-b border-gray-800 bg-[#161b22] px-3.5 py-1.5 font-mono text-xs text-gray-400">
                            <span className="text-[11px] font-bold tracking-wider text-indigo-400 uppercase">
                              {lang}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const ext =
                                    lang === "typescript"
                                      ? "ts"
                                      : lang === "javascript"
                                        ? "js"
                                        : lang === "python"
                                          ? "py"
                                          : lang;
                                  const blob = new Blob([codeString], { type: "text/plain" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `code-${Date.now()}.${ext}`;
                                  a.click();
                                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                                }}
                                className="flex cursor-pointer items-center gap-1 text-[11px] transition-colors hover:text-white"
                                title="Download code file"
                              >
                                <Download size={12} />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(codeString);
                                }}
                                className="flex cursor-pointer items-center gap-1 text-[11px] transition-colors hover:text-white"
                                title="Copy code"
                              >
                                <Copy size={12} />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                          <pre className="overflow-x-auto bg-[#0d1117] p-3.5 font-mono text-xs leading-relaxed">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <code
                        className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.88em] text-indigo-600 dark:bg-gray-800 dark:text-indigo-400"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              />
            </div>

            {/* Real-Time Token, Cost & Latency Telemetry */}
            <TelemetryBar content={messageContent} modelName={model} provider={provider} />

            {/* Quick Actions & Analytics Bar */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5 text-xs text-gray-400 dark:border-gray-800">
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                <span>AgentSphere Council</span>
                {wordCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{wordCount} words</span>
                    <span>•</span>
                    <span>~{readingTimeMinutes} min read</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Speech Synthesis Button */}
                <button
                  suppressHydrationWarning
                  onClick={handleSpeech}
                  className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    isSpeaking
                      ? "animate-pulse bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  }`}
                  title={isSpeaking ? "Stop reading" : "Read aloud"}
                >
                  {isSpeaking ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                  <span>{isSpeaking ? "Stop" : "Listen"}</span>
                </button>

                {/* Copy Button */}
                <button
                  suppressHydrationWarning
                  onClick={handleCopy}
                  className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  title="Copy response"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        Copied!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {shouldShowTools && (
          <div className="space-y-2">
            <ToolCallDisplay
              toolCalls={toolCalls}
              approvalCallbacks={approvalCallbacks}
              showApprovalButtons={showApprovalButtons}
            />
          </div>
        )}
      </div>
    </div>
  );
};
