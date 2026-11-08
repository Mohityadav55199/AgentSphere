import { describe, expect, it } from "vitest";
import { Command, MemorySaver } from "@langchain/langgraph";
import { AIMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { DynamicTool } from "@langchain/core/tools";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { MAX_TOOL_ROUNDS_PER_ROLE, MultiAgentBuilder } from "@/lib/agent/multiAgent";
import { normalizeCouncilSettings, type CouncilRole } from "@/lib/agent/council";

type Responder = (messages: BaseMessage[]) => AIMessage;

/** Scripted chat model: identifies the council role from its system prompt. */
function fakeModel(responders: Partial<Record<CouncilRole, Responder>>) {
  const calls: CouncilRole[] = [];
  const systemPrompts: string[] = [];
  const model = {
    bindTools: () => model,
    async invoke(messages: BaseMessage[]) {
      const system = String(messages[0].content);
      systemPrompts.push(system);
      const role: CouncilRole = system.includes("Orchestration Supervisor")
        ? "supervisor"
        : system.includes("Lead Researcher")
          ? "researcher"
          : system.includes("Principal Software Engineer")
            ? "developer"
            : system.includes("Data Scientist")
              ? "analyst"
              : "auditor";
      calls.push(role);
      const respond = responders[role] ?? (() => new AIMessage(`${role} done`));
      return respond(messages);
    },
  };
  return { model: model as unknown as BaseChatModel, calls, systemPrompts };
}

const webSearch = new DynamicTool({
  name: "web_search",
  description: "search",
  func: async () => "search results",
});

const researcherThatSearches: Responder = (messages) =>
  messages[messages.length - 1] instanceof ToolMessage
    ? new AIMessage("### 🔍 Research & Context Findings\nfound it")
    : new AIMessage({
        content: "",
        tool_calls: [{ id: "call_1", name: "web_search", args: { input: "langgraph" } }],
      });

const config = (id: string) => ({ configurable: { thread_id: id } });

describe("MultiAgentBuilder", () => {
  it("returns tool results to the Researcher that asked for them (regression)", async () => {
    const { model, calls } = fakeModel({
      supervisor: () => new AIMessage("### 🎯 Supervisor Plan\nplan\n[ROUTE: RESEARCHER]"),
      researcher: researcherThatSearches,
    });
    const graph = new MultiAgentBuilder({
      llm: model,
      tools: [webSearch],
      prompt: "base",
      checkpointer: new MemorySaver(),
      approveAllTools: true,
    }).build();

    const result = await graph.invoke({ messages: [{ role: "user", content: "hi" }] }, config("a"));

    expect(calls).toEqual(["supervisor", "researcher", "researcher", "developer", "auditor"]);
    const toolMessage = result.messages.find((m: BaseMessage) => m instanceof ToolMessage);
    expect(toolMessage?.content).toBe("search results");
  });

  it("skips disabled roles and always keeps the Developer", async () => {
    const { model, calls } = fakeModel({});
    const council = normalizeCouncilSettings([
      { id: "supervisor", enabled: false },
      { id: "developer", enabled: false }, // cannot be disabled
      { id: "auditor", enabled: false },
    ]);
    const graph = new MultiAgentBuilder({
      llm: model,
      tools: [webSearch],
      prompt: "base",
      checkpointer: new MemorySaver(),
      council,
    }).build();

    await graph.invoke({ messages: [{ role: "user", content: "hi" }] }, config("b"));
    expect(calls).toEqual(["developer"]);
  });

  it("does not route to a disabled specialist even if the Supervisor asks for it", async () => {
    const { model, calls } = fakeModel({
      supervisor: () => new AIMessage("plan\n[ROUTE: ANALYST]"),
    });
    const graph = new MultiAgentBuilder({
      llm: model,
      tools: [],
      prompt: "base",
      checkpointer: new MemorySaver(),
      council: normalizeCouncilSettings([{ id: "analyst", enabled: false }]),
    }).build();

    await graph.invoke({ messages: [{ role: "user", content: "hi" }] }, config("c"));
    expect(calls).toEqual(["supervisor", "developer", "auditor"]);
  });

  it("appends Agent Studio directives to that role's prompt", async () => {
    const { model, systemPrompts } = fakeModel({});
    const graph = new MultiAgentBuilder({
      llm: model,
      tools: [],
      prompt: "base",
      checkpointer: new MemorySaver(),
      council: normalizeCouncilSettings([
        { id: "developer", customPrompt: "Always answer in Python." },
      ]),
    }).build();

    await graph.invoke({ messages: [{ role: "user", content: "hi" }] }, config("d"));
    const developerPrompt = systemPrompts.find((p) => p.includes("Principal Software Engineer"));
    expect(developerPrompt).toContain("Always answer in Python.");
  });

  it("on denial, answers the tool call and hands back to the caller without running it", async () => {
    let toolRuns = 0;
    const countingSearch = new DynamicTool({
      name: "web_search",
      description: "search",
      func: async () => {
        toolRuns++;
        return "search results";
      },
    });
    const { model, calls } = fakeModel({
      supervisor: () => new AIMessage("plan\n[ROUTE: RESEARCHER]"),
      researcher: researcherThatSearches,
    });
    const graph = new MultiAgentBuilder({
      llm: model,
      tools: [countingSearch],
      prompt: "base",
      checkpointer: new MemorySaver(),
    }).build();

    await graph.invoke({ messages: [{ role: "user", content: "hi" }] }, config("e"));
    expect(calls).toEqual(["supervisor", "researcher"]); // paused for approval

    const result = await graph.invoke(
      new Command({ resume: { action: "feedback", data: "The user denied permission." } }),
      config("e"),
    );

    expect(toolRuns).toBe(0);
    expect(calls).toEqual(["supervisor", "researcher", "researcher", "developer", "auditor"]);
    const reply = result.messages.find((m: BaseMessage) => m instanceof ToolMessage);
    expect(reply?.content).toBe("The user denied permission.");
  });

  // Regression: a Researcher that keeps searching used to hit LangGraph's recursion limit and
  // abort the whole run with an error.
  it("caps a specialist's tool rounds and still finishes with a valid history", async () => {
    let n = 0;
    const alwaysSearch: Responder = () =>
      new AIMessage({
        content: "",
        tool_calls: [{ id: `call_${++n}`, name: "web_search", args: { input: "more" } }],
      });
    const { model, calls } = fakeModel({
      supervisor: () => new AIMessage("plan\n[ROUTE: RESEARCHER]"),
      researcher: alwaysSearch,
    });
    const graph = new MultiAgentBuilder({
      llm: model,
      tools: [webSearch],
      prompt: "base",
      checkpointer: new MemorySaver(),
      approveAllTools: true,
    }).build();

    const result = await graph.invoke(
      { messages: [{ role: "user", content: "hi" }] },
      { ...config("f"), recursionLimit: 100 },
    );

    expect(calls.filter((c) => c === "researcher")).toHaveLength(MAX_TOOL_ROUNDS_PER_ROLE + 1);
    expect(calls.slice(-2)).toEqual(["developer", "auditor"]);
    const toolMessages = result.messages.filter(
      (m: BaseMessage) => m instanceof ToolMessage,
    ) as ToolMessage[];
    expect(toolMessages).toHaveLength(MAX_TOOL_ROUNDS_PER_ROLE);
    // Every tool call left in the history has a matching tool result.
    const answered = new Set(toolMessages.map((m) => m.tool_call_id));
    for (const m of result.messages as BaseMessage[]) {
      for (const tc of (m as AIMessage).tool_calls ?? []) expect(answered.has(tc.id!)).toBe(true);
    }
  });
});
