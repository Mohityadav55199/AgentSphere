"use client";

import React, { useState, useEffect } from "react";
import { Zap, Clock, X, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

export function FreeTierBanner() {
  const [dismissed, setDismissed] = useState<boolean>(true); // start true to prevent SSR hydration flicker
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "waking">("checking");
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed in this browser session
    const isDismissed = sessionStorage.getItem("agentsphere_render_free_tier_banner_dismissed");
    if (!isDismissed) {
      setDismissed(false);
    }

    // Ping health endpoint to verify warm/awake status
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setIsRetrying(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for quick status

    try {
      const res = await fetch("/api/health", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (res.ok) {
        setServerStatus("online");
      } else {
        setServerStatus("waking");
      }
    } catch {
      // If request timed out or network error, backend is likely cold/spinning up
      setServerStatus("waking");
    } finally {
      clearTimeout(timeoutId);
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("agentsphere_render_free_tier_banner_dismissed", "true");
  };

  if (dismissed) {
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
            Hosted on Render&apos;s free tier. The instance spins down after 15 minutes of
            inactivity and may take{" "}
            <strong className="font-semibold text-amber-950 dark:text-amber-100">
              50+ seconds to wake up
            </strong>
            . Please be patient on cold starts!
          </span>

          {/* Live Status indicator */}
          <div className="ml-auto flex items-center gap-2 sm:ml-2">
            {serverStatus === "online" ? (
              <span
                title="Server is responding normally"
                className="inline-flex items-center gap-1 rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                Server Online
              </span>
            ) : serverStatus === "waking" ? (
              <span
                title="Backend is waking up or starting up"
                className="inline-flex animate-pulse items-center gap-1 rounded-md bg-amber-200/80 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
              >
                <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                Waking up...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/60 px-2 py-0.5 text-[11px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <RefreshCw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />
                Checking status...
              </span>
            )}

            <button
              onClick={checkHealth}
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
          title="Dismiss notice for this session"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
export default FreeTierBanner;
