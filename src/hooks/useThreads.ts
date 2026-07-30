import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Thread } from "@/types/message";
import { fetchThreads, createNewThread, deleteThread, updateThread } from "@/services/chatService";
import { useThreadContext } from "@/contexts/ThreadContext";

export interface UseThreadsReturn {
  threads: Thread[];
  activeThreadId: string | null;
  isLoadingThreads: boolean;
  threadError: Error | null;
  createThread: () => Promise<Thread>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  togglePinThread: (threadId: string, isPinned: boolean) => Promise<void>;
  switchThread: (threadId: string) => void;
  refetchThreads: () => Promise<unknown>;
}

export function useThreads(): UseThreadsReturn {
  const queryClient = useQueryClient();
  const { activeThreadId, setActiveThreadId } = useThreadContext();

  const {
    data: threads = [],
    isLoading: isLoadingThreads,
    error: threadError,
    refetch: refetchThreadsQuery,
  } = useQuery<Thread[]>({
    queryKey: ["threads"],
    queryFn: () => fetchThreads(),
  });

  const createThread = useCallback(async () => {
    // Delegate to backend; optimistic append after create
    const created = await createNewThread();
    queryClient.setQueryData(["threads"], (old: Thread[] = []) => [created, ...old]);
    setActiveThreadId(created.id);
    return created;
  }, [queryClient, setActiveThreadId]);

  const deleteThreadCallback = useCallback(
    async (threadId: string) => {
      await deleteThread(threadId);
      // Remove from cache optimistically
      queryClient.setQueryData(["threads"], (old: Thread[] = []) =>
        old.filter((thread) => thread.id !== threadId),
      );
      // If we're deleting the active thread, clear the active thread
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
      // Clear messages cache for the deleted thread
      queryClient.removeQueries({ queryKey: ["messages", threadId] });
    },
    [queryClient, setActiveThreadId, activeThreadId],
  );

  const renameThread = useCallback(
    async (threadId: string, title: string) => {
      const updated = await updateThread({ id: threadId, title });
      queryClient.setQueryData(["threads"], (old: Thread[] = []) =>
        old.map((t) => (t.id === threadId ? updated : t)),
      );
    },
    [queryClient],
  );

  const togglePinThread = useCallback(
    async (threadId: string, isPinned: boolean) => {
      const updated = await updateThread({ id: threadId, isPinned });
      queryClient.setQueryData(["threads"], (old: Thread[] = []) => {
        const next = old.map((t) => (t.id === threadId ? updated : t));
        return next.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      });
    },
    [queryClient],
  );

  const switchThread = useCallback(
    (threadId: string) => {
      setActiveThreadId(threadId);
    },
    [setActiveThreadId],
  );

  return {
    threads,
    activeThreadId,
    isLoadingThreads,
    threadError: threadError as Error | null,
    createThread,
    deleteThread: deleteThreadCallback,
    renameThread,
    togglePinThread,
    switchThread,
    refetchThreads: refetchThreadsQuery,
  };
}
