"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Maximize2, Minimize2, RefreshCw, AlertTriangle, Code2 } from "lucide-react";
import { useUISettings } from "@/contexts/UISettingsContext";

interface MermaidRendererProps {
  code: string;
}

/**
 * Sanitizes and fixes common LLM-generated Mermaid syntax issues:
 * 1. Strips accidental markdown backticks
 * 2. Strips introductory chat text before the diagram keyword
 * 3. Auto-quotes node labels containing parentheses or slashes (e.g. `[Node (details)]` -> `["Node (details)"]`)
 */
function sanitizeMermaidCode(raw: string): string {
  let text = raw.trim();

  // Strip markdown code fences if wrapped
  text = text.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/, "");

  // Diagram initiation keywords
  const validKeywords = [
    "graph",
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "stateDiagram-v2",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "quadrantChart",
    "requirementDiagram",
    "gitGraph",
    "C4Context",
    "mindmap",
    "timeline",
    "sankey-beta",
    "zenuml",
  ];

  const lines = text.split("\n");
  const firstKeywordIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return validKeywords.some((kw) => trimmed.startsWith(kw));
  });

  if (firstKeywordIndex > 0) {
    text = lines.slice(firstKeywordIndex).join("\n");
  }

  // Auto-quote square bracket node labels with parentheses or slashes that aren't quoted:
  // e.g. A[4.5 Proxy Route (src/routes/proxy.ts)] -> A["4.5 Proxy Route (src/routes/proxy.ts)"]
  text = text.replace(/\[([^"\]\r\n]*[\(\)\/][^"\]\r\n]*)\]/g, '["$1"]');

  return text.trim();
}

/**
 * Removes any stray Mermaid error elements that Mermaid 11 injects into document.body
 */
function cleanupMermaidDOMArtifacts(id?: string) {
  if (typeof document === "undefined") return;
  try {
    if (id) {
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove();
    }
    // Remove any rogue mermaid error svgs or containers attached directly to document.body
    const rogueElements = document.querySelectorAll(
      'body > svg[id^="dmermaid-"], body > div[id^="dmermaid-"], body > svg[id*="mermaid-"], body > div.mermaid-error'
    );
    rogueElements.forEach((el) => el.remove());
  } catch {
    // Ignore cleanup errors
  }
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const [showRawCode, setShowRawCode] = useState(false);
  const { theme } = useUISettings();

  useEffect(() => {
    let isMounted = true;
    const currentId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

    const renderDiagram = async () => {
      setIsRendering(true);
      setError(null);

      // Clean up any existing body-level rogue elements before rendering
      cleanupMermaidDOMArtifacts();

      try {
        const cleanCode = sanitizeMermaidCode(code);
        if (!cleanCode) {
          throw new Error("Empty Mermaid diagram definition");
        }

        // Dynamically import Mermaid from CDN to prevent heavy SSR bundle overhead
        const cdnUrl = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const importDynamic = new Function("url", "return import(url)");
        const mermaidModule = await importDynamic(cdnUrl);
        const mermaid = mermaidModule.default || mermaidModule;

        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: theme === "dark" ? "dark" : "neutral",
          securityLevel: "loose",
          fontFamily: "inherit",
        });

        // Validate syntax with parse first if available
        if (typeof mermaid.parse === "function") {
          try {
            const parseResult = await mermaid.parse(cleanCode, { suppressErrors: true });
            if (parseResult === false) {
              throw new Error("Mermaid syntax validation failed.");
            }
          } catch (parseErr) {
            cleanupMermaidDOMArtifacts(currentId);
            throw parseErr;
          }
        }

        const { svg } = await mermaid.render(currentId, cleanCode);

        // Immediately clean up temporary render container if still attached to body
        cleanupMermaidDOMArtifacts(currentId);

        if (isMounted) {
          setSvgContent(svg);
          setIsRendering(false);
        }
      } catch (err) {
        cleanupMermaidDOMArtifacts(currentId);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to render Mermaid diagram");
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
      cleanupMermaidDOMArtifacts(currentId);
    };
  }, [code, theme]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (error) {
    return (
      <div className="my-3 rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 text-xs text-amber-900 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Mermaid Diagram (Syntax Note)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawCode(!showRawCode)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-gray-600 hover:bg-amber-100/60 dark:text-gray-300 dark:hover:bg-amber-900/40"
            >
              <Code2 size={12} />
              <span>{showRawCode ? "Hide Code" : "View Code"}</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-gray-600 hover:bg-amber-100/60 dark:text-gray-300 dark:hover:bg-amber-900/40"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
        <p className="mt-1 font-mono text-[11px] text-amber-700/80 dark:text-amber-300/80">
          Diagram could not be rendered due to a syntax format issue in the model response.
        </p>
        {showRawCode && (
          <pre className="mt-2.5 max-h-48 overflow-x-auto rounded-lg bg-gray-900 p-2.5 font-mono text-[11px] text-gray-200 dark:bg-black/40">
            {code}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div
      className={`my-3 overflow-hidden rounded-xl border transition-all ${
        isExpanded
          ? "fixed inset-4 z-50 flex flex-col bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          : "border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      {/* Diagram Toolbar */}
      <div className="dark:bg-gray-850 flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-3 py-1.5 text-xs dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            📊 Architecture Diagram
          </span>
          <span className="py-0.2 rounded bg-indigo-100 px-1.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            Mermaid
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="py-0.8 flex cursor-pointer items-center gap-1 rounded px-2 text-gray-600 hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-gray-800"
            title="Copy raw Mermaid code"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={handleDownloadSVG}
            disabled={!svgContent}
            className="py-0.8 flex cursor-pointer items-center gap-1 rounded px-2 text-gray-600 hover:bg-gray-200/60 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
            title="Download diagram as SVG"
          >
            <Download size={13} />
            <span className="text-[11px]">SVG</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="py-0.8 flex cursor-pointer items-center gap-1 rounded px-2 text-gray-600 hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-gray-800"
            title={isExpanded ? "Exit fullscreen" : "Expand diagram fullscreen"}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className={`flex items-center justify-center overflow-auto p-4 ${
          isExpanded ? "flex-1" : "max-h-[500px]"
        }`}
      >
        {isRendering ? (
          <div className="flex items-center gap-2 py-8 text-xs text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Rendering diagram...</span>
          </div>
        ) : (
          <div
            className="flex w-full justify-center [&_svg]:h-auto [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
};
