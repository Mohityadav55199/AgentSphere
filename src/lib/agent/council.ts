/**
 * Agent Studio settings for the 5-agent council. Shared by the browser (Agent Studio modal,
 * request building) and the server (multi-agent graph), so this file must stay dependency-free.
 */

export const COUNCIL_ROLES = [
  "supervisor",
  "researcher",
  "developer",
  "analyst",
  "auditor",
] as const;
export type CouncilRole = (typeof COUNCIL_ROLES)[number];

export interface CouncilAgentSettings {
  id: CouncilRole;
  enabled: boolean;
  temperature: number;
  customPrompt: string;
}

export const COUNCIL_STORAGE_KEY = "agentsphere_council_settings";
export const MAX_COUNCIL_PROMPT_LENGTH = 2_000;

/** The Developer produces the actual answer and runs MCP tools, so it cannot be switched off. */
export const REQUIRED_COUNCIL_ROLES: readonly CouncilRole[] = ["developer"];

function isRole(value: unknown): value is CouncilRole {
  return typeof value === "string" && (COUNCIL_ROLES as readonly string[]).includes(value);
}

/** Validate and normalise untrusted settings (from localStorage or a request body). */
export function normalizeCouncilSettings(input: unknown): CouncilAgentSettings[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const byRole = new Map<CouncilRole, CouncilAgentSettings>();
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const { id, enabled, temperature, customPrompt } = item as Record<string, unknown>;
    if (!isRole(id) || byRole.has(id)) continue;
    const temp =
      typeof temperature === "number" && Number.isFinite(temperature) ? temperature : 0.7;
    byRole.set(id, {
      id,
      enabled: REQUIRED_COUNCIL_ROLES.includes(id) ? true : enabled !== false,
      temperature: Math.min(Math.max(temp, 0), 2),
      customPrompt:
        typeof customPrompt === "string"
          ? customPrompt.trim().slice(0, MAX_COUNCIL_PROMPT_LENGTH)
          : "",
    });
  }
  return byRole.size > 0 ? COUNCIL_ROLES.flatMap((r) => byRole.get(r) ?? []) : undefined;
}

/** Browser only: the settings saved from Agent Studio, if the user ever saved any. */
export function readSavedCouncilSettings(): CouncilAgentSettings[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(COUNCIL_STORAGE_KEY);
    return raw ? normalizeCouncilSettings(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}
