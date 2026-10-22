"use client";

import { useRef, useState, useEffect } from "react";
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
  Pin,
  Calendar,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface ThreadListProps {
  onOpenMCPConfig: () => void;
  onToggleSidebar?: () => void;
}

function formatRelativeTime(dateInput: Date | string | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ThreadList({ onOpenMCPConfig, onToggleSidebar }: ThreadListProps) {
  const {
    threads,
    createThread,
    deleteThread,
    clearEmptyThreads,
    togglePinThread,
    refetchThreads,
  } = useThreads();
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingEmpty, setClearingEmpty] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        t.title.toLowerCase().startsWith("thread ")),
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

  const renderThreadItem = (thread: (typeof threads)[number]) => {
    const active = pathname === `/thread/${thread.id}`;
    const isRenaming = renamingId === thread.id;
    return (
      <div
        key={thread.id}
        className={`group relative cursor-pointer rounded-lg border px-3 py-2 text-left transition-all ${
          active
            ? "border-blue-200 bg-blue-50/70 font-medium text-blue-950 shadow-xs dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200"
            : "border-transparent text-gray-700 hover:border-gray-200/80 hover:bg-gray-100/70 dark:text-gray-300 dark:hover:border-gray-800 dark:hover:bg-gray-800/50"
        }`}
        onClick={() => {
          if (!isRenaming) router.push(`/thread/${thread.id}`);
        }}
      >
        {active && (
          <div className="absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400" />
        )}
        {!isRenaming ? (
          <div className="flex items-center justify-between gap-1.5">
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(thread.id, thread.title);
              }}
              className="flex flex-1 items-center gap-1.5 truncate text-xs font-medium"
              title="Double-click to rename"
            >
              {thread.isPinned && (
                <Star className="h-3 w-3 flex-shrink-0 fill-amber-400 text-amber-500" />
              )}
              <span className="truncate">{thread.title || `Thread ${thread.id.slice(0, 8)}`}</span>
            </div>
            <div className="flex items-center gap-0.5 opacity-80 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              <button
                suppressHydrationWarning
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePin(thread.id, thread.isPinned);
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
                title={thread.isPinned ? "Unpin thread" : "Pin thread"}
              >
                <Star
                  className={`h-3 w-3 ${
                    thread.isPinned
                      ? "fill-amber-400 text-amber-500"
                      : "text-gray-400 hover:text-amber-500"
                  }`}
                />
              </button>
              <button
                suppressHydrationWarning
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(thread.id, thread.title);
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
                title="Rename"
              >
                <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
              </button>
              <button
                suppressHydrationWarning
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteThread(thread.id);
                }}
                disabled={deletingId === thread.id}
                className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                title="Delete thread"
              >
                {deletingId === thread.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                )}
              </button>
            </div>
          </div>
        ) : (
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
              className="flex-1 rounded border border-blue-400 bg-white px-2 py-0.5 text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none dark:border-blue-600 dark:bg-gray-800"
            />
            <button
              suppressHydrationWarning
              disabled={savingRename}
              onClick={saveRename}
              className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingRename ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </button>
            <button
              suppressHydrationWarning
              onClick={cancelRename}
              className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
          <span className="font-mono text-[9px] opacity-75">{thread.id.slice(0, 6)}</span>
          <span suppressHydrationWarning>
            {formatRelativeTime(thread.updatedAt || thread.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <nav className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Sidebar Header with Title & Collapse */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-tight text-gray-800 uppercase dark:text-gray-200">
            Chats
          </span>
          <span className="py-0.2 rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
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
          <button
            suppressHydrationWarning
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
          <button
            suppressHydrationWarning
            onClick={handleRefresh}
            className="dark:hover:bg-gray-750 flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
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
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
          <input
            ref={searchInputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats... (/)"
            suppressHydrationWarning
            className="w-full rounded-lg border border-gray-200 bg-gray-50/70 py-1.5 pr-8 pl-8 text-xs text-gray-900 transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100 dark:focus:bg-gray-800"
          />
          {filter ? (
            <button
              type="button"
              onClick={() => setFilter("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <span className="py-0.2 pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-gray-200 bg-gray-100 px-1 font-mono text-[9px] text-gray-400 dark:border-gray-700 dark:bg-gray-800">
              /
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-2 pb-3">
        {/* Render Threads by Groups */}
        {(() => {
          if (filtered.length === 0) {
            return (
              <div className="px-3 py-10 text-center">
                <p className="text-xs text-gray-400">
                  {filter ? `No chats matching "${filter}"` : "No chats yet"}
                </p>
                {filter && (
                  <button
                    type="button"
                    onClick={() => setFilter("")}
                    className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            );
          }

          // If searching, show a flat filtered list
          if (filter.trim()) {
            return (
              <div className="space-y-1">
                <div className="px-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  Search Results ({filtered.length})
                </div>
                {filtered.map(renderThreadItem)}
              </div>
            );
          }

          // Categorized groups by date & pinned
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
          const startOfLast7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

          const pinned = filtered.filter((t) => t.isPinned);
          const unpinned = filtered.filter((t) => !t.isPinned);

          const today = unpinned.filter((t) => {
            const time = new Date(t.updatedAt || t.createdAt).getTime();
            return time >= startOfToday;
          });

          const yesterday = unpinned.filter((t) => {
            const time = new Date(t.updatedAt || t.createdAt).getTime();
            return time >= startOfYesterday && time < startOfToday;
          });

          const pastWeek = unpinned.filter((t) => {
            const time = new Date(t.updatedAt || t.createdAt).getTime();
            return time >= startOfLast7Days && time < startOfYesterday;
          });

          const older = unpinned.filter((t) => {
            const time = new Date(t.updatedAt || t.createdAt).getTime();
            return time < startOfLast7Days;
          });

          const sections = [
            { label: "Pinned", icon: "📌", items: pinned },
            { label: "Today", icon: "📅", items: today },
            { label: "Yesterday", icon: "🕒", items: yesterday },
            { label: "Previous 7 Days", icon: "🗓️", items: pastWeek },
            { label: "Older", icon: "📁", items: older },
          ].filter((s) => s.items.length > 0);

          return sections.map((sec) => (
            <div key={sec.label} className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                <span>{sec.icon}</span>
                <span>{sec.label}</span>
                <span className="text-[9px] opacity-70">({sec.items.length})</span>
              </div>
              {sec.items.map(renderThreadItem)}
            </div>
          ));
        })()}
      </div>

      {/* MCP Configuration Button */}
      <div className="border-t border-gray-100 p-2.5 dark:border-gray-800">
        <button
          suppressHydrationWarning
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
