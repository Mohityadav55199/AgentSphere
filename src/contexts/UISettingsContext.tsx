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

interface UISettingsContextType {
  hideToolMessages: boolean;
  toggleToolMessages: () => void;
  provider: string;
  setProvider: (provider: string) => void;
  model: string;
  setModel: (model: string) => void;
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
}

const UISettingsContext = createContext<UISettingsContextType | undefined>(undefined);

interface UISettingsProviderProps {
  children: ReactNode;
}

export const UISettingsProvider = ({ children }: UISettingsProviderProps) => {
  const [hideToolMessages, setHideToolMessages] = useState(false);
  const [provider, setProviderState] = useState<string>("groq");
  const [model, setModelState] = useState<string>("llama-3.3-70b-versatile");
  const [approveAllTools, setApproveAllToolsState] = useState<boolean>(false);
  const [persona, setPersonaState] = useState<string>("default");
  const [temperature, setTemperatureState] = useState<number>(0.7);
  const [systemPrompt, setSystemPromptState] = useState<string>(PERSONAS.default.prompt);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  // Sync settings from localStorage after client hydration
  useEffect(() => {
    const saved = loadSettings();
    if (typeof saved.provider === "string") setProviderState(saved.provider);
    if (typeof saved.model === "string") setModelState(saved.model);
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
