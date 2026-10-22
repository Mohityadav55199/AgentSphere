import React, { useState, useEffect, useRef } from "react";
import {
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  Plus,
  Download,
  Loader2,
  Sun,
  Moon,
  LogIn,
  LogOut,
  User as UserIcon,
  Server,
  Users,
  Bot,
  Sliders,
  ChevronDown,
  Check,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useUISettings, PERSONAS } from "@/contexts/UISettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useThreads } from "@/hooks/useThreads";
import { useRouter, usePathname } from "next/navigation";
import { ProfileModal } from "@/components/ProfileModal";
import { useMCPTools } from "@/hooks/useMCPTools";
import { ExportStudioModal } from "@/components/ExportStudioModal";
import { AgentStudioModal } from "@/components/AgentStudioModal";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen?: boolean;
  onOpenMCPConfig?: () => void;
}

export const Header = ({ toggleSidebar, isSidebarOpen = true, onOpenMCPConfig }: HeaderProps) => {
  const {
    provider,
    setProvider,
    model,
    setModel,
    activePersona,
    persona,
    setPersona,
    availableProviders,
    theme,
    toggleTheme,
    agentMode,
    setAgentMode,
  } = useUISettings();
  const { user, logout, openAuthModal, checkAuth } = useAuth();
  const { data: mcpToolsData } = useMCPTools();
  const { createThread } = useThreads();
  const router = useRouter();
  const pathname = usePathname();
  const [exporting, setExporting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [exportStudioOpen, setExportStudioOpen] = useState(false);
  const [agentStudioOpen, setAgentStudioOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<"model" | "persona">("model");
  const modelPickerRef = useRef<HTMLDivElement>(null);

  // Close model picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target as Node)) {
        setModelPickerOpen(false);
      }
    }
    if (modelPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modelPickerOpen]);

  const currentThreadId = pathname?.startsWith("/thread/")
    ? pathname.replace("/thread/", "")
    : null;

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
    <header className="sticky top-0 z-10 flex h-14 items-center border-b border-gray-200/70 bg-white/80 px-3 backdrop-blur-md md:px-4 dark:border-gray-800/70 dark:bg-gray-900/80">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            suppressHydrationWarning
            onClick={toggleSidebar}
            className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeft size={19} />}
          </button>

          <Link href="/" className="group flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xs shadow-blue-500/20 transition-transform group-hover:scale-105">
              <Sparkles size={16} />
            </div>
            <span className="hidden text-base font-bold tracking-tight text-gray-900 sm:block dark:text-white">
              AgentSphere
            </span>
          </Link>

          {/* Active Model Pill Badge with Quick-Picker Dropdown */}
          <div className="relative" ref={modelPickerRef}>
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => setModelPickerOpen((prev) => !prev)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100/80 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
              title="Click to quickly switch Model, Provider or Persona"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              </span>
              <span>{activePersona.icon}</span>
              <span className="hidden font-semibold capitalize sm:inline">{provider}</span>
              <span className="hidden text-blue-300 sm:inline dark:text-blue-700">•</span>
              <span className="max-w-[120px] truncate font-mono text-[11px] opacity-90 sm:max-w-[160px]">
                {model}
              </span>
              <ChevronDown
                className={`h-3 w-3 text-blue-500 transition-transform duration-200 ${modelPickerOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Quick Picker Popover Dropdown */}
            {modelPickerOpen && (
              <div className="animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-50 mt-2 w-80 rounded-xl border border-gray-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-md duration-150 sm:w-96 dark:border-gray-800 dark:bg-gray-900/95">
                {/* Header & Tabs */}
                <div className="mb-2.5 flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                  <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
                    <button
                      type="button"
                      onClick={() => setPickerTab("model")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                        pickerTab === "model"
                          ? "bg-white font-semibold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-blue-300"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <Zap size={12} />
                      <span>Model & Provider</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerTab("persona")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                        pickerTab === "persona"
                          ? "bg-white font-semibold text-blue-600 shadow-xs dark:bg-gray-700 dark:text-blue-300"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <span>🎭</span>
                      <span>Persona ({activePersona.name})</span>
                    </button>
                  </div>
                </div>

                {/* Tab 1: Model & Provider Selector */}
                {pickerTab === "model" && (
                  <div className="space-y-3">
                    {/* Providers */}
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                        Provider
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.keys(availableProviders).map((pKey) => {
                          const isSelected = provider === pKey;
                          const pInfo = availableProviders[pKey];
                          return (
                            <button
                              key={pKey}
                              type="button"
                              onClick={() => {
                                setProvider(pKey);
                                if (pInfo?.defaultModel) {
                                  setModel(pInfo.defaultModel);
                                }
                              }}
                              className={`flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium capitalize transition-all ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50/80 text-blue-700 shadow-xs dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300"
                                  : "dark:hover:bg-gray-750 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              <span>{pKey}</span>
                              {isSelected && (
                                <Check size={12} className="text-blue-600 dark:text-blue-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Models for active provider */}
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                        Available Models ({provider})
                      </div>
                      <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                        {(availableProviders[provider]?.models || [model]).map((m) => {
                          const isCurrent = model === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setModel(m);
                                setModelPickerOpen(false);
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-mono text-xs transition-all ${
                                isCurrent
                                  ? "bg-blue-600 font-semibold text-white shadow-xs"
                                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                              }`}
                            >
                              <span className="truncate">{m}</span>
                              {isCurrent && (
                                <Check size={13} className="ml-1.5 shrink-0 text-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Persona Selector */}
                {pickerTab === "persona" && (
                  <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                    {Object.values(PERSONAS).map((p) => {
                      const isCurrent = persona === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPersona(p.id);
                            setModelPickerOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-start gap-2.5 rounded-lg border p-2 text-left transition-all ${
                            isCurrent
                              ? "border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-200"
                              : "dark:bg-gray-850 border-gray-100 bg-white text-gray-800 hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800"
                          }`}
                        >
                          <span className="text-lg">{p.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold">{p.name}</div>
                              {isCurrent && (
                                <Check size={13} className="text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="line-clamp-1 text-[11px] text-gray-500 dark:text-gray-400">
                              {p.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Multi-Agent vs Single Agent Mode Toggle */}
          <div className="flex items-center gap-1">
            <button
              suppressHydrationWarning
              onClick={() => setAgentMode(agentMode === "multi" ? "single" : "multi")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                agentMode === "multi"
                  ? "border-purple-300 bg-purple-50 text-purple-700 shadow-xs dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                  : "dark:hover:bg-gray-750 border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
              title={
                agentMode === "multi"
                  ? "5-Agent Council Mode: Supervisor, Researcher, Developer, Analyst, and Auditor collaborate on every task"
                  : "Single-Agent Mode: Direct conversation with selected persona"
              }
            >
              {agentMode === "multi" ? (
                <>
                  <Users size={14} className="text-purple-600 dark:text-purple-400" />
                  <span className="hidden font-semibold md:inline">5-Agent Council</span>
                  <span className="font-semibold md:hidden">Council</span>
                </>
              ) : (
                <>
                  <Bot size={14} className="text-gray-500 dark:text-gray-400" />
                  <span className="hidden sm:inline">Single Agent</span>
                </>
              )}
            </button>

            {agentMode === "multi" && (
              <button
                suppressHydrationWarning
                onClick={() => setAgentStudioOpen(true)}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 px-2 py-1.5 text-xs font-medium text-purple-700 shadow-xs transition-colors hover:bg-purple-100 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50"
                title="Configure 5-Agent Council Personas, Temperature & System Directives"
              >
                <Sliders size={13} className="text-purple-600 dark:text-purple-400" />
                <span className="hidden lg:inline">Studio</span>
              </button>
            )}
          </div>

          {/* MCP Servers Button */}
          {onOpenMCPConfig && (
            <button
              suppressHydrationWarning
              onClick={onOpenMCPConfig}
              className="dark:hover:bg-gray-750 flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-100 sm:px-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              title="Add and configure Model Context Protocol (MCP) servers"
            >
              <Server size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">MCP Servers</span>
              {(mcpToolsData?.totalCount ?? 0) > 0 && (
                <span className="py-0.2 rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {mcpToolsData?.totalCount}
                </span>
              )}
            </button>
          )}

          {/* Dark / Light Theme Toggle */}
          <button
            suppressHydrationWarning
            onClick={toggleTheme}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-xs transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {currentThreadId && (
            <button
              suppressHydrationWarning
              onClick={() => setExportStudioOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              title="Open Export & Presentation Studio (Markdown, PDF, JSON)"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          )}

          <button
            suppressHydrationWarning
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
                suppressHydrationWarning
                onClick={() => setProfileOpen(true)}
                className="dark:hover:bg-gray-750 flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                title="Account Profile & Password Settings"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white uppercase">
                  {user.name.charAt(0)}
                </span>
                <span className="max-w-[100px] truncate">{user.name}</span>
              </button>
              <button
                suppressHydrationWarning
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
                suppressHydrationWarning
                onClick={() => openAuthModal("login")}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
              <button
                suppressHydrationWarning
                onClick={() => openAuthModal("register")}
                className="dark:hover:bg-gray-750 flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
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

      <ExportStudioModal
        isOpen={exportStudioOpen}
        onClose={() => setExportStudioOpen(false)}
        threadId={currentThreadId}
      />

      <AgentStudioModal isOpen={agentStudioOpen} onClose={() => setAgentStudioOpen(false)} />
    </header>
  );
};

export default Header;
