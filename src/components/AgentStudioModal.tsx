import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  RotateCcw,
  Bot,
  Search,
  Code2,
  BarChart3,
  ShieldCheck,
  Check,
} from "lucide-react";

interface AgentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AgentRoleConfig {
  id: string;
  name: string;
  role: string;
  icon: string;
  enabled: boolean;
  temperature: number;
  customPrompt: string;
}

const DEFAULT_COUNCIL_CONFIG: AgentRoleConfig[] = [
  {
    id: "supervisor",
    name: "Supervisor",
    role: "Strategic Decomposition & Synthesis",
    icon: "🎯",
    enabled: true,
    temperature: 0.5,
    customPrompt: "Decompose complex multi-step objectives and synthesize the final deliverable.",
  },
  {
    id: "researcher",
    name: "Researcher",
    role: "Context Retrieval & Real-Time Web Search",
    icon: "🔍",
    enabled: true,
    temperature: 0.3,
    customPrompt: "Gather authoritative documentation, live web data, and technical references.",
  },
  {
    id: "developer",
    name: "Developer",
    role: "Production Code & MCP Tool Execution",
    icon: "💻",
    enabled: true,
    temperature: 0.2,
    customPrompt: "Write clean, modular, production-ready code with complete TypeScript types.",
  },
  {
    id: "analyst",
    name: "Analyst",
    role: "Data Modeling & Mermaid Flowcharts",
    icon: "📊",
    enabled: true,
    temperature: 0.4,
    customPrompt: "Provide quantitative trade-offs and generate interactive Mermaid diagrams.",
  },
  {
    id: "auditor",
    name: "Auditor",
    role: "OWASP Security & Quality Assurance",
    icon: "🛡️",
    enabled: true,
    temperature: 0.2,
    customPrompt: "Audit code against OWASP vulnerabilities, performance bottlenecks, and edge cases.",
  },
];

export const AgentStudioModal: React.FC<AgentStudioModalProps> = ({ isOpen, onClose }) => {
  const [agents, setAgents] = useState<AgentRoleConfig[]>(DEFAULT_COUNCIL_CONFIG);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("supervisor");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load from localStorage if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("agentsphere_council_settings");
      if (saved) {
        try {
          setAgents(JSON.parse(saved));
        } catch {
          // fallback to default
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const updateSelectedAgent = (updates: Partial<AgentRoleConfig>) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === selectedAgentId ? { ...a, ...updates } : a)),
    );
  };

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("agentsphere_council_settings", JSON.stringify(agents));
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleResetDefaults = () => {
    setAgents(DEFAULT_COUNCIL_CONFIG);
    if (typeof window !== "undefined") {
      localStorage.removeItem("agentsphere_council_settings");
    }
  };

  const getRoleIcon = (id: string) => {
    switch (id) {
      case "supervisor":
        return <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "researcher":
        return <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "developer":
        return <Code2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "analyst":
        return <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "auditor":
        return <ShieldCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex h-[580px] w-full max-w-2xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200/70 p-4 dark:border-gray-800/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
              <Sliders size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 sm:text-base dark:text-white">
                5-Agent Council Studio
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Customize persona temperature, system directives, and active specialist roles
              </p>
            </div>
          </div>
          <button
            suppressHydrationWarning
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Agent Role Selector List */}
          <div className="w-1/3 border-r border-gray-200/70 p-3 overflow-y-auto dark:border-gray-800/70">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Council Specialists
            </div>
            <div className="space-y-1.5">
              {agents.map((agent) => (
                <button
                  suppressHydrationWarning
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full flex items-center justify-between rounded-xl p-2.5 text-left text-xs transition-all ${
                    selectedAgentId === agent.id
                      ? "bg-purple-50 font-semibold text-purple-900 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getRoleIcon(agent.id)}
                    <span>{agent.name}</span>
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      agent.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Agent Detail & Controls */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{selectedAgent.icon}</span>
                  <span>{selectedAgent.name} Specialist</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedAgent.role}
                </p>
              </div>

              {/* Toggle Enabled */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedAgent.enabled}
                  onChange={(e) => updateSelectedAgent({ enabled: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span>Active</span>
              </label>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
                <span>Inference Temperature:</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {selectedAgent.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={selectedAgent.temperature}
                onChange={(e) =>
                  updateSelectedAgent({ temperature: parseFloat(e.target.value) })
                }
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0.0 (Strict / Deterministic)</span>
                <span>1.0 (Creative / Exploratory)</span>
              </div>
            </div>

            {/* Custom Directive Prompt */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Custom Role Directive / System Guidelines:
              </label>
              <textarea
                value={selectedAgent.customPrompt}
                onChange={(e) => updateSelectedAgent({ customPrompt: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                placeholder="Enter custom instructions for this agent node..."
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-200/70 p-3.5 dark:border-gray-800/70">
          <button
            suppressHydrationWarning
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              suppressHydrationWarning
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750"
            >
              Cancel
            </button>
            <button
              suppressHydrationWarning
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check size={14} />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Configuration</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
