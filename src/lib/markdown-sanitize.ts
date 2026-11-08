import { defaultSchema } from "rehype-sanitize";
import type { Options as SanitizeSchema } from "rehype-sanitize";

/**
 * The markdown preview (@uiw/react-markdown-preview) always enables rehype-raw, so raw HTML in an
 * LLM reply would be rendered as real DOM (e.g. `<iframe srcdoc="<script>…">`). Replies can be
 * steered by prompt injection from web pages or MCP tools, so they are untrusted: sanitize them.
 *
 * Based on GitHub's schema, plus the class names this app relies on.
 */
export const markdownSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Code blocks: `language-*` drives syntax highlighting, Mermaid and KaTeX (`language-math`).
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./]],
    // GitHub-style alerts (> [!NOTE]) produced by remark-github-blockquote-alert.
    div: [...(defaultSchema.attributes?.div ?? []), ["className", /^markdown-alert/]],
    p: [...(defaultSchema.attributes?.p ?? []), ["className", /^markdown-alert/]],
  },
};
