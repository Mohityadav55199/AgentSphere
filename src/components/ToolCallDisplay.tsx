import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Settings2Icon,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
  Edit3,
  Terminal,
  Database,
  FileCode,
  Globe,
} from "lucide-react";
import type { ToolCall, FunctionCall, ToolApprovalCallbacks } from "@/types/message";

interface ToolCallDisplayProps {
  toolCalls?: ToolCall[];
  functionCalls?: FunctionCall[];
  approvalCallbacks?: ToolApprovalCallbacks;
  showApprovalButtons?: boolean;
}

const isSensitiveTool = (name: string): boolean => {
  const n = name.toLowerCase();
  return (
    n.includes("exec") ||
    n.includes("bash") ||
    n.includes("cmd") ||
    n.includes("shell") ||
    n.includes("delete") ||
    n.includes("drop") ||
    n.includes("write") ||
    n.includes("update") ||
    n.includes("truncate") ||
    n.includes("remove") ||
    n.includes("sql") ||
    n.includes("patch")
  );
};

const getToolIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("sql") || n.includes("postgres") || n.includes("database")) {
    return <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
  }
  if (n.includes("terminal") || n.includes("exec") || n.includes("bash") || n.includes("cmd")) {
    return <Terminal className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  }
  if (n.includes("search") || n.includes("web") || n.includes("fetch")) {
    return <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  }
  if (n.includes("file") || n.includes("code")) {
    return <FileCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  }
  return <Settings2Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
};

const ToolCallItem: React.FC<{
  name: string;
  args: Record<string, unknown>;
  id?: string;
  approvalCallbacks?: ToolApprovalCallbacks;
  showApprovalButtons?: boolean;
}> = ({ name, args, id, approvalCallbacks, showApprovalButtons }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [decision, setDecision] = useState<"approved" | "denied" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedArgs, setEditedArgs] = useState(() => JSON.stringify(args, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const sensitive = isSensitiveTool(name);

  const handleApprove = () => {
    setDecision("approved");
    if (id && approvalCallbacks) {
      approvalCallbacks.onApprove(id);
    }
  };

  const handleDeny = () => {
    setDecision("denied");
    if (id && approvalCallbacks) {
      approvalCallbacks.onDeny(id);
    }
  };

  const handleSaveEditAndApprove = () => {
    try {
      JSON.parse(editedArgs);
      setJsonError(null);
      setIsEditing(false);
      handleApprove();
    } catch {
      setJsonError("Invalid JSON format. Please verify before approving.");
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        sensitive
          ? "border-amber-300/80 bg-gradient-to-r from-amber-50/60 to-orange-50/40 dark:border-amber-700/50 dark:from-amber-950/20 dark:to-orange-950/10"
          : "border-gray-200/80 bg-white/70 shadow-xs dark:border-gray-800 dark:bg-gray-900/60"
      } p-3.5`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          suppressHydrationWarning
          className="flex flex-1 cursor-pointer items-center gap-2 text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
          )}
          {getToolIcon(name)}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">
              {name}
            </span>
            {sensitive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3" />
                Sensitive Action
              </span>
            )}
          </div>
        </button>

        {decision && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              decision === "approved"
                ? "bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300"
            }`}
          >
            {decision === "approved" ? "✓ Authorized" : "✕ Denied"}
          </span>
        )}
      </div>

      {/* Sensitive Banner Warning */}
      {sensitive && showApprovalButtons && !decision && (
        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-semibold">Human-In-The-Loop Safety Guard: </span>
            This tool can modify files or environment state. Review arguments before permitting execution.
          </div>
        </div>
      )}

      {/* Arguments View & Inline Editor */}
      {(isExpanded || (showApprovalButtons && !decision)) && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
            <span>Input Arguments:</span>
            {!decision && (
              <button
                suppressHydrationWarning
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400"
              >
                <Edit3 className="h-3 w-3" />
                {isEditing ? "Cancel Edit" : "Edit Inputs"}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-1.5">
              <textarea
                value={editedArgs}
                onChange={(e) => setEditedArgs(e.target.value)}
                className="h-28 w-full rounded-lg border border-blue-300 bg-gray-50 p-2 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-blue-700 dark:bg-gray-950 dark:text-gray-100"
              />
              {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
            </div>
          ) : (
            <pre className="max-h-60 overflow-x-auto rounded-lg bg-gray-100/80 p-2.5 font-mono text-xs text-gray-800 dark:bg-gray-950/80 dark:text-gray-200">
              {JSON.stringify(args, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* HITL Action Controls */}
      {showApprovalButtons && id && approvalCallbacks && !decision && (
        <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-gray-200/60 pt-2.5 dark:border-gray-800/60">
          <button
            suppressHydrationWarning
            onClick={handleDeny}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-xs transition-colors hover:bg-red-50 dark:border-red-900/60 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <X className="h-3.5 w-3.5" />
            Deny Execution
          </button>

          {isEditing ? (
            <button
              suppressHydrationWarning
              onClick={handleSaveEditAndApprove}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
            >
              <Check className="h-3.5 w-3.5" />
              Save & Authorize
            </button>
          ) : (
            <button
              suppressHydrationWarning
              onClick={handleApprove}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-110 active:scale-95"
            >
              <Check className="h-3.5 w-3.5" />
              Authorize & Run
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({
  toolCalls = [],
  functionCalls = [],
  approvalCallbacks,
  showApprovalButtons = false,
}) => {
  const hasToolCalls = toolCalls.length > 0;
  const hasFunctionCalls = functionCalls.length > 0;

  if (!hasToolCalls && !hasFunctionCalls) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {hasToolCalls && (
        <div className="space-y-2.5">
          {toolCalls.map((toolCall, index) => (
            <ToolCallItem
              key={toolCall.id || index}
              name={toolCall.name}
              args={toolCall.args}
              id={toolCall.id}
              approvalCallbacks={approvalCallbacks}
              showApprovalButtons={showApprovalButtons}
            />
          ))}
        </div>
      )}

      {hasFunctionCalls && (
        <div className="space-y-2.5">
          {functionCalls.map((functionCall, index) => (
            <ToolCallItem
              key={index}
              name={functionCall.name}
              args={functionCall.args}
              approvalCallbacks={approvalCallbacks}
              showApprovalButtons={showApprovalButtons}
            />
          ))}
        </div>
      )}
    </div>
  );
};