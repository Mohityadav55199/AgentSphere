import React, { useState } from "react";
import { PanelLeftClose, Sparkles, Plus, Download, Loader2, Sun, Moon, LogIn, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useUISettings } from "@/contexts/UISettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useThreads } from "@/hooks/useThreads";
import { useRouter, usePathname } from "next/navigation";
import { ProfileModal } from "@/components/ProfileModal";

interface HeaderProps {
  toggleSidebar: () => void;
}

export const Header = ({ toggleSidebar }: HeaderProps) => {
  const { provider, model, activePersona, theme, toggleTheme } = useUISettings();
  const { user, logout, openAuthModal, checkAuth } = useAuth();
  const { createThread } = useThreads();
  const router = useRouter();
  const pathname = usePathname();
  const [exporting, setExporting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const currentThreadId = pathname?.startsWith("/thread/") ? pathname.replace("/thread/", "") : null;

  const handleNewChat = async () => {
    const thread = await createThread();
    router.push(`/thread/${thread.id}`);
  };

  const handleExportMarkdown = async () => {
    if (!currentThreadId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/agent/history/${currentThreadId}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const messages = await res.json();

      let mdContent = `# AgentSphere Conversation\n*Thread ID: ${currentThreadId}*\n*Persona: ${activePersona.name}*\n*Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;
      for (const msg of messages) {
        const role =
          msg.type === "human" ? "👤 User" : msg.type === "ai" ? "🤖 AgentSphere AI" : "🛠️ Tool";
        const content =
          typeof msg.data?.content === "string"
            ? msg.data.content
            : JSON.stringify(msg.data?.content || "");
        mdContent += `### ${role}\n${content}\n\n`;
      }

      const blob = new Blob([mdContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agentsphere-chat-${currentThreadId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error", e);
      alert("Failed to export conversation history.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex items-center border-b border-gray-200/60 bg-white/75 px-4 py-2.5 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-900/75">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Toggle navigation"
          >
            <PanelLeftClose size={20} />
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105">
              <Sparkles size={18} />
            </div>
            <span className="hidden text-lg font-bold tracking-tight text-gray-900 sm:block dark:text-white">
              AgentSphere
            </span>
          </Link>

          {/* Active Model Pill Badge */}
          <div suppressHydrationWarning className="hidden items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-xs font-medium text-blue-700 md:flex dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            <span>{activePersona.icon}</span>
            <span className="capitalize">{provider}</span>
            <span className="text-blue-300 dark:text-blue-700">•</span>
            <span className="font-mono text-[11px] opacity-90">{model}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark / Light Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-xs transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {currentThreadId && (
            <button
              onClick={handleExportMarkdown}
              disabled={exporting}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              title="Export chat as Markdown"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Export</span>
            </button>
          )}

          <button
            onClick={handleNewChat}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
          >
            <Plus size={15} />
            <span>New Chat</span>
          </button>

          {/* User Auth Profile / Buttons */}
          {user ? (
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2 dark:border-gray-800">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
                title="Account Profile & Password Settings"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white uppercase">
                  {user.name.charAt(0)}
                </span>
                <span className="max-w-[100px] truncate">{user.name}</span>
              </button>
              <button
                onClick={() => logout()}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-red-400"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2 dark:border-gray-800">
              <button
                onClick={() => openAuthModal("login")}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => openAuthModal("register")}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-750"
              >
                <UserIcon size={14} />
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={user}
        onUserUpdated={() => {
          checkAuth();
        }}
      />
    </header>
  );
};

export default Header;
