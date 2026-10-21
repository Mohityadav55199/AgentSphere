import React, { useState } from "react";
import {
  X,
  FileText,
  Printer,
  Code,
  Copy,
  Check,
  Download,
  Share2,
  Sparkles,
} from "lucide-react";

interface ExportStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string | null;
}

export const ExportStudioModal: React.FC<ExportStudioModalProps> = ({
  isOpen,
  onClose,
  threadId,
}) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [includeThoughtAccordions, setIncludeThoughtAccordions] = useState(true);

  if (!isOpen || !threadId) return null;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/history/${threadId}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return await res.json();
    } finally {
      setLoading(false);
    }
  };

  const generateMarkdown = (messages: Array<{ type: string; data?: { content?: unknown } }>) => {
    let md = `# 🤖 AgentSphere Council Report\n\n`;
    md += `- **Thread ID:** \`${threadId}\`\n`;
    md += `- **Generated:** ${new Date().toLocaleString()}\n`;
    md += `- **Architecture:** 5-Agent Council (Supervisor, Researcher, Developer, Analyst, Auditor)\n\n`;
    md += `---\n\n`;

    for (const msg of messages) {
      const role =
        msg.type === "human"
          ? "👤 User Request"
          : msg.type === "ai"
            ? "✨ AgentSphere Council"
            : "🛠️ Tool Execution";

      let content =
        typeof msg.data?.content === "string"
          ? msg.data.content
          : JSON.stringify(msg.data?.content || "", null, 2);

      if (!includeThoughtAccordions && msg.type === "ai") {
        // Strip out thought headings if user unchecked
        content = content.replace(/### (🎯|🔍|📊|🛡️)[^\n]*\n[\s\S]*?(?=(### 💻|### 🎯|### 🔍|### 📊|### 🛡️|$))/g, "");
      }

      md += `## ${role}\n\n${content}\n\n---\n\n`;
    }

    return md;
  };

  const handleExportMarkdown = async () => {
    const messages = await fetchHistory();
    const md = generateMarkdown(messages);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AgentSphere-Report-${threadId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleExportJSON = async () => {
    const messages = await fetchHistory();
    const json = JSON.stringify(
      {
        platform: "AgentSphere",
        version: "2.0-MultiAgent",
        exportedAt: new Date().toISOString(),
        threadId,
        messages,
      },
      null,
      2,
    );
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AgentSphere-Audit-${threadId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleCopyClipboard = async () => {
    const messages = await fetchHistory();
    const md = generateMarkdown(messages);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200/60 pb-4 dark:border-gray-800/60">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Export & Presentation Studio
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generate professional reports and audit logs
              </p>
            </div>
          </div>
          <button
            suppressHydrationWarning
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includeThoughtAccordions}
              onChange={(e) => setIncludeThoughtAccordions(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Include Agent Council Chain-of-Thought sections</span>
          </label>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {/* Markdown Export */}
            <button
              suppressHydrationWarning
              onClick={handleExportMarkdown}
              disabled={loading}
              className="flex cursor-pointer flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-left transition-all hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-850 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
            >
              <div className="flex items-center justify-between">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <Download className="h-4 w-4 text-gray-400" />
              </div>
              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-gray-100">
                Markdown Report (.md)
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Formatted with code blocks, tables, and Mermaid graphs
              </div>
            </button>

            {/* Print / PDF Export */}
            <button
              suppressHydrationWarning
              onClick={handlePrintPDF}
              className="flex cursor-pointer flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-gray-800 dark:bg-gray-850 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
            >
              <div className="flex items-center justify-between">
                <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <Sparkles className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-gray-100">
                Print / Save to PDF
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Styled executive document ready for sharing or printing
              </div>
            </button>

            {/* JSON Audit Log */}
            <button
              suppressHydrationWarning
              onClick={handleExportJSON}
              disabled={loading}
              className="flex cursor-pointer flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-gray-800 dark:bg-gray-850 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
            >
              <div className="flex items-center justify-between">
                <Code className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <Download className="h-4 w-4 text-gray-400" />
              </div>
              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-gray-100">
                JSON Audit Log (.json)
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Full structured LangGraph messages & metadata
              </div>
            </button>

            {/* Clipboard Copy */}
            <button
              suppressHydrationWarning
              onClick={handleCopyClipboard}
              disabled={loading}
              className="flex cursor-pointer flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-left transition-all hover:border-purple-300 hover:bg-purple-50/40 dark:border-gray-800 dark:bg-gray-850 dark:hover:border-purple-700 dark:hover:bg-purple-950/30"
            >
              <div className="flex items-center justify-between">
                {copied ? (
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                )}
                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  {copied ? "Copied!" : "1-Click"}
                </span>
              </div>
              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-gray-100">
                Copy Markdown
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Copy full formatted transcript to clipboard
              </div>
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            suppressHydrationWarning
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
