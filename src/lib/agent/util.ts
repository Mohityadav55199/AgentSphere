import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { DynamicStructuredTool } from "@langchain/core/tools";

export interface CreateChatModelOptions {
  provider?: string; // 'openai' | 'google' | 'anthropic'
  model: string;
  temperature?: number;
}

function isValidKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed !== "" && !trimmed.startsWith("your_") && trimmed !== "missing-api-key";
}

/**
 * Instantiates a single chat model provider
 */
function createSingleModel(
  provider: string,
  modelName: string,
  temperature: number,
): BaseChatModel {
  switch (provider) {
    case "groq": {
      const groqModel =
        !modelName || modelName === "llama-3.3-70b-versatile" ? "openai/gpt-oss-120b" : modelName;
      return new ChatOpenAI({
        model: groqModel,
        temperature,
        streaming: true,
        apiKey: process.env.GROQ_API_KEY || "missing-api-key",
        configuration: {
          baseURL: "https://api.groq.com/openai/v1",
        },
      });
    }
    case "openai":
      return new ChatOpenAI({
        model: modelName || "gpt-4o",
        temperature,
        streaming: true,
        apiKey: process.env.OPENAI_API_KEY || "missing-api-key",
      });
    case "anthropic":
      return new ChatAnthropic({
        model: modelName || "claude-3-5-sonnet-latest",
        temperature,
        streaming: true,
        apiKey: process.env.ANTHROPIC_API_KEY || "missing-api-key",
      });
    case "google":
    default: {
      const googleModel =
        !modelName || modelName === "gemini-3-flash-preview" ? "gemini-2.5-flash" : modelName;
      return new ChatGoogleGenerativeAI({
        model: googleModel,
        temperature,
        streaming: true,
        apiKey: process.env.GOOGLE_API_KEY || "missing-api-key",
      });
    }
  }
}

/**
 * Central factory for creating a chat model with zero-downtime fallback routing.
 * If the primary provider hits a 429 rate limit or outage, it automatically retries with backup models.
 */
export function createChatModel({
  provider = getDefaultProvider(),
  model,
  temperature = 1,
}: CreateChatModelOptions): BaseChatModel {
  const primaryModel = createSingleModel(provider, model, temperature);

  // Build fallback candidates only for providers that have valid API keys
  const fallbackCandidates: BaseChatModel[] = [];
  const providersToCheck = ["google", "groq", "openai", "anthropic"].filter((p) => p !== provider);

  for (const fbProvider of providersToCheck) {
    const isConfigured =
      (fbProvider === "google" && isValidKey(process.env.GOOGLE_API_KEY)) ||
      (fbProvider === "groq" && isValidKey(process.env.GROQ_API_KEY)) ||
      (fbProvider === "openai" && isValidKey(process.env.OPENAI_API_KEY)) ||
      (fbProvider === "anthropic" && isValidKey(process.env.ANTHROPIC_API_KEY));

    if (isConfigured) {
      const fbModelName = getDefaultModel(fbProvider);
      try {
        const fbModel = createSingleModel(fbProvider, fbModelName, temperature);
        fallbackCandidates.push(fbModel);
      } catch {
        // ignore
      }
    }
  }

  // Bind fallback router if candidates are available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (fallbackCandidates.length > 0 && typeof (primaryModel as any).withFallbacks === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (primaryModel as any).withFallbacks({
      fallbacks: fallbackCandidates,
    }) as unknown as BaseChatModel;
  }

  return primaryModel;
}
export interface AgentConfigOptions {
  model?: string;
  provider?: string; // 'google' | 'openai' etc.
  systemPrompt?: string; // system prompt override
  tools?: unknown[]; // tools from registry or direct tool objects
  approveAllTools?: boolean; // if true, skip tool approval prompts
  temperature?: number;
  agentMode?: "single" | "multi";
}

/**
 * JSON Schema keywords that are not supported by Google Gemini's function calling API.
 * These need to be stripped from tool schemas before passing to the LLM.
 */
const UNSUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
  "additionalProperties",
  "patternProperties",
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "if",
  "then",
  "else",
  "contentMediaType",
  "contentEncoding",
  "examples",
  "default",
  "const",
  "readOnly",
  "writeOnly",
  "deprecated",
  "title",
  "format", // Gemini doesn't support format validation
]);

/**
 * Normalizes a JSON Schema type field.
 * Gemini requires type to be a string, not an array.
 * For nullable types like ["string", "null"], we extract the non-null type.
 */
