import { isValidElement, type ReactNode } from "react";

/**
 * Plain text of rendered React children.
 *
 * The markdown preview runs Prism (rehype-prism-plus) over code blocks, so a custom `code`
 * component receives highlighted `<span>` elements rather than a string. `String(children)` then
 * yields "[object Object],…": Mermaid could never parse it (diagrams always failed) and the
 * Copy/Save buttons on code blocks produced garbage. Walk the tree and collect the text instead.
 */
export function reactNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(reactNodeText).join("");
  if (isValidElement(node)) {
    return reactNodeText((node.props as { children?: ReactNode }).children);
  }
  return "";
}
