import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT, withCurrentDate } from "@/lib/agent/prompt";

describe("withCurrentDate", () => {
  it("appends the given date to any prompt (including persona prompts)", () => {
    const out = withCurrentDate("You are a Senior Developer.", new Date("2026-11-08T10:00:00Z"));
    expect(out).toBe("You are a Senior Developer.\n\nCurrent date: 2026-11-08 (YYYY-MM-DD).");
  });

  it("is not baked into the default prompt at import time", () => {
    expect(SYSTEM_PROMPT).not.toMatch(/Current date:/);
  });
});
