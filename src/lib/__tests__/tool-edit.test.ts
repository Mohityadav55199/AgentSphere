import { describe, expect, it } from "vitest";
import { applyToolEdit } from "@/lib/agent/util";

const call = (id: string, args: Record<string, unknown> = { q: "original" }) => ({
  id,
  name: "web_search",
  args,
});

describe("applyToolEdit", () => {
  it("replaces args on the call named in the edit", () => {
    const result = applyToolEdit(call("a"), "b", { id: "a", args: { q: "edited" } });
    expect(result.args).toEqual({ q: "edited" });
  });

  it("leaves other parallel calls untouched", () => {
    const other = call("b");
    expect(applyToolEdit(other, "b", { id: "a", args: { q: "edited" } })).toBe(other);
  });

  it("falls back to the interrupted call when no id is given", () => {
    expect(applyToolEdit(call("b"), "b", { args: { q: "edited" } }).args).toEqual({ q: "edited" });
  });

  it("ignores malformed edits", () => {
    const c = call("a");
    expect(applyToolEdit(c, "a", { id: "a", args: ["not", "an", "object"] })).toBe(c);
    expect(applyToolEdit(c, "a", null)).toBe(c);
    expect(applyToolEdit(c, "a", "text")).toBe(c);
  });
});
