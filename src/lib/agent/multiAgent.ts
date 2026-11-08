import {
  StateGraph,
  MessagesAnnotation,
  END,
  START,
  BaseCheckpointSaver,
  interrupt,
  Command,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
  ContentBlock,
  BaseMessage,
} from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { DynamicTool } from "@langchain/core/tools";
import { applyToolEdit, bindModelTools } from "./util";
import type { CouncilAgentSettings, CouncilRole } from "./council";

/** Roles whose model calls may request tools; tool results are routed back to the caller. */
type ToolCallerRole = "researcher" | "developer" | "analyst";
const TOOL_CALLERS: readonly ToolCallerRole[] = ["researcher", "developer", "analyst"];

type State = typeof MessagesAnnotation.State;

function hasToolCalls(message: BaseMessage | undefined): message is AIMessage {
  return (
    !!message &&
    "tool_calls" in message &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  );
}

/**
 * Record which council member produced a message. Stored in response_metadata, which is kept in
 * the checkpoint but never sent back to the LLM provider.
 */
function tagRole<T extends BaseMessage>(message: T, role: CouncilRole): T {
  const meta = (message as unknown as { response_metadata?: Record<string, unknown> })
    .response_metadata;
  (message as unknown as { response_metadata: Record<string, unknown> }).response_metadata = {
    ...(meta ?? {}),
    councilRole: role,
  };
  return message;
}

function roleOf(message: BaseMessage): CouncilRole | undefined {
  const meta = (message as unknown as { response_metadata?: Record<string, unknown> })
    .response_metadata;
  return meta?.councilRole as CouncilRole | undefined;
}

/**
 * 5-Agent Council Architecture:
 *
 * 1. 🎯 Supervisor (Strategist & Dispatcher): Decomposes objectives, plans steps, and dispatches to specialists.
 * 2. 🔍 Researcher (Knowledge & Retrieval): Gathers context, documentation, web queries, and references.
 * 3. 💻 Developer (Code & Systems Engineer): Focuses on implementation, coding, database queries, and MCP tool execution.
 * 4. 📊 Analyst (Data & Diagram Specialist): Transforms raw data, statistical analysis, and generates Mermaid architecture/flowcharts.
 * 5. 🛡️ Auditor (Security & Quality Critic): Scans for OWASP flaws, edge-case bugs, verifies accuracy, and synthesizes final delivery.
 * + 🚦 Safety Governor (HITL): Human-in-the-loop tool approval for high-risk actions.
 *
 * Any specialist that requests a tool goes through approval → tools → back to that same
 * specialist. (Previously only the Developer did; a Researcher web search left an unanswered
 * tool call in the history, which every provider rejects on the next model call.)
 *
 * Agent Studio settings (per-role on/off, temperature and extra directive) are honoured; the
 * Developer is always on.
 */
export class MultiAgentBuilder {
  private toolNode: ToolNode;
  private readonly model: BaseChatModel;
  private tools: DynamicTool[];
  private systemPrompt: string = "";
  private approveAllTools: boolean = false;
  private checkpointer?: BaseCheckpointSaver;
  private roleModels: Partial<Record<CouncilRole, BaseChatModel>>;
  private settings: Partial<Record<CouncilRole, CouncilAgentSettings>>;

  constructor({
    tools,
    llm,
    prompt,
    checkpointer,
    approveAllTools,
    council,
    roleModels,
  }: {
    tools: DynamicTool[];
    llm: BaseChatModel;
    prompt: string;
    checkpointer?: BaseCheckpointSaver;
    approveAllTools?: boolean;
    /** Agent Studio settings; omitted means every role enabled with no extra directive. */
    council?: CouncilAgentSettings[];
    /** Per-role models (used for per-role temperature); falls back to `llm`. */
    roleModels?: Partial<Record<CouncilRole, BaseChatModel>>;
  }) {
    if (!llm) {
      throw new Error("Language model (llm) is required for MultiAgentBuilder");
    }
    this.tools = tools || [];
    this.toolNode = new ToolNode(tools || []);
    this.systemPrompt = prompt;
    this.model = llm;
    this.checkpointer = checkpointer;
    this.approveAllTools = approveAllTools || false;
    this.roleModels = roleModels ?? {};
    this.settings = Object.fromEntries((council ?? []).map((c) => [c.id, c]));
  }

  private isEnabled(role: CouncilRole): boolean {
    if (role === "developer") return true;
    return this.settings[role]?.enabled !== false;
  }

  private modelFor(role: CouncilRole): BaseChatModel {
    return this.roleModels[role] ?? this.model;
  }

