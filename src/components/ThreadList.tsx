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
  PanelLeftClose,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface ThreadListProps {
  onOpenMCPConfig: () => void;
  onToggleSidebar?: () => void;
}

export function ThreadList({ onOpenMCPConfig, onToggleSidebar }: ThreadListProps) {
  const { threads, createThread, deleteThread, clearEmptyThreads, togglePinThread, refetchThreads } = useThreads();
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingEmpty, setClearingEmpty] = useState(false);
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

  const handleClearEmptyChats = async () => {
    if (!confirm("Delete all empty and untitled chats?")) return;
    setClearingEmpty(true);
    try {
      const count = await clearEmptyThreads();
      if (count > 0) {
        alert(`Cleaned up ${count} empty chat${count === 1 ? "" : "s"}.`);
      } else {
        alert("No empty chats to delete.");
      }
    } catch (e) {
      console.error("Clear empty chats failed", e);
      alert("Failed to clear empty chats.");
    } finally {
      setClearingEmpty(false);
    }
  };

  const hasEmptyChats = threads.some(
    (t) =>
      !t.isPinned &&
      (!t.title ||
        t.title === "New thread" ||
        t.title === "Untitled thread" ||
        t.title === "New chat" ||
        t.title.toLowerCase().startsWith("thread "))
  );

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
      // If deleted current thread, navigate to home
      if (pathname === `/thread/${threadId}`) {
        router.push("/");
      }
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
    <nav className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Sidebar Header with Title & Collapse */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-tight text-gray-800 uppercase dark:text-gray-200">
            Chats
          </span>
          <span className="rounded-full bg-gray-100 px-1.5 py-0.2 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {threads.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {hasEmptyChats && (
            <button
              suppressHydrationWarning
              onClick={handleClearEmptyChats}
              disabled={clearingEmpty}
              className="cursor-pointer rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              title="Delete all empty & untitled chats"
              aria-label="Delete all empty chats"
            >
              {clearingEmpty ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {onToggleSidebar && (
            <button
              suppressHydrationWarning
              onClick={onToggleSidebar}
              className="cursor-pointer rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              title="Hide sidebar"
              aria-label="Hide sidebar"
            >
              <X className="h-4 w-4 md:hidden" />
              <PanelLeftClose className="hidden h-4 w-4 md:block" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 px-3 pt-2.5 pb-2">
        <div className="flex gap-1.5">
          <button suppressHydrationWarning
            onClick={handleCreateThread}
            disabled={isCreating}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SquarePen className="h-3.5 w-3.5" />
            )}
            <span>New Chat</span>
          </button>
          <button suppressHydrationWarning
            onClick={handleRefresh}
            className="flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-750 dark:hover:text-white"
            title="Refresh threads list"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div className="group relative">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats..."
            suppressHydrationWarning
            className="w-full rounded-lg border border-gray-200 bg-gray-50/70 py-1.5 pr-2.5 pl-8 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100 dark:focus:bg-gray-800"
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
                  <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
                    <button suppressHydrationWarning
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(thread.id, thread.isPinned);
                      }}
                      className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
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
                      className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
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
                      className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400 disabled:opacity-50"
                      title="Delete thread"
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
                    className="flex-1 rounded border border-blue-400 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-blue-600 dark:bg-gray-800"
                  />
                  <button suppressHydrationWarning
                    disabled={savingRename}
                    onClick={saveRename}
                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingRename ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button suppressHydrationWarning
                    onClick={cancelRename}
                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                <span className="font-mono">{thread.id.slice(0, 6)}</span>
                <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>
                  {new Date(thread.updatedAt || thread.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-400">No chats found.</div>
        )}
      </div>

      {/* MCP Configuration Button */}
      <div className="border-t border-gray-100 p-2.5 dark:border-gray-800">
        <button suppressHydrationWarning
          onClick={onOpenMCPConfig}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <Settings className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          <span>MCP Tools & Servers</span>
        </button>
      </div>
    </nav>
  );
}