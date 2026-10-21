"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import rehypeKatex from "rehype-katex";
import { useUISettings } from "@/contexts/UISettingsContext";

interface AgentThoughtAccordionProps {
  icon: string;
  name: string;
  title: string;
  content: string;
  badgeBg: string;
  defaultOpen?: boolean;
}

export const AgentThoughtAccordion: React.FC<AgentThoughtAccordionProps> = ({
  icon,
  name,
  title,
  content,
  badgeBg,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { theme } = useUISettings();

  // Word count summary
  const words = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-gray-200/80 bg-white/70 shadow-2xs backdrop-blur-xs transition-all dark:border-gray-800 dark:bg-gray-900/60">
      {/* Header Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between px-3.5 py-2 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-850/80"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold border ${badgeBg}`}>
            {name}
          </span>
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <span className="text-[10px] font-mono hidden sm:inline">{words} words</span>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50/40 p-3.5 text-xs text-gray-700 dark:border-gray-800/80 dark:bg-gray-950/40 dark:text-gray-300">
          <div
            data-color-mode={theme}
            className="[&_hr]:!my-1 [&_hr]:h-px [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-gray-300 [&_li]:my-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
          >
            <MDEditor.Markdown
              source={content}
              style={{
                backgroundColor: "transparent",
                color: "inherit",
                padding: 0,
                fontSize: "0.88rem",
                lineHeight: "1.55",
              }}
              rehypePlugins={[rehypeKatex]}
            />
          </div>
        </div>
      )}
    </div>
  );
};