function normalizeType(type: unknown): string | undefined {
  if (typeof type === "string") {
    return type;
  }

  if (Array.isArray(type)) {
    // Filter out "null" and take the first remaining type
    const nonNullTypes = type.filter((t) => t !== "null");
    if (nonNullTypes.length > 0) {
      return nonNullTypes[0] as string;
    }
    // If only "null" types, default to "string"
    return "string";
  }

  return undefined;
}

/**
 * Recursively sanitizes a JSON Schema object by removing unsupported keywords
 * and normalizing values for Google Gemini's function calling API.
 */
function sanitizeSchema(schema: unknown): Record<string, unknown> | unknown {
  // Handle non-object values
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeSchema(item));
  }

  const schemaObj = schema as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schemaObj)) {
    // Skip unsupported keywords
    if (UNSUPPORTED_SCHEMA_KEYWORDS.has(key)) {
      continue;
    }

    // Special handling for "type" field - normalize array types to string
    if (key === "type") {
      const normalizedType = normalizeType(value);
      if (normalizedType) {
        sanitized[key] = normalizedType;
      }
      continue;
    }

    // Special handling for "items" - if it's an array, take first element
    // JSON Schema allows items to be an array for tuple validation, but Gemini doesn't support it
    if (key === "items" && Array.isArray(value)) {
      if (value.length > 0) {
        sanitized[key] = sanitizeSchema(value[0]);
      }
      continue;
    }

    // Special handling for "properties" - preserve all property names (they are not schema keywords),
    // but sanitize each property's sub-schema recursively
    if (key === "properties" && value && typeof value === "object" && !Array.isArray(value)) {
      const propsObj = value as Record<string, unknown>;
      const sanitizedProps: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(propsObj)) {
        sanitizedProps[propName] = sanitizeSchema(propSchema); // sanitize the sub-schema, not the name
      }
      sanitized[key] = sanitizedProps;
      continue;
    }

    // Special handling for "required" - filter out properties that don't exist in "properties"
    if (key === "required" && Array.isArray(value)) {
      const properties = schemaObj["properties"];
      if (properties && typeof properties === "object" && !Array.isArray(properties)) {
        const validProps = Object.keys(properties as Record<string, unknown>);
        const filtered = value.filter(
          (prop) => typeof prop === "string" && validProps.includes(prop),
        );
        if (filtered.length > 0) {
          sanitized[key] = filtered;
        }
      } else {
        sanitized[key] = value;
      }
      continue;
    }

    // Recursively sanitize nested objects and arrays
    if (value && typeof value === "object") {
      sanitized[key] = sanitizeSchema(value);
    } else {
      sanitized[key] = value;
    }
  }

  // Remove empty "properties" object - Gemini rejects tools with no parameters defined
  if (
    "properties" in sanitized &&
    typeof sanitized["properties"] === "object" &&
    sanitized["properties"] !== null &&
    Object.keys(sanitized["properties"] as Record<string, unknown>).length === 0
  ) {
    delete sanitized["properties"];
    delete sanitized["required"]; // required is meaningless without properties
  }

  return sanitized;
}

/**
 * Sanitizes a DynamicStructuredTool's schema to be compatible with Google Gemini.
 * Modifies the tool's schema in place to remove unsupported JSON Schema keywords.
 */
export function sanitizeTool(tool: DynamicStructuredTool): DynamicStructuredTool {
  // Access the schema property and sanitize it
  const originalSchema = tool.schema as Record<string, unknown>;
  const sanitizedSchema = sanitizeSchema(originalSchema) as Record<string, unknown>;

  // Update the tool's schema in place (lc_kwargs contains the constructor args)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tool as any).schema = sanitizedSchema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((tool as any).lc_kwargs?.schema) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).lc_kwargs.schema = sanitizedSchema;
  }

  return tool;
}

export function getDefaultProvider(): string {
  if (isValidKey(process.env.GROQ_API_KEY)) return "groq";
  if (isValidKey(process.env.GOOGLE_API_KEY)) return "google";
  if (isValidKey(process.env.OPENAI_API_KEY)) return "openai";
  if (isValidKey(process.env.ANTHROPIC_API_KEY)) return "anthropic";
  return "google";
}

export function getDefaultModel(provider?: string): string {
  const p = provider || getDefaultProvider();
  switch (p) {
    case "groq":
      return "openai/gpt-oss-120b";
    case "openai":
      return "gpt-4o";
    case "anthropic":
      return "claude-3-5-sonnet-latest";
    case "google":
    default:
      return "gemini-2.5-flash";
  }
}

export const DEFAULT_MODEL_PROVIDER = getDefaultProvider();
export const DEFAULT_MODEL_NAME = getDefaultModel(DEFAULT_MODEL_PROVIDER);
