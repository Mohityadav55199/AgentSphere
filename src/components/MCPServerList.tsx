"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit, Trash2, Server, Globe, Loader2, RefreshCcw, Link2 } from "lucide-react";
import { MCPServerForm } from "./MCPServerForm";
import { OAuthStatusBadge, type OAuthStatusType } from "./OAuthStatusBadge";
import { MCPServerType } from "@/types/mcp";
import { useQueryClient } from "@tanstack/react-query";
import { OAuthStatus } from "@/lib/mcp/oauth-detection";

interface MCPServer {
  id: string;
  name: string;
  type: MCPServerType;
  enabled: boolean;
  command?: string;
  args?: unknown[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  // OAuth fields
  requiresAuth?: boolean;
  oauthStatus?: OAuthStatusType;
  createdAt: string;
  updatedAt: string;
}

interface MCPServerListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MCPServerList({ isOpen, onClose }: MCPServerListProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const fetchServers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mcp-servers");
      if (response.ok) {
        const data = await response.json();
        setServers(data);
      }
    } catch (error) {
      console.error("Failed to fetch MCP servers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServers();
    }
  }, [isOpen]);

  const toggleServer = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/mcp-servers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      if (response.ok) {
        setServers(servers.map((s) => (s.id === id ? { ...s, enabled } : s)));
        // Invalidate MCP tools cache to reload tools after server toggle
        queryClient.invalidateQueries({ queryKey: ["mcp-tools"] });
      }
    } catch (error) {
      console.error("Failed to toggle server:", error);
    }
  };

  const deleteServer = async (id: string, serverName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the MCP server "${serverName}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/mcp-servers?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setServers(servers.filter((s) => s.id !== id));
        // Invalidate MCP tools cache to reload tools after server deletion
        queryClient.invalidateQueries({ queryKey: ["mcp-tools"] });
      }
    } catch (error) {
      console.error("Failed to delete server:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const checkAndConnectOAuth = async (serverId: string) => {
    setConnectingId(serverId);
    try {
      const response = await fetch(`/api/oauth/check/${serverId}`);
      const data = await response.json();

      if (data.authorizationUrl) {
        // Store current path to return after OAuth
        sessionStorage.setItem("oauth_return_path", window.location.pathname);
        // Redirect to OAuth authorization
        window.location.href = data.authorizationUrl;
      } else if (data.error) {
        console.error("[OAuth] Error from API:", data.error);
      } else {
        // Update local state with OAuth status
        setServers((prevServers) =>
          prevServers.map((s) => {
            if (s.id !== serverId) return s;
            let newStatus: OAuthStatusType;
            if (data.connected) {
              newStatus = OAuthStatus.CONNECTED;
            } else if (s.oauthStatus === OAuthStatus.REQUIRED) {
              // Preserve REQUIRED status if we are still not connected
              newStatus = OAuthStatus.REQUIRED;
            } else {
              newStatus = OAuthStatus.NOT_REQUIRED;
            }
            return {
              ...s,
              oauthStatus: newStatus,
            };
          }),
        );
        // Invalidate MCP tools cache if connected
        if (data.connected) {
          queryClient.invalidateQueries({ queryKey: ["mcp-tools"] });
        }
      }
    } catch (error) {
      console.error("[OAuth] Failed to check/connect OAuth:", error);
    } finally {
      setConnectingId(null);
    }
  };

  const handleFormSaved = () => {
    fetchServers();
    setShowForm(false);
    setEditingServer(undefined);
    // Invalidate MCP tools cache to reload tools after server addition/edit
    queryClient.invalidateQueries({ queryKey: ["mcp-tools"] });
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingServer(undefined);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">MCP Servers</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manage connected Model Context Protocol servers & tools</p>
            </div>
            <div className="flex items-center gap-2">
              <button suppressHydrationWarning
                onClick={() => setShowForm(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
              >
                <Plus size={15} />
                Add MCP Server
              </button>
              <button suppressHydrationWarning
                onClick={fetchServers}
                disabled={loading}
                className="flex cursor-pointer items-center gap-1 rounded-md p-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                title="Refresh servers"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCcw size={16} />
                )}
              </button>
              <button suppressHydrationWarning
                onClick={onClose}
                className="cursor-pointer rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading && servers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : servers.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                <Server size={44} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <p className="text-base font-semibold text-gray-800 dark:text-gray-200">No MCP servers configured yet</p>
                <p className="mt-1 text-xs">Add your first MCP server (Fetch, SQLite, Brave, Memory) to empower your agents with tools.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <Plus size={14} /> Add First Server
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {servers.map((server) => (
                  <div
                    key={server.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-850 dark:hover:border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                          {server.type === "stdio" ? (
                            <Server size={18} className="text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Globe size={18} className="text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{server.name}</h3>
                            {server.type === "http" && (
                              <OAuthStatusBadge status={server.oauthStatus} />
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono uppercase dark:bg-gray-800 dark:text-gray-300">
                              {server.type}
                            </span>
                            <span className="font-mono text-[11px] truncate max-w-md">
                              {server.type === "stdio" ? server.command : server.url}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Connect button for HTTP servers that require OAuth */}
                      {server.type === "http" &&
                        (server.oauthStatus === "REQUIRED" ||
                          server.oauthStatus === "EXPIRED" ||
                          server.oauthStatus === "UNKNOWN") && (
                          <button suppressHydrationWarning
                            onClick={() => checkAndConnectOAuth(server.id)}
                            disabled={connectingId === server.id}
                            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Connect with OAuth"
                          >
                            {connectingId === server.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Link2 size={14} />
                            )}
                            Connect
                          </button>
                        )}

                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={server.enabled}
                          onChange={(e) => toggleServer(server.id, e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="peer peer-checked:bg-primary peer-focus:ring-ring/40 h-5 w-9 rounded-full bg-gray-200 peer-focus:ring-4 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                      </label>

                      <button suppressHydrationWarning
                        onClick={() => {
                          setEditingServer(server);
                          setShowForm(true);
                        }}
                        className="cursor-pointer p-1.5 text-gray-400 transition-colors hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>

                      <button suppressHydrationWarning
                        onClick={() => deleteServer(server.id, server.name)}
                        disabled={deletingId === server.id}
                        className="cursor-pointer p-1.5 text-red-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === server.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <MCPServerForm
        isOpen={showForm}
        onClose={handleFormClose}
        onSaved={handleFormSaved}
        server={editingServer}
      />
    </>
  );
}