"use client";
import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./globals.css";
import { ThreadProvider } from "@/contexts/ThreadContext";
import { UISettingsProvider } from "@/contexts/UISettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { OAuthToast } from "@/components/OAuthToast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>AgentSphere</title>
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <UISettingsProvider>
              <ThreadProvider>
                <Suspense fallback={null}>
                  <OAuthToast />
                </Suspense>
                <AuthModal />
                {children}
              </ThreadProvider>
            </UISettingsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
