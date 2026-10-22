"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Loader2,
  Wand2,
  Sparkles,
  Server,
  Globe,
  Terminal,
  Code2,
  Plus,
  Trash2,
} from "lucide-react";
import { MCPServerType } from "@/types/mcp";

interface MCPServer {
  id?: string;
  name: string;
  type: MCPServerType;
  enabled: boolean;
  command?: string;
  args?: unknown[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

interface MCPServerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  server?: MCPServer;
}

interface PresetServer {
  id: string;
  name: string;
  description: string;
  type: MCPServerType;
  icon: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

const MCP_PRESETS: PresetServer[] = [
  {
    id: "fetch",
    name: "web-fetch",
    description: "Fetch web pages and convert HTML to markdown for research",
    type: "stdio",
    icon: "🌐",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
  },
  {
    id: "sqlite",
    name: "sqlite-db",
    description: "Query and inspect SQLite database tables and execute SQL",
    type: "stdio",
    icon: "🗄️",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "./database.sqlite"],
  },
  {
    id: "memory",
    name: "memory-store",
    description: "Knowledge graph memory server for persisting entity relationships",
    type: "stdio",
    icon: "🧠",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
  },
  {
    id: "filesystem",
    name: "local-files",
    description: "Read, write, and search files in an allowed directory",
    type: "stdio",
    icon: "📁",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
  },
  {
    id: "brave-search",
    name: "brave-search",
    description: "Web search via Brave Search API",
    type: "stdio",
    icon: "🔍",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: { BRAVE_API_KEY: "your_brave_api_key_here" },
  },
  {
    id: "remote-http",
    name: "remote-mcp",
    description: "Connect to any remote MCP HTTP / Server-Sent Events (SSE) server",
    type: "http",
    icon: "☁️",
    url: "http://localhost:8000/mcp",
    headers: { Authorization: "Bearer your_token" },
  },
];

export function MCPServerForm({ isOpen, onClose, onSaved, server }: MCPServerFormProps) {
  const [activeTab, setActiveTab] = useState<"form" | "presets" | "json">("form");

  // Visual Form state
  const [name, setName] = useState(server?.name || "");
  const [type, setType] = useState<MCPServerType>(server?.type || "stdio");
  const [command, setCommand] = useState(server?.command || "npx");
  const [argsString, setArgsString] = useState(
    Array.isArray(server?.args) ? server.args.join(" ") : "",
  );
  const [url, setUrl] = useState(server?.url || "");
  const [envPairs, setEnvPairs] = useState<Array<{ key: string; value: string }>>([]);
  const [headerPairs, setHeaderPairs] = useState<Array<{ key: string; value: string }>>([]);

  // Raw JSON state
  const [jsonInput, setJsonInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when editing an existing server
  useEffect(() => {
    if (server) {
      setName(server.name);
      setType(server.type);
      setCommand(server.command || "npx");
      setArgsString(Array.isArray(server.args) ? server.args.join(" ") : "");
      setUrl(server.url || "");

      if (server.env) {
        setEnvPairs(Object.entries(server.env).map(([k, v]) => ({ key: k, value: String(v) })));
      } else {
        setEnvPairs([]);
      }

      if (server.headers) {
        setHeaderPairs(
          Object.entries(server.headers).map(([k, v]) => ({ key: k, value: String(v) })),
        );
      } else {
        setHeaderPairs([]);
      }

      // Populate JSON representation
      const config: Record<string, unknown> = { transport: server.type };
      if (server.type === "stdio") {
        config.command = server.command;
        if (server.args) config.args = server.args;
        if (server.env) config.env = server.env;
      } else {
        config.url = server.url;
        if (server.headers) config.headers = server.headers;
      }
      setJsonInput(JSON.stringify({ mcpServers: { [server.name]: config } }, null, 2));
    } else {
      // Defaults for new server
      setName("");
      setType("stdio");
      setCommand("npx");
      setArgsString("-y @modelcontextprotocol/server-fetch");
      setUrl("http://localhost:8000/mcp");
      setEnvPairs([]);
      setHeaderPairs([]);
      setJsonInput(
        JSON.stringify(
          {
            mcpServers: {
              web_fetch: {
                transport: "stdio",
                command: "npx",
                args: ["-y", "@modelcontextprotocol/server-fetch"],
              },
            },
          },
          null,
          2,
        ),
      );
    }
  }, [server]);

  // Load a preset into the form
  const applyPreset = (preset: PresetServer) => {
    setName(preset.name);
    setType(preset.type);
    if (preset.type === "stdio") {
      setCommand(preset.command || "npx");
      setArgsString(preset.args ? preset.args.join(" ") : "");
      if (preset.env) {
        setEnvPairs(Object.entries(preset.env).map(([k, v]) => ({ key: k, value: v })));
      } else {
        setEnvPairs([]);
      }
    } else {
      setUrl(preset.url || "http://localhost:8000/mcp");
      if (preset.headers) {
        setHeaderPairs(Object.entries(preset.headers).map(([k, v]) => ({ key: k, value: v })));
      } else {
        setHeaderPairs([]);
      }
    }
    setActiveTab("form");
  };

  const handleSaveVisual = async () => {
    setSaving(true);
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Server name is required");
      setSaving(false);
      return;
    }

    let parsedArgs: string[] | undefined = undefined;
    if (type === "stdio" && argsString.trim()) {
      // Split arguments while respecting simple quotes
      parsedArgs =
        argsString
          .match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)
          ?.map((a) => a.replace(/^["']|["']$/g, "")) || [];
    }

    const envMap: Record<string, string> = {};
    envPairs.forEach((p) => {
      if (p.key.trim()) envMap[p.key.trim()] = p.value;
    });

    const headerMap: Record<string, string> = {};
    headerPairs.forEach((p) => {
      if (p.key.trim()) headerMap[p.key.trim()] = p.value;
    });

    const serverData = {
      name: cleanName,
      type,
      command: type === "stdio" ? command.trim() : null,
      args: type === "stdio" ? parsedArgs : null,
      env: type === "stdio" && Object.keys(envMap).length > 0 ? envMap : null,
      url: type === "http" ? url.trim() : null,
      headers: type === "http" && Object.keys(headerMap).length > 0 ? headerMap : null,
    };

    try {
      const method = server ? "PATCH" : "POST";
      const body = server ? { ...serverData, id: server.id } : serverData;

      const response = await fetch("/api/mcp-servers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save server: ${cleanName}`);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save MCP server");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJson = async () => {
    setSaving(true);
    setError(null);

    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
        throw new Error("Invalid format: missing mcpServers object");
      }

      const serverEntries = Object.entries(parsed.mcpServers);
      if (serverEntries.length === 0) {
        throw new Error("No servers defined inside mcpServers");
      }

      for (const [sName, config] of serverEntries) {
        const serverConfig = config as Record<string, unknown>;
        const transport = (serverConfig.transport as string) || "stdio";

        const serverData = {
          name: sName,
          type: transport as MCPServerType,
          command: transport === "stdio" ? (serverConfig.command as string) : undefined,
          args: transport === "stdio" ? (serverConfig.args as unknown[]) : undefined,
          env: transport === "stdio" ? (serverConfig.env as Record<string, string>) : undefined,
          url: transport === "http" ? (serverConfig.url as string) : undefined,
          headers:
            transport === "http" ? (serverConfig.headers as Record<string, string>) : undefined,
        };

        const method = server ? "PATCH" : "POST";
        const body = server ? { ...serverData, id: server.id } : serverData;

        const response = await fetch("/api/mcp-servers", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to save server: ${sName}`);
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Server size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {server ? "Edit MCP Server" : "Create & Connect MCP Server"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Model Context Protocol tools allow AI agents to execute local commands and API
                queries.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 px-6 pt-2 dark:border-gray-800 dark:bg-gray-900/50">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "form"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Wand2 size={14} />
            Visual Form
          </button>

          <button
            onClick={() => setActiveTab("presets")}
            className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "presets"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Sparkles size={14} />
            1-Click Presets
          </button>

          <button
            onClick={() => setActiveTab("json")}
            className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "json"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Code2 size={14} />
            Raw JSON (Claude/Cursor)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {/* TAB 1: VISUAL FORM */}
          {activeTab === "form" && (
            <div className="space-y-4">
              {/* Server Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Server Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. web-fetch, sqlite-db, brave-search"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Transport Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Transport Type
                </label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType("stdio")}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      type === "stdio"
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <Terminal size={15} />
                    <span>Local CLI Command (stdio)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("http")}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                      type === "http"
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <Globe size={15} />
                    <span>Remote URL (HTTP / SSE)</span>
                  </button>
                </div>
              </div>

              {/* Stdio Specifics */}
              {type === "stdio" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Executable Command *
                    </label>
                    <input
                      type="text"
                      placeholder="npx, python, node, uvx, or /path/to/binary"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Arguments
                    </label>
                    <input
                      type="text"
                      placeholder="-y @modelcontextprotocol/server-sqlite --db-path ./database.sqlite"
                      value={argsString}
                      onChange={(e) => setArgsString(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Space-delimited arguments. Arguments with spaces can be enclosed in quotes.
                    </p>
                  </div>

                  {/* Environment Variables */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Environment Variables (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => setEnvPairs([...envPairs, { key: "", value: "" }])}
                        className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Plus size={12} /> Add Variable
                      </button>
                    </div>
                    {envPairs.map((pair, idx) => (
                      <div key={idx} className="mb-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="KEY"
                          value={pair.key}
                          onChange={(e) => {
                            const updated = [...envPairs];
                            updated[idx].key = e.target.value;
                            setEnvPairs(updated);
                          }}
                          className="w-1/3 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="VALUE"
                          value={pair.value}
                          onChange={(e) => {
                            const updated = [...envPairs];
                            updated[idx].value = e.target.value;
                            setEnvPairs(updated);
                          }}
                          className="flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setEnvPairs(envPairs.filter((_, i) => i !== idx))}
                          className="cursor-pointer text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* HTTP Specifics */
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Remote Server URL *
                    </label>
                    <input
                      type="url"
                      placeholder="http://localhost:8000/mcp or https://example.com/sse"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Headers */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Custom Headers (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => setHeaderPairs([...headerPairs, { key: "", value: "" }])}
                        className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Plus size={12} /> Add Header
                      </button>
                    </div>
                    {headerPairs.map((pair, idx) => (
                      <div key={idx} className="mb-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Header-Name"
                          value={pair.key}
                          onChange={(e) => {
                            const updated = [...headerPairs];
                            updated[idx].key = e.target.value;
                            setHeaderPairs(updated);
                          }}
                          className="w-1/3 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Header-Value"
                          value={pair.value}
                          onChange={(e) => {
                            const updated = [...headerPairs];
                            updated[idx].value = e.target.value;
                            setHeaderPairs(updated);
                          }}
                          className="flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setHeaderPairs(headerPairs.filter((_, i) => i !== idx))}
                          className="cursor-pointer text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: 1-CLICK PRESETS */}
          {activeTab === "presets" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MCP_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="group dark:bg-gray-850 flex cursor-pointer flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-gray-800 dark:hover:border-blue-500"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{preset.icon}</span>
                      <h3 className="text-xs font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {preset.name}
                      </h3>
                      <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600 uppercase dark:bg-gray-800 dark:text-gray-300">
                        {preset.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {preset.description}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] font-semibold text-blue-600 dark:border-gray-800 dark:text-blue-400">
                    <span>Click to use preset</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: RAW JSON */}
          {activeTab === "json" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Claude Desktop / Cursor Compatible JSON
                </span>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(jsonInput);
                      setJsonInput(JSON.stringify(parsed, null, 2));
                      setValidationError(null);
                    } catch (err) {
                      setValidationError(err instanceof Error ? err.message : "Invalid JSON");
                    }
                  }}
                  className="cursor-pointer text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Format JSON
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-gray-300 bg-gray-950 p-3 font-mono text-xs text-emerald-400 shadow-inner focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              {validationError && <p className="text-xs text-red-500">{validationError}</p>}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={activeTab === "json" ? handleSaveJson : handleSaveVisual}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save & Connect Server</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MCPServerForm;