  /** Extra directive typed into Agent Studio, appended to that role's system prompt. */
  private directive(role: CouncilRole): string {
    const extra = this.settings[role]?.customPrompt?.trim();
    return extra ? `\n\nAdditional directive from the user for this role:\n${extra}` : "";
  }

  /**
   * Filter tools scoped for specific agent roles
   */
  private getResearcherTools(): DynamicTool[] {
    return this.tools.filter((t) => {
      const name = t.name.toLowerCase();
      return (
        name.includes("search") ||
        name.includes("fetch") ||
        name.includes("web") ||
        name.includes("browse") ||
        name.includes("doc") ||
        name.includes("arxiv")
      );
    });
  }

  private getDeveloperTools(): DynamicTool[] {
    return this.tools.filter((t) => {
      const name = t.name.toLowerCase();
      return (
        name.includes("file") ||
        name.includes("code") ||
        name.includes("exec") ||
        name.includes("sqlite") ||
        name.includes("postgres") ||
        name.includes("git") ||
        name.includes("terminal") ||
        (!name.includes("search") && !name.includes("calc"))
      );
    });
  }

  private getAnalystTools(): DynamicTool[] {
    return this.tools.filter((t) => {
      const name = t.name.toLowerCase();
      return (
        name.includes("calc") ||
        name.includes("math") ||
        name.includes("stat") ||
        name.includes("chart") ||
        name.includes("analyze") ||
        name.includes("sqlite")
      );
    });
  }

  /**
   * 1. 🎯 Supervisor Node:
   * Analyzes the goal, decomposes it, and selects the optimal specialist route.
   */
  private async supervisorNode(state: State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    const isFirstTurn =
      messages.filter((m) => m instanceof HumanMessage).length <= 1 &&
      messages.filter((m) => m instanceof AIMessage).length === 0;

    if (!isFirstTurn) {
      return { messages: [] };
    }

    const routes = [
      this.isEnabled("researcher")
        ? "[ROUTE: RESEARCHER] (if the query requires looking up external docs, live web data, or APIs)"
        : null,
      this.isEnabled("analyst")
        ? "[ROUTE: ANALYST] (if the query is primarily mathematical, data analysis, or visual diagramming)"
        : null,
      "[ROUTE: DEVELOPER] (for coding, engineering, troubleshooting, or general technical requests)",
    ].filter(Boolean);

    const supervisorPrompt = new SystemMessage(
      `You are the 🎯 Orchestration Supervisor of the AgentSphere 5-Agent Council.
Your council members:
- 🔍 Researcher: Web retrieval, APIs, documentation search.
- 💻 Developer: Implementation, code engineering, architecture, MCP execution.
- 📊 Analyst: Quantitative data, statistics, Mermaid diagrams, charts.
- 🛡️ Auditor: Security analysis, QA review, and final synthesis.

Analyze the user's objective and provide a crisp 2-3 step plan.
At the very end of your response, specify the next specialist on a new line using EXACTLY ONE of these tags:
${routes.join("\n")}

Format:
### 🎯 Supervisor Plan
**Objective:** [Brief statement of user goal]
**Strategy:** [Numbered 2-3 step plan]
**Assigned Specialist:** [Specialist Name]

[ROUTE: <TAG>]${this.directive("supervisor")}`,
    );

    const response = await this.modelFor("supervisor").invoke([supervisorPrompt, lastMessage]);
    return { messages: [tagRole(response, "supervisor")] };
  }

  /**
   * Evaluates Supervisor output to choose next node (only among enabled specialists)
   */
  private routeFromSupervisor(state: State): "researcher" | "analyst" | "developer" {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    const content = typeof lastMessage?.content === "string" ? lastMessage.content : "";

    if (content.includes("[ROUTE: RESEARCHER]") && this.isEnabled("researcher")) {
      return "researcher";
    }
    if (content.includes("[ROUTE: ANALYST]") && this.isEnabled("analyst")) {
      return "analyst";
    }
    return "developer";
  }

  /**
   * Helper to safely bind tools to a role's model if supported
   */
  private getInvoker(role: CouncilRole, tools: DynamicTool[]) {
    return bindModelTools(this.modelFor(role), tools);
  }

