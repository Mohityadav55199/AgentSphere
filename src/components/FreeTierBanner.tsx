"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Clock, X, RefreshCw } from "lucide-react";

export function FreeTierBanner() {
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "down">("checking");
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkHealth = useCallback(async () => {
    setIsRetrying(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for status ping

    try {
      const res = await fetch("/api/health", {
        signal: controller.signal,
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        // If the database is marked as disconnected, consider it waking/down
        if (data && data.database === "disconnected") {
          setServerStatus("down");
        } else {
          setServerStatus("online");
        }
      } else {
        setServerStatus("down");
      }
    } catch {
      // Timeout, gateway error (502/504), or network error
      setServerStatus("down");
    } finally {
      clearTimeout(timeoutId);
      setIsRetrying(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Periodic polling:
  // If down/waking: poll every 5s so it automatically hides the moment the server comes up.
  // If online: poll every 45s to detect if the server spins down or goes offline.
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    const interval = serverStatus === "down" ? 5000 : 45000;

    pollTimerRef.current = setInterval(() => {
      checkHealth();
    }, interval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [serverStatus, checkHealth]);

  // If server transitions to down, ensure it shows again even if previously dismissed
  useEffect(() => {
    if (serverStatus === "down") {
      setDismissed(false);
    }
  }, [serverStatus]);

  const handleDismiss = () => {
    setDismissed(true);
  };

  // If server is up, checking, or dismissed, hide the bar completely
  if (serverStatus === "online" || serverStatus === "checking" || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Server notice banner"
      className="relative z-20 border-b border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-3 py-2 text-xs text-amber-900 shadow-xs transition-all dark:border-amber-900/60 dark:from-amber-950/80 dark:via-stone-900 dark:to-amber-950/80 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-400/20 dark:text-amber-300">
            <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-600 dark:text-amber-400" />
            Render Free Tier
          </span>

          {/* Main message */}
          <span className="font-normal text-amber-900/90 dark:text-amber-100/90">
            Server is waking up (Render instances spin down after 15 minutes of inactivity).
            Cold starts can take{" "}
            <strong className="font-semibold text-amber-950 dark:text-amber-100">
              50+ seconds
            </strong>
            . This notice will disappear automatically once the server is ready.
          </span>

          {/* Live Status indicator */}
          <div className="ml-auto flex items-center gap-2 sm:ml-2">
            <span
              title="Backend is waking up or starting up"
              className="inline-flex animate-pulse items-center gap-1 rounded-md bg-amber-200/80 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
            >
              <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              Waking up...
            </span>

            <button
              onClick={() => checkHealth()}
              disabled={isRetrying}
              className="cursor-pointer rounded p-1 text-amber-700 hover:bg-amber-200/50 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-900/50 dark:hover:text-amber-100"
              title="Refresh server status"
              aria-label="Refresh server status"
            >
              <RefreshCw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="cursor-pointer rounded-md p-1 text-amber-800/70 transition-colors hover:bg-amber-200/60 hover:text-amber-950 dark:text-amber-300/70 dark:hover:bg-amber-900/50 dark:hover:text-amber-100"
          title="Dismiss notice"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

export default FreeTierBanner;
