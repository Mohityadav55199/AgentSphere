import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

// Capture what the markdown pipeline hands to the Mermaid component.
const received: string[] = [];
vi.mock("@/components/MermaidRenderer", () => ({
  MermaidRenderer: ({ code }: { code: string }) => {
    received.push(code);
    return createElement("div", { "data-mermaid": "true" });
  },
}));

const { default: MDEditor } = await import("@uiw/react-md-editor");
const { default: rehypeSanitize } = await import("rehype-sanitize");
const { markdownSanitizeSchema } = await import("@/lib/markdown-sanitize");
const { markdownComponents } = await import("@/components/MarkdownCode");
const { reactNodeText } = await import("@/lib/react-text");

const render = (source: string) =>
  renderToStaticMarkup(
    createElement(MDEditor.Markdown, {
      source,
      rehypePlugins: [[rehypeSanitize, markdownSanitizeSchema]],
      components: markdownComponents,
    }),
  );

describe("markdown code blocks", () => {
  // Regression: Prism highlights mermaid, so String(children) was "[object Object],...".
  it("passes the plain Mermaid source to the diagram renderer", () => {
    received.length = 0;
    const diagram = 'flowchart TD\n  A["Client"] --> B["API (Next.js)"]';
    const html = render("Here:\n\n```mermaid\n" + diagram + "\n```\n");

    expect(received).toEqual([diagram]);
    expect(html).toContain('data-mermaid="true"');
    expect(html).not.toContain("[object Object]");
  });

  it("does not wrap the diagram in the preview's <pre>", () => {
    const html = render("```mermaid\ngraph LR\n  A --> B\n```\n");
    expect(html).not.toMatch(/<pre[^>]*>\s*<div data-mermaid/);
  });

  it("strips raw HTML that could run script", () => {
    const html = render(
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>\n\n<img src=x onerror="alert(1)">',
    );
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("onerror");
  });
});

describe("reactNodeText", () => {
  it("flattens nested elements into text", () => {
    const tree = createElement(
      "span",
      null,
      "const ",
      createElement("span", { className: "token" }, "x"),
      [" = ", 1],
    );
    expect(reactNodeText(tree)).toBe("const x = 1");
  });
});