  /**
   * 2. 🔍 Researcher Node:
   * Gathers external intelligence, documentation, and references.
   */
  private async researcherNode(state: State) {
    const invoker = this.getInvoker("researcher", this.getResearcherTools());

    const researcherPrompt = new SystemMessage(
      `You are the 🔍 Lead Researcher in the AgentSphere Council.
Your role:
1. Gather necessary facts, documentation, API signatures, or live web data required for the user's goal.
2. If search/fetch tools are available, invoke them.
3. Synthesize your research cleanly with sources, facts, and prerequisites.

Format your response starting with:
### 🔍 Research & Context Findings
[Your synthesized facts, references, and prerequisites for the Developer and Analyst]${this.directive("researcher")}`,
    );

    const response = await invoker.invoke([researcherPrompt, ...state.messages]);
    return { messages: [tagRole(response, "researcher")] };
  }

  /**
   * 3. 💻 Developer Node:
   * Writes robust code, implementations, and calls system/developer MCP tools.
   */
  private async developerNode(state: State) {
    const invoker = this.getInvoker("developer", this.getDeveloperTools());

    const devPrompt = new SystemMessage(
      `${this.systemPrompt}

You are the 💻 Principal Software Engineer in the AgentSphere Council.
Your role:
1. Implement clean, modular, production-grade code adhering to best practices and TypeScript types.
2. Use available MCP tools for filesystem or database interactions where needed.
3. Build complete, runnable solutions with clear explanations and inline comments.

Format your response starting with:
### 💻 Developer Implementation
[Your detailed implementation, code blocks, and system explanations]${this.directive("developer")}`,
    );

    const response = await invoker.invoke([devPrompt, ...state.messages]);
    return { messages: [tagRole(response, "developer")] };
  }

  /**
   * 4. 📊 Analyst Node:
   * Handles quantitative logic, structured data tables, and Mermaid architecture diagrams.
   */
  private async analystNode(state: State) {
    const invoker = this.getInvoker("analyst", this.getAnalystTools());

    const analystPrompt = new SystemMessage(
      `You are the 📊 Lead Data Scientist & Architecture Analyst in the AgentSphere Council.
Your role:
1. Provide quantitative analysis, statistical reasoning, or performance tradeoffs.
2. Whenever appropriate, generate a beautiful Mermaid diagram (flowchart, sequence, or class diagram) to visually explain the architecture or process.
   CRITICAL MERMAID SYNTAX RULES:
   - Always declare the diagram type on line 1 (e.g. \`\`\`mermaid\\nflowchart TD).
   - Wrap all node labels containing spaces, parentheses, slashes, or special characters in double quotes (e.g., A["Proxy Route (src/routes/proxy.ts)"] --> B["Next Service"]).
   - Avoid unquoted parentheses or special characters inside node IDs or bracket labels.
3. Structure complex information into clear comparison tables.

Format your response starting with:
### 📊 Data & Architecture Analysis
[Your quantitative insights, comparison tables, and/or Mermaid visual diagram]${this.directive("analyst")}`,
    );

    const response = await invoker.invoke([analystPrompt, ...state.messages]);
    return { messages: [tagRole(response, "analyst")] };
  }

  /**
   * 5. 🛡️ Auditor & Critic Node:
   * Reviews the council's work for OWASP vulnerabilities, bugs, edge cases, and synthesizes final delivery.
   */
  private async auditorNode(state: State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // Never audit while a tool call is still pending (routing should prevent this).
    if (hasToolCalls(lastMessage)) {
      return { messages: [] };
    }

    const content = typeof lastMessage.content === "string" ? lastMessage.content : "";
    if (content.includes("### 🛡️ Security Audit & Verification")) {
      return { messages: [] };
    }

    const auditorPrompt = new SystemMessage(
      `You are the 🛡️ Chief Security Auditor & Quality Critic in the AgentSphere Council.
Your role:
1. Review all code and proposals produced by the team above.
2. Check for security vulnerabilities (OWASP top 10, injection, credential leaks), performance bottlenecks, and edge cases.
3. Provide a concise verification summary with actionable recommendations and conclude the solution.

Format your response starting with:
### 🛡️ Security Audit & Verification
- **Security Posture:** [Verified Safe / Identified Risk]
- **Edge Cases Checked:** [List 1-2 edge cases verified]
- **Council Verdict:** [Approved / Enhanced]

[Conclude with final advice or a polished wrap-up summary]${this.directive("auditor")}`,
    );

    const response = await this.modelFor("auditor").invoke([auditorPrompt, ...messages]);
    return { messages: [tagRole(response, "auditor")] };
  }

  /** Where each specialist hands off once it has no pending tool calls. */
  private nextAfter(role: ToolCallerRole): string {
    if (role === "researcher") return "developer";
    return this.isEnabled("auditor") ? "auditor" : END;
  }

