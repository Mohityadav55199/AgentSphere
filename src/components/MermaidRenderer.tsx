"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useUISettings } from "@/contexts/UISettingsContext";

interface MermaidRendererProps {
  code: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const { theme } = useUISettings();

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      setIsRendering(true);
      setError(null);

      try {
        // Dynamically import Mermaid from CDN to prevent heavy SSR bundle overhead
        const cdnUrl = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const importDynamic = new Function("url", "return import(url)");
        const mermaidModule = await importDynamic(cdnUrl);
        const mermaid = mermaidModule.default || mermaidModule;

        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "neutral",
          securityLevel: "loose",
          fontFamily: "inherit",
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const cleanCode = code.trim();
        const { svg } = await mermaid.render(id, cleanCode);

        if (isMounted) {
          setSvgContent(svg);
          setIsRendering(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to render Mermaid diagram");
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
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
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="my-3 rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
        <div className="mb-1 flex items-center justify-between font-semibold">
          <span>⚠️ Diagram Rendering Error</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] hover:underline"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>Copy Mermaid Code</span>
          </button>
        </div>
        <p className="font-mono text-[11px] whitespace-pre-wrap">{error}</p>
        <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-2 font-mono text-[11px] dark:bg-white/5">
          {code}
        </pre>
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
