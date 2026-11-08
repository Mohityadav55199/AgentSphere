import { Children, isValidElement, type ComponentPropsWithoutRef } from "react";
import { Copy, Download } from "lucide-react";
import { MermaidRenderer } from "./MermaidRenderer";
import { reactNodeText } from "@/lib/react-text";

type CodeProps = ComponentPropsWithoutRef<"code"> & { node?: unknown };
type PreProps = ComponentPropsWithoutRef<"pre"> & { node?: unknown };

const EXTENSIONS: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  markdown: "md",
  bash: "sh",
  shell: "sh",
};

function languageOf(className: unknown): string {
  const match = /language-([\w-]+)/.exec(typeof className === "string" ? className : "");
  return match ? match[1].toLowerCase() : "";
}

function CodeBlock({ className, children, node: _node, ...props }: CodeProps) {
  const lang = languageOf(className);
  // Prism has already turned the code into highlighted spans: read the text back out.
  const codeString = reactNodeText(children).replace(/\n$/, "");

  if (lang === "mermaid") {
    return <MermaidRenderer code={codeString} />;
  }

  if (lang) {
    return (
      <div className="my-3 overflow-hidden rounded-xl border border-gray-200 bg-[#0d1117] text-gray-200 shadow-xs dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-800 bg-[#161b22] px-3.5 py-1.5 font-mono text-xs text-gray-400">
          <span className="text-[11px] font-bold tracking-wider text-indigo-400 uppercase">
            {lang}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([codeString], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `code-${Date.now()}.${EXTENSIONS[lang] ?? lang}`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
              className="flex cursor-pointer items-center gap-1 text-[11px] transition-colors hover:text-white"
              title="Download code file"
            >
              <Download size={12} />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(codeString).catch(() => undefined);
              }}
              className="flex cursor-pointer items-center gap-1 text-[11px] transition-colors hover:text-white"
              title="Copy code"
            >
              <Copy size={12} />
              <span>Copy</span>
            </button>
          </div>
        </div>
        <pre className="overflow-x-auto bg-[#0d1117] p-3.5 font-mono text-xs leading-relaxed">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  return (
    <code
      className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.88em] text-indigo-600 dark:bg-gray-800 dark:text-indigo-400"
      {...props}
    >
      {children}
    </code>
  );
}

/**
 * Fenced blocks with a language render their own frame (or a Mermaid diagram), so drop the
 * preview's outer <pre> and its injected copy button; otherwise the diagram ended up inside a
 * monospace, pre-formatted box.
 */
function PreBlock({ children, node: _node, ...props }: PreProps) {
  const code = Children.toArray(children).find(
    (child) =>
      isValidElement(child) && languageOf((child.props as { className?: unknown }).className),
  );
  if (code) return <>{code}</>;
  return <pre {...props}>{children}</pre>;
}

/** Shared `components` for every MDEditor.Markdown that shows model output. */
export const markdownComponents = {
  code: CodeBlock,
  pre: PreBlock,
};