  /** After a specialist speaks: approve its tool calls first, otherwise hand off. */
  private routeAfterSpecialist(role: ToolCallerRole) {
    return (state: State) =>
      hasToolCalls(state.messages[state.messages.length - 1])
        ? "tool_approval"
        : this.nextAfter(role);
  }

  /** The specialist that requested the pending tool calls (tool results go back to it). */
  private toolCaller(state: State): ToolCallerRole {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const message = state.messages[i];
      if (hasToolCalls(message)) {
        const role = roleOf(message);
        if (role && (TOOL_CALLERS as readonly string[]).includes(role) && this.isEnabled(role)) {
          return role as ToolCallerRole;
        }
        break;
      }
    }
    return "developer";
  }

  /**
   * Human-in-the-loop tool approval node (Safety Governor)
   */
  private async approveToolCall(state: State) {
    if (this.approveAllTools) {
      return new Command({ goto: "tools" });
    }
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (hasToolCalls(lastMessage)) {
      const toolCall = lastMessage.tool_calls![lastMessage.tool_calls!.length - 1];

      const humanReview = interrupt<
        {
          question: string;
          toolCall: ToolCall;
        },
        {
          action: string;
          data: string | ContentBlock[];
        }
      >({
        question: `Agent wants to execute ${toolCall.name}. Approve action?`,
        toolCall: toolCall,
      });

      const reviewAction = humanReview.action;
      const reviewData = humanReview.data;
      if (reviewAction === "continue") {
        return new Command({ goto: "tools" });
      } else if (reviewAction === "update") {
        const updatedMessage = {
          role: "ai",
          content: lastMessage.content,
          tool_calls: lastMessage.tool_calls!.map((tc) =>
            applyToolEdit(tc, toolCall.id, reviewData),
          ),
          id: lastMessage.id,
          response_metadata: lastMessage.response_metadata,
        };
        return new Command({
          goto: "tools",
          update: { messages: [updatedMessage] },
        });
      } else if (reviewAction === "feedback") {
        // Answer every pending call so the history stays valid, then return to the caller.
        const toolMessages = lastMessage.tool_calls!.map(
          (tc) =>
            new ToolMessage({
              name: tc.name,
              content: reviewData,
              tool_call_id: tc.id ?? "",
            }),
        );
        return new Command({
          goto: this.toolCaller(state),
          update: { messages: toolMessages },
        });
      }
      throw new Error("Invalid review action");
    }
  }

  build() {
    const researcherOn = this.isEnabled("researcher");
    const analystOn = this.isEnabled("analyst");
    const auditorOn = this.isEnabled("auditor");
    const supervisorOn = this.isEnabled("supervisor");

    const callers: ToolCallerRole[] = [
      ...(researcherOn ? (["researcher"] as const) : []),
      "developer",
      ...(analystOn ? (["analyst"] as const) : []),
    ];
    const handoffs = (role: ToolCallerRole) => ["tool_approval", this.nextAfter(role)];

    // Disabled roles are not added to the graph at all, so nothing can route to them.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = new StateGraph(MessagesAnnotation) as any;
    graph
      .addNode("developer", this.developerNode.bind(this))
      .addNode("tools", this.toolNode)
      .addNode("tool_approval", this.approveToolCall.bind(this), {
        ends: ["tools", ...callers],
      });
    if (supervisorOn) graph.addNode("supervisor", this.supervisorNode.bind(this));
    if (researcherOn) graph.addNode("researcher", this.researcherNode.bind(this));
    if (analystOn) graph.addNode("analyst", this.analystNode.bind(this));
    if (auditorOn) graph.addNode("auditor", this.auditorNode.bind(this));

    if (supervisorOn) {
      graph.addEdge(START, "supervisor");
      graph.addConditionalEdges("supervisor", this.routeFromSupervisor.bind(this), [
        ...(researcherOn ? ["researcher"] : []),
        "developer",
        ...(analystOn ? ["analyst"] : []),
      ]);
    } else {
      graph.addEdge(START, "developer");
    }

    for (const role of callers) {
      graph.addConditionalEdges(role, this.routeAfterSpecialist(role), handoffs(role));
    }

    // Tool results return to whichever specialist asked for them.
    graph.addConditionalEdges("tools", this.toolCaller.bind(this), callers);

    if (auditorOn) graph.addEdge("auditor", END);

    return graph.compile({ checkpointer: this.checkpointer }) as ReturnType<
      StateGraph<typeof MessagesAnnotation.spec>["compile"]
    >;
  }
}
