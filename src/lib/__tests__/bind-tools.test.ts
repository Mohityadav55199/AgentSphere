import { describe, expect, it, vi } from "vitest";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { bindModelTools } from "@/lib/agent/util";

/** Fake chat model: bindTools returns a tagged runnable so we can see what got bound. */
function fakeModel(name: string) {
  const model = {
    name,
    bindTools: vi.fn((tools: unknown[]) => ({
      boundFrom: name,
      tools,
      withFallbacks: vi.fn((args: { fallbacks: unknown[] }) => ({
        primary: name,
        fallbacks: args.fallbacks,
      })),
    })),
  };
  return model;
}

const tools = [{ name: "web_search" }];

describe("bindModelTools", () => {
  it("returns the model untouched when there are no tools", () => {
    const model = fakeModel("a");
    expect(bindModelTools(model as unknown as BaseChatModel, [])).toBe(model);
    expect(model.bindTools).not.toHaveBeenCalled();
  });

  it("binds tools directly on a plain chat model", () => {
    const model = fakeModel("a");
    const bound = bindModelTools(model as unknown as BaseChatModel, tools) as unknown as {
      boundFrom: string;
    };
    expect(model.bindTools).toHaveBeenCalledWith(tools, undefined);
    expect(bound.boundFrom).toBe("a");
  });

  // Regression: RunnableWithFallbacks (primary + fallbacks) has no bindTools, so tools used to be
  // silently dropped whenever more than one provider key was configured.
  it("binds tools on the primary and every fallback of a fallback-wrapped model", () => {
    const primary = fakeModel("primary");
    const fb1 = fakeModel("fb1");
    const fb2 = fakeModel("fb2");
    const wrapped = { runnable: primary, fallbacks: [fb1, fb2] }; // no bindTools, like RunnableWithFallbacks

    const result = bindModelTools(wrapped as unknown as BaseChatModel, tools) as unknown as {
      primary: string;
      fallbacks: { boundFrom: string }[];
    };

    expect(primary.bindTools).toHaveBeenCalledWith(tools, undefined);
    expect(fb1.bindTools).toHaveBeenCalledWith(tools, undefined);
    expect(fb2.bindTools).toHaveBeenCalledWith(tools, undefined);
    expect(result.primary).toBe("primary");
    expect(result.fallbacks.map((f) => f.boundFrom)).toEqual(["fb1", "fb2"]);
  });
});
