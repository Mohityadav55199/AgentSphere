"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/MainLayout";
import { useThreads } from "@/hooks/useThreads";
import { Thread } from "@/components/Thread";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { threads, createThread, isLoadingThreads } = useThreads();
  const router = useRouter();
  const [rootThreadId, setRootThreadId] = useState<string | null>(null);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    // Wait until threads query finishes loading
    if (isLoadingThreads) return;

    if (threads.length > 0 && !rootThreadId) {
      setRootThreadId(threads[0].id);
    } else if (threads.length === 0 && !rootThreadId && !isCreatingRef.current) {
      // Only create a thread if the user has absolutely 0 threads
      isCreatingRef.current = true;
      createThread()
        .then((t) => {
          setRootThreadId(t.id);
        })
        .finally(() => {
          isCreatingRef.current = false;
        });
    }
  }, [threads, rootThreadId, isLoadingThreads, createThread]);

  return (
    <MainLayout>
      {rootThreadId ? (
        <Thread
          threadId={rootThreadId}
          onFirstMessageSent={(id) => router.replace(`/thread/${id}`)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      )}
    </MainLayout>
  );
}