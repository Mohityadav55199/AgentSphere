export enum MCPServerType {
  stdio = "stdio",
  http = "http",
}

export interface MCPTool {
  name: string;
  description?: string;
}

export interface MCPServerTools {
  tools: MCPTool[];
  count: number;
}

export interface MCPToolsGrouped {
  [serverName: string]: MCPServerTools;
}

export interface MCPToolsData {
  serverGroups: MCPToolsGrouped;
  totalCount: number;
}
