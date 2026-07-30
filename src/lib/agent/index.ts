import { DEFAULT_SYSTEM_PROMPT as SYSTEM_PROMPT } from "./prompt";
import { postgresCheckpointer } from "./memory";
import type { DynamicTool, StructuredToolInterface } from "@langchain/core/tools";
import {
  AgentConfigOptions,
  createChatModel,
  DEFAULT_MODEL_NAME,
  DEFAULT_MODEL_PROVIDER,
} from "./util";
import { getMCPTools } from "./mcp";
import { AgentBuilder } from "./builder";

let setupPromise: Promise<void> | null = null;

// Cache agent by serialized config — recreate only when settings change
let agentCache: { agent: Awaited<ReturnType<typeof createAgent>>; key: string } | null = null;

/**
 * One-time initialization for the Postgres checkpointer.
 * Ensures the underlying table/extension are ready before any agent runs.
 * This is called automatically when creating an agent via `getAgent` or `ensureAgent`.
 */
async function setupOnce() {
  if (!setupPromise) {
    setupPromise = (async () => {
      const chk = postgresCheckpointer as { setup?: () => Promise<void> };
      if (chk && typeof chk.setup === "function") {
        await chk.setup();
      }
    })().catch((err) => {
      // Reset so a future call can retry if initial setup failed.
      setupPromise = null;
      console.error("Failed to setup checkpointer:", err);
      throw err;
    });
  }
  await setupPromise;
}

/**
 * Create a new agent instance with the given configuration.
 * @param cfg Configuration options for the agent
 * @returns
 */
async function createAgent(cfg?: AgentConfigOptions) {
  // Resolve model/provider from cfg or defaults.
  const provider = cfg?.provider || DEFAULT_MODEL_PROVIDER;
  const modelName = cfg?.model || DEFAULT_MODEL_NAME;
  const temperature = cfg?.temperature ?? 0.7;
  const llm = createChatModel({ provider, model: modelName, temperature });

  // Load MCP tools
  const mcpTools = await getMCPTools();
  const configTools = (cfg?.tools || []) as StructuredToolInterface[];
  const allTools = [...configTools, ...mcpTools] as DynamicTool[];

  const agent = new AgentBuilder({
    llm,
    tools: allTools,
    prompt: cfg?.systemPrompt || SYSTEM_PROMPT,
    checkpointer: postgresCheckpointer,
    approveAllTools: cfg?.approveAllTools || false,
  }).build();

  return agent;
}

// Public helper if explicit readiness is ever needed elsewhere.
export async function ensureAgent(cfg?: AgentConfigOptions) {
  // Ensure checkpointer is ready before returning an agent instance.
  await setupOnce();

  // Serialize config for cache key (exclude non-deterministic fields)
  const key = JSON.stringify({
    model: cfg?.model,
    provider: cfg?.provider,
    tools: cfg?.tools,
    approveAllTools: cfg?.approveAllTools,
    temperature: cfg?.temperature,
    systemPrompt: cfg?.systemPrompt,
  });

  if (!agentCache || agentCache.key !== key) {
    agentCache = { agent: await createAgent(cfg), key };
  }
  return agentCache.agent;
}

// Named export to explicitly fetch a configured agent.
export async function getAgent(cfg?: AgentConfigOptions) {
  return ensureAgent(cfg);
}

// Export function to fetch default agent on demand
export async function getDefaultAgent() {
  return ensureAgent();
}
