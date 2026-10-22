import React from "react";
import { Zap, DollarSign, Clock, ShieldCheck } from "lucide-react";

interface TelemetryBarProps {
  content: string;
  modelName?: string;
  provider?: string;
  hasAuditorCheck?: boolean;
}

// Pricing per million tokens (blended input/output estimate)
const MODEL_PRICING_PER_MILLION: Record<string, number> = {
  "llama-3.3-70b-versatile": 0.59,
  "llama3-70b-8192": 0.59,
  "gemini-2.5-flash": 0.15,
  "gemini-1.5-flash": 0.15,
  "gemini-1.5-pro": 1.25,
  "gpt-4o": 2.5,
  "gpt-4o-mini": 0.15,
  "claude-3-5-sonnet": 3.0,
  "claude-3-haiku": 0.25,
  default: 0.5,
};

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  content,
  modelName = "llama-3.3-70b-versatile",
  provider = "groq",
  hasAuditorCheck = true,
}) => {
  // Approximate tokens from character & word count (~4 characters per token)
  const estimatedTokens = Math.max(12, Math.round(content.length / 3.8));

  // Determine model price per million
  const pricePerMillion =
    MODEL_PRICING_PER_MILLION[modelName.toLowerCase()] ||
    (provider === "google"
      ? 0.15
      : provider === "openai"
        ? 2.5
        : provider === "anthropic"
          ? 3.0
          : MODEL_PRICING_PER_MILLION.default);

  const estimatedCost = (estimatedTokens * (pricePerMillion / 1_000_000)).toFixed(5);

  // Latency estimation heuristic based on token length and provider
  const estimatedLatency = Math.max(0.4, estimatedTokens / 450).toFixed(1);

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 select-none dark:text-gray-400">
      {/* Token Pill */}
      <span
        className="inline-flex items-center gap-1 rounded-md border border-gray-200/80 bg-gray-50/80 px-2 py-0.5 font-mono dark:border-gray-800 dark:bg-gray-900/60"
        title="Estimated tokens generated in this response"
      >
        <Zap className="h-3 w-3 text-amber-500" />
        <span>~{estimatedTokens.toLocaleString()} tokens</span>
      </span>

      {/* FinOps Cost Pill */}
      <span
        className="inline-flex items-center gap-0.5 rounded-md border border-gray-200/80 bg-gray-50/80 px-2 py-0.5 font-mono dark:border-gray-800 dark:bg-gray-900/60"
        title="Estimated LLM inference cost based on published API pricing"
      >
        <DollarSign className="h-3 w-3 text-emerald-500" />
        <span>${estimatedCost}</span>
      </span>

      {/* Latency Pill */}
      <span
        className="inline-flex items-center gap-1 rounded-md border border-gray-200/80 bg-gray-50/80 px-2 py-0.5 font-mono dark:border-gray-800 dark:bg-gray-900/60"
        title="Approximate generation & tool execution latency"
      >
        <Clock className="h-3 w-3 text-blue-500" />
        <span>~{estimatedLatency}s</span>
      </span>

      {/* Auditor Security Badge */}
      {hasAuditorCheck && (
        <span
          className="inline-flex items-center gap-1 rounded-md border border-indigo-200/80 bg-indigo-50/80 px-2 py-0.5 font-medium text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
          title="Reviewed and validated by Chief Auditor agent"
        >
          <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
          <span>Council Verified</span>
        </span>
      )}
    </div>
  );
};
