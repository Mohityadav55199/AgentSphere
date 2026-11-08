"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface ToastState {
  type: "success" | "error";
  message: string;
}

function toastFromParams(params: URLSearchParams): ToastState | null {
  const serverName = params.get("server");
  if (params.get("oauth_success") === "true") {
    return {
      type: "success",
      message: serverName
        ? `Successfully connected to "${serverName}"`
        : "OAuth connection successful",
    };
  }
  const oauthError = params.get("oauth_error");
  return oauthError ? { type: "error", message: `OAuth error: ${oauthError}` } : null;
}

export function OAuthToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // useSearchParams makes this subtree client-rendered, so reading the URL in the initial
  // state is safe (no hydration mismatch) and avoids copying it into state from an effect.
  const [toast, setToast] = useState<ToastState | null>(() =>
    toastFromParams(new URLSearchParams(searchParams.toString())),
  );
  const hasOAuthResult = searchParams.has("oauth_success") || searchParams.has("oauth_error");

  // Clean up the OAuth params and go back to where the flow was started.
  useEffect(() => {
    if (!hasOAuthResult) return;
    const returnPath = sessionStorage.getItem("oauth_return_path") || "/";
    sessionStorage.removeItem("oauth_return_path");
    // Only same-site paths: never follow a stored absolute or protocol-relative URL.
    const safePath = returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : "/";
    router.replace(safePath, { scroll: false });
  }, [hasOAuthResult, router]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div className="animate-in slide-in-from-top-2 fade-in fixed top-4 right-4 z-50 duration-300">
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${
          isSuccess
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 size={20} className="flex-shrink-0 text-green-600" />
        ) : (
          <XCircle size={20} className="flex-shrink-0 text-red-600" />
        )}
        <p className="text-sm font-medium">{toast.message}</p>
        <button
          suppressHydrationWarning
          onClick={() => setToast(null)}
          className="ml-2 flex-shrink-0 cursor-pointer text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
