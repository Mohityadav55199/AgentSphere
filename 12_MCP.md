# 12 — Model Context Protocol (MCP) Implementation

## 1. What is the Model Context Protocol (MCP)?
The Model Context Protocol (created by Anthropic) is an open industry standard that connects AI models to external tools, context, and data sources securely.
Instead of writing custom API integrations for every service (e.g. GitHub, Postgres, Slack, Jira), MCP provides a standardized client-server protocol over **JSON-RPC 2.0**.

---

## 2. MCP Transports in AgentSphere (`src/lib/mcp/`)

1. **STDIO Transport (`StdioClientTransport`)**:
   - The AgentSphere backend spawns a local subprocess via `child_process.spawn(command, args)`.
   - Communicates via standard input (`stdin`) and standard output (`stdout`).
   - Example: Running a local SQLite or filesystem tool (`npx -y @modelcontextprotocol/server-filesystem /path`).

2. **HTTP / SSE Transport (`SSEClientTransport`)**:
   - Connects to remote or containerized MCP servers over HTTP/SSE.
   - Example: Connecting to a hosted PostgreSQL MCP server or weather API.

---

## 3. Tool Discovery & Dynamic Conversion (`src/lib/agent/mcp.ts`)
1. **Fetch Configured Servers**: Reads all `enabled: true` records from `prisma.mCPServer`.
2. **Connect & Discover**: Connects client transports and calls `mcpClient.listTools()`.
3. **Convert to LangChain DynamicTool**: Converts MCP tool definitions (input schemas, names, descriptions) into `@langchain/core/tools` `DynamicTool` instances.
4. **Bind to LLM**: Passes the tools into `model.bindTools(tools)`.
5. **Execution**: When the LLM chooses to call an MCP tool, `ToolNode` executes `mcpClient.callTool({ name, arguments })` and returns the output to the agent loop.
