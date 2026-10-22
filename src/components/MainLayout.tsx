"use client";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { ThreadList } from "./ThreadList";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { MCPServerList } from "./MCPServerList";
import { FreeTierBanner } from "./FreeTierBanner";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  // Sidebar always open by default, can be toggled/hidden when clicked
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showMCPConfig, setShowMCPConfig] = useState(false);

  useEffect(() => {
    // If on a small mobile device (<768px), initialize collapsed to prioritize chat viewport
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
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