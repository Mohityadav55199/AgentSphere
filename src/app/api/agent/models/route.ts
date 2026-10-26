import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed !== "" && !trimmed.startsWith("your_") && trimmed !== "missing-api-key";
}

const PROVIDER_CONFIGS: Record<
  string,
  {
    defaultModel: string;
    fallbackModels: string[];
    envKey: string;
  }
> = {
  groq: {
    defaultModel: "openai/gpt-oss-120b",
    fallbackModels: [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "qwen/qwen3.6-27b",
      "groq/compound",
      "groq/compound-mini",
    ],
    envKey: "GROQ_API_KEY",
  },
  google: {
    defaultModel: "gemini-2.5-flash",
    fallbackModels: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    envKey: "GOOGLE_API_KEY",
  },
  openai: {
    defaultModel: "gpt-4o",
    fallbackModels: ["gpt-4o", "gpt-4o-mini", "o3-mini", "gpt-4-turbo"],
    envKey: "OPENAI_API_KEY",
  },
  anthropic: {
    defaultModel: "claude-3-5-sonnet-latest",
    fallbackModels: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
    envKey: "ANTHROPIC_API_KEY",
  },
};

async function fetchGroqModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return PROVIDER_CONFIGS.groq.fallbackModels;
    const data = await res.json();
    if (Array.isArray(data?.data)) {
      const models = data.data
        .map((m: { id: string }) => m.id)
        .filter((id: string) => {
          // Filter out audio, whisper, and guard models
          const lower = id.toLowerCase();
          return (
            !lower.includes("whisper") && !lower.includes("guard") && !lower.includes("orpheus")
          );
        });
      if (models.length > 0) {
        return models;
      }
    }
  } catch (err) {
    console.error("Failed to fetch Groq models:", err);
  }
  return PROVIDER_CONFIGS.groq.fallbackModels;
}

export async function GET() {
  const providers: Record<
    string,
    {
      available: boolean;
      defaultModel: string;
      models: string[];
    }
  > = {};

  let defaultProvider = "google";
  let defaultModel = "gemini-2.5-flash";
  let foundDefault = false;

  for (const [providerName, config] of Object.entries(PROVIDER_CONFIGS)) {
    const key =
      providerName === "google"
        ? process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        : process.env[config.envKey];
    const available = isValidKey(key);

    let models = config.fallbackModels;
    if (available && providerName === "groq" && key) {
      models = await fetchGroqModels(key);
    }

    const providerDefault = models[0] || config.defaultModel;

    providers[providerName] = {
      available,
      defaultModel: providerDefault,
      models,
    };

    if (available && !foundDefault) {
      defaultProvider = providerName;
      defaultModel = providerDefault;
      foundDefault = true;
    }
  }

  return NextResponse.json({
    providers,
    defaultProvider,
    defaultModel,
  });
}
