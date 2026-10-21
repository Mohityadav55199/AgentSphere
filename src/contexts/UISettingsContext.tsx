"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "agent_model_settings";

function loadSettings(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSetting(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    const current = loadSettings();
    current[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export interface Persona {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompt: string;
}

export const PERSONAS: Record<string, Persona> = {
  default: {
    id: "default",
    name: "General Assistant",
    icon: "✨",
    description: "Versatile AI assistant for everyday tasks",
    prompt: "You are AgentSphere, a helpful, precise, and friendly AI assistant.",
  },
  developer: {
    id: "developer",
    name: "Senior Developer",
    icon: "💻",
    description: "Expert fullstack engineer for clean code & architecture",
    prompt: "You are a Senior Principal Software Engineer. Provide concise, production-ready code with TypeScript types, error handling, and high efficiency.",
  },
  analyst: {
    id: "analyst",
    name: "Data Scientist",
    icon: "📊",
    description: "Specialized in data analysis, statistics & quantitative models",
    prompt: "You are a Lead Data Scientist. Analyze questions using mathematical rigour, clear step-by-step logic, and data insights.",
  },
  writer: {
    id: "writer",
    name: "Content Strategist",
    icon: "✍️",
    description: "Compelling storytelling, marketing & polished writing",
    prompt: "You are an elite Copywriter and Content Strategist. Craft engaging, persuasive, and beautifully structured writing.",
  },
  auditor: {
    id: "auditor",
    name: "Security Auditor",
    icon: "🛡️",
    description: "Security review, vulnerability audit & code optimization",
    prompt: "You are a Cybersecurity Auditor. Review code for security flaws, edge-case bugs, performance bottlenecks, and OWASP vulnerabilities.",
  },
};

export interface ProviderInfo {
  available: boolean;
  defaultModel: string;
  models: string[];
}

interface UISettingsContextType {
  hideToolMessages: boolean;
  toggleToolMessages: () => void;
  provider: string;
  setProvider: (provider: string) => void;
  model: string;
  setModel: (model: string) => void;
  availableProviders: Record<string, ProviderInfo>;
  isLoadingModels: boolean;
  approveAllTools: boolean;
  setApproveAllTools: (v: boolean) => void;
  persona: string;
  setPersona: (persona: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  activePersona: Persona;
  theme: "light" | "dark";
  toggleTheme: () => void;
  agentMode: "single" | "multi";
  setAgentMode: (mode: "single" | "multi") => void;
}

const UISettingsContext = createContext<UISettingsContextType | undefined>(undefined);

interface UISettingsProviderProps {
  children: ReactNode;
}

export const UISettingsProvider = ({ children }: UISettingsProviderProps) => {
  const [hideToolMessages, setHideToolMessages] = useState(false);
  const [provider, setProviderState] = useState<string>("groq");
  const [model, setModelState] = useState<string>("openai/gpt-oss-120b");
  const [availableProviders, setAvailableProviders] = useState<Record<string, ProviderInfo>>({});
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [approveAllTools, setApproveAllToolsState] = useState<boolean>(false);
  const [persona, setPersonaState] = useState<string>("default");
  const [temperature, setTemperatureState] = useState<number>(0.7);
  const [systemPrompt, setSystemPromptState] = useState<string>(PERSONAS.default.prompt);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [agentMode, setAgentModeState] = useState<"single" | "multi">("single");

  // Fetch available models from backend based on API keys
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        const res = await fetch("/api/agent/models");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.providers) {
            setAvailableProviders(data.providers);

            const saved = loadSettings();
            let activeProv = typeof saved.provider === "string" ? saved.provider : data.defaultProvider;
            let activeMod = typeof saved.model === "string" ? saved.model : "";

            // Sanitize invalid or deprecated cached model names
            if (!activeMod || activeMod === "llama-3.3-70b-versatile" || activeMod === "gemini-3-flash-preview") {
              activeMod = data.providers[activeProv]?.defaultModel || data.defaultModel;
              saveSetting("model", activeMod);
            }

            // If selected provider isn't available, fallback to available default
            if (!data.providers[activeProv]?.available && data.defaultProvider) {
              activeProv = data.defaultProvider;
              activeMod = data.defaultModel;
              saveSetting("provider", activeProv);
              saveSetting("model", activeMod);
            }

            setProviderState(activeProv);
            setModelState(activeMod);
          }
        }
      } catch (err) {
        console.error("Failed to load models configuration:", err);
      } finally {
        if (isMounted) setIsLoadingModels(false);
      }
    }

    loadModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync settings from localStorage after client hydration
  useEffect(() => {
    const saved = loadSettings();
    if (typeof saved.provider === "string") setProviderState(saved.provider);
    if (typeof saved.model === "string") {
      const sanitized =
        saved.model === "llama-3.3-70b-versatile"
          ? "openai/gpt-oss-120b"
          : saved.model === "gemini-3-flash-preview"
            ? "gemini-2.5-flash"
            : saved.model;
      setModelState(sanitized);
    }
    if (typeof saved.approveAllTools === "boolean") setApproveAllToolsState(saved.approveAllTools);
    if (typeof saved.persona === "string" && PERSONAS[saved.persona]) {
      setPersonaState(saved.persona);
      if (typeof saved.systemPrompt !== "string") {
        setSystemPromptState(PERSONAS[saved.persona].prompt);
      }
    }
    if (typeof saved.temperature === "number") setTemperatureState(saved.temperature);
    if (typeof saved.systemPrompt === "string") setSystemPromptState(saved.systemPrompt);
    if (typeof saved.theme === "string" && (saved.theme === "light" || saved.theme === "dark")) {
      setThemeState(saved.theme);
      if (saved.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    if (saved.agentMode === "single" || saved.agentMode === "multi") {
      setAgentModeState(saved.agentMode);
    }
  }, []);

  const toggleToolMessages = () => setHideToolMessages((prev) => !prev);
  const setProvider = (v: string) => {
    setProviderState(v);
    saveSetting("provider", v);
  };
  const setModel = (v: string) => {
    setModelState(v);
    saveSetting("model", v);
  };
  const setApproveAllTools = (v: boolean) => {
    setApproveAllToolsState(v);
    saveSetting("approveAllTools", v);
  };
  const setPersona = (p: string) => {
    setPersonaState(p);
    saveSetting("persona", p);
    const newPrompt = PERSONAS[p]?.prompt || PERSONAS.default.prompt;
    setSystemPromptState(newPrompt);
    saveSetting("systemPrompt", newPrompt);
  };
  const setTemperature = (t: number) => {
    setTemperatureState(t);
    saveSetting("temperature", t);
  };
  const setSystemPrompt = (s: string) => {
    setSystemPromptState(s);
    saveSetting("systemPrompt", s);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setThemeState(nextTheme);
    saveSetting("theme", nextTheme);
    if (typeof document !== "undefined") {
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const setAgentMode = (mode: "single" | "multi") => {
    setAgentModeState(mode);
    saveSetting("agentMode", mode);
  };

  const activePersona = PERSONAS[persona] || PERSONAS.default;

  return (
    <UISettingsContext.Provider
      value={{
        hideToolMessages,
        toggleToolMessages,
        provider,
        setProvider,
        model,
        setModel,
        availableProviders,
        isLoadingModels,
        approveAllTools,
        setApproveAllTools,
        persona,
        setPersona,
        temperature,
        setTemperature,
        systemPrompt,
        setSystemPrompt,
        activePersona,
        theme,
        toggleTheme,
        agentMode,
        setAgentMode,
      }}
    >
      {children}
    </UISettingsContext.Provider>
  );
};

export const useUISettings = () => {
  const context = useContext(UISettingsContext);
  if (context === undefined) {
    throw new Error("useUISettings must be used within a UISettingsProvider");
  }
  return context;
};