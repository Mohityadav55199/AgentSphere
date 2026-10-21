import { ChevronDown, ChevronUp, Settings, Server, Users, Bot, Sparkles } from "lucide-react";
import { ModelConfiguration } from "./ModelConfiguration";
import { useMCPTools } from "@/hooks/useMCPTools";
import { useUISettings } from "@/contexts/UISettingsContext";

interface SettingsPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  provider: string;
  setProvider: (provider: string) => void;
  model: string;
  setModel: (model: string) => void;
  onOpenMCPConfig?: () => void;
}

export const SettingsPanel = ({
  isExpanded,
  onToggle,
  provider,
  setProvider,
  model,
  setModel,
  onOpenMCPConfig,
}: SettingsPanelProps) => {
  const { data: mcpToolsData } = useMCPTools();
  const { agentMode, setAgentMode } = useUISettings();

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Settings Header */}
      <button suppressHydrationWarning
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        aria-expanded={isExpanded}
        aria-label="Toggle settings panel"
      >
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
          {!isExpanded && (
            <>
              <span className="text-xs text-gray-500">
                {provider} / {model}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${agentMode === "multi" ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                {agentMode === "multi" ? "Multi-Agent" : "Single"}
              </span>
              {(mcpToolsData?.totalCount ?? 0) > 0 && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  • {mcpToolsData?.totalCount ?? 0} MCP tools
                </span>
              )}
            </>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Settings Content */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-2 px-4 pb-3 duration-200">
          <div className="space-y-3">
            {/* Multi-Agent Architecture Mode */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Agent Execution Architecture
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAgentMode("single")}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-all ${
                    agentMode === "single"
                      ? "border-blue-600 bg-blue-50/60 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-semibold shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  <Bot size={15} />
                  <span>Single Agent</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAgentMode("multi")}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-all ${
                    agentMode === "multi"
                      ? "border-purple-600 bg-purple-50/60 text-purple-700 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300 font-semibold shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  <Users size={15} className="text-purple-600 dark:text-purple-400" />
                  <span>Multi-Agent Team</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {agentMode === "multi"
                  ? "👥 Supervisor decomposes tasks, Specialist executes code/MCP tools, and Critic verifies."
                  : "⚡ Standard direct conversation with selected single persona."}
              </p>
            </div>

            {/* Model Configuration */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                AI Model
              </label>
              <ModelConfiguration
                provider={provider}
                setProvider={setProvider}
                model={model}
                setModel={setModel}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};