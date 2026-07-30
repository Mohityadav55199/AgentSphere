"use client";

import { useRef, useState } from "react";
import { useThreads } from "@/hooks/useThreads";
import {
  SquarePen,
  Search,
  Loader2,
  Check,
  X,
  Pencil,
  RefreshCcw,
  Settings,
  Trash2,
  Star,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface ThreadListProps {
  onOpenMCPConfig: () => void;
}

export function ThreadList({ onOpenMCPConfig }: ThreadListProps) {
  const { threads, createThread, deleteThread, togglePinThread, refetchThreads } = useThreads();
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleCreateThread = async () => {
    setIsCreating(true);
    try {
      const newThread = await createThread();
      router.push(`/thread/${newThread.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = threads.filter((t) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (t.title || "").toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
  });

  const startRename = (id: string, current: string | undefined) => {
    setRenamingId(id);
    setRenameValue(current || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const saveRename = async () => {
    if (!renamingId) return;
    setSavingRename(true);
    try {
      await fetch("/api/agent/threads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renamingId, title: renameValue || "Untitled thread" }),
      });
      await refetchThreads();
      setRenamingId(null);
    } catch (e) {
      console.error("Rename failed", e);
    } finally {
      setSavingRename(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchThreads();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm("Are you sure you want to delete this thread? This action cannot be undone.")) {
      return;
    }
    setDeletingId(threadId);
    try {
      await deleteThread(threadId);
    } catch (e) {
      console.error("Delete failed", e);
      alert("Failed to delete thread. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePin = async (threadId: string, currentPinned: boolean | undefined) => {
    try {
      await togglePinThread(threadId, !currentPinned);
    } catch (e) {
      console.error("Pin failed", e);
    }
  };

  return (
    <nav className="flex h-full flex-col border-r border-gray-200 bg-white/60 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/60">
      <div className="space-y-2 px-3 pt-3 pb-2">
        <div className="flex gap-2">
          <button suppressHydrationWarning
            onClick={handleCreateThread}
            disabled={isCreating}
            className="bg-primary text-primary-foreground inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SquarePen className="h-4 w-4" />
            )}
            New
          </button>
          <button suppressHydrationWarning
            onClick={handleRefresh}
            className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-2 py-2"
            title="Refresh"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="group relative">
          <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search threads..."
            suppressHydrationWarning
            className="w-full rounded-md border border-gray-300/70 bg-white/40 py-1.5 pr-2 pl-8 text-xs focus:ring-2 focus:ring-blue-500/40 focus:outline-none dark:border-gray-700/70 dark:bg-gray-800/40"
          />
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {filtered.map((thread) => {
          const active = pathname === `/thread/${thread.id}`;
          const isRenaming = renamingId === thread.id;
          return (
            <div
              key={thread.id}
              className={`group relative cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-all ${
                active
                  ? "border-blue-200 bg-blue-50/70 font-medium text-blue-950 shadow-xs dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200"
                  : "border-transparent text-gray-700 hover:border-gray-200/80 hover:bg-gray-100/70 dark:text-gray-300 dark:hover:border-gray-800 dark:hover:bg-gray-800/50"
              }`}
              onClick={() => {
                if (!isRenaming) router.push(`/thread/${thread.id}`);
              }}
            >
              {/* Active Indicator Bar */}
              {active && (
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400" />
              )}
              {!isRenaming && (
                <div className="flex items-center justify-between gap-2">
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(thread.id, thread.title);
                    }}
                    className="flex flex-1 items-center gap-1.5 truncate text-sm font-medium"
                    title="Double-click to rename"
                  >
                    {thread.isPinned && (
                      <Star className="h-3.5 w-3.5 flex-shrink-0 fill-amber-400 text-amber-500" />
                    )}
                    <span className="truncate">{thread.title || `Thread ${thread.id.slice(0, 8)}`}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button suppressHydrationWarning
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(thread.id, thread.isPinned);
                      }}
                      className="hover:bg-muted inline-flex h-5 w-5 items-center justify-center rounded"
                      title={thread.isPinned ? "Unpin thread" : "Pin thread"}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          thread.isPinned ? "fill-amber-400 text-amber-500" : "text-gray-400 hover:text-amber-500"
                        }`}
                      />
                    </button>
                    <button suppressHydrationWarning
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(thread.id, thread.title);
                      }}
                      className="hover:bg-muted inline-flex h-5 w-5 items-center justify-center rounded"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500" />
                    </button>
                    <button suppressHydrationWarning
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteThread(thread.id);
                      }}
                      disabled={deletingId === thread.id}
                      className="hover:bg-muted inline-flex h-5 w-5 items-center justify-center rounded hover:text-red-600 disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === thread.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {isRenaming && (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={inputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename();
                      if (e.key === "Escape") cancelRename();
                    }}
                    suppressHydrationWarning
                    className="bg-background border-input focus:ring-ring/40 flex-1 rounded border px-2 py-1 text-xs focus:ring-2 focus:outline-none"
                  />
                  <button suppressHydrationWarning
                    disabled={savingRename}
                    onClick={saveRename}
                    className="bg-primary text-primary-foreground inline-flex h-6 w-6 items-center justify-center rounded hover:brightness-110 disabled:opacity-50"
                  >
                    {savingRename ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button suppressHydrationWarning
                    onClick={cancelRename}
                    className="bg-muted text-muted-foreground inline-flex h-6 w-6 items-center justify-center rounded hover:brightness-110"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="text-muted-foreground/70 mt-1 flex items-center gap-2 text-[10px]">
                <span>{thread.id.slice(0, 6)}</span>
                <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-400">No threads found.</div>
        )}
      </div>

      {/* MCP Configuration Button */}
      <div className="border-t border-gray-200 p-3">
        <button suppressHydrationWarning
          onClick={onOpenMCPConfig}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
        >
          <Settings className="h-4 w-4" />
          Configure MCP Servers
        </button>
      </div>
    </nav>
  );
}