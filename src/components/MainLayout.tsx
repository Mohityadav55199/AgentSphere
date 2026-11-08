"use client";
import { ReactNode, useCallback, useState, useSyncExternalStore } from "react";
import { ThreadList } from "./ThreadList";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { MCPServerList } from "./MCPServerList";
import { FreeTierBanner } from "./FreeTierBanner";

interface MainLayoutProps {
  children: ReactNode;
}

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToViewport(onChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function MainLayout({ children }: MainLayoutProps) {
  // Open by default on desktop, collapsed on phones (<768px) to give the chat the full width.
  // The server snapshot is "desktop", matching the server-rendered HTML.
  const isMobile = useSyncExternalStore(
    subscribeToViewport,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
  // null = follow the viewport default until the user toggles explicitly.
  const [userSidebarOpen, setUserSidebarOpen] = useState<boolean | null>(null);
  const isSidebarOpen = userSidebarOpen ?? !isMobile;
  const [showMCPConfig, setShowMCPConfig] = useState(false);

  const toggleSidebar = useCallback(() => setUserSidebarOpen((v) => !(v ?? !isMobile)), [isMobile]);
  const openMCPConfig = useCallback(() => setShowMCPConfig(true), []);
  const closeMCPConfig = useCallback(() => setShowMCPConfig(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar}>
        <ThreadList onOpenMCPConfig={openMCPConfig} onToggleSidebar={toggleSidebar} />
      </Sidebar>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col bg-gray-50/50 dark:bg-gray-950">
        <FreeTierBanner />
        <div className="z-10">
          <Header
            toggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
            onOpenMCPConfig={openMCPConfig}
          />
        </div>

        {/* Main content */}
        <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>

      {/* MCP Configuration Modal */}
      <MCPServerList isOpen={showMCPConfig} onClose={closeMCPConfig} />
    </div>
  );
}
