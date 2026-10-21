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
import { SystemMessage, HumanMessage, AIMessage, ToolMessage, ContentBlock } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { DynamicTool } from "@langchain/core/tools";

/**
 * 5-Agent Council Architecture:
 * 
 * 1. 🎯 Supervisor (Strategist & Dispatcher): Decomposes objectives, plans steps, and dispatches to specialists.
 * 2. 🔍 Researcher (Knowledge & Retrieval): Gathers context, documentation, web queries, and references.
 * 3. 💻 Developer (Code & Systems Engineer): Focuses on implementation, coding, database queries, and MCP tool execution.
 * 4. 📊 Analyst (Data & Diagram Specialist): Transforms raw data, statistical analysis, and generates Mermaid architecture/flowcharts.
 * 5. 🛡️ Auditor (Security & Quality Critic): Scans for OWASP flaws, edge-case bugs, verifies accuracy, and synthesizes final delivery.
 * + 🚦 Safety Governor (HITL): Human-in-the-loop tool approval for high-risk actions.
 */
export class MultiAgentBuilder {
  private toolNode: ToolNode;
  private readonly model: BaseChatModel;
  private tools: DynamicTool[];
  private systemPrompt: string = "";
  private approveAllTools: boolean = false;
  private checkpointer?: BaseCheckpointSaver;

  constructor({
    tools,
    llm,
    prompt,
    checkpointer,
    approveAllTools,
  }: {
    tools: DynamicTool[];
    llm: BaseChatModel;
    prompt: string;
    checkpointer?: BaseCheckpointSaver;
    approveAllTools?: boolean;
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
  private async supervisorNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    const isFirstTurn =
      messages.filter((m) => m instanceof HumanMessage).length <= 1 &&
      messages.filter((m) => m instanceof AIMessage).length === 0;

    if (!isFirstTurn) {
      return { messages: [] };
    }

    const supervisorPrompt = new SystemMessage(
      `You are the 🎯 Orchestration Supervisor of the AgentSphere 5-Agent Council.
Your council members:
- 🔍 Researcher: Web retrieval, APIs, documentation search.
- 💻 Developer: Implementation, code engineering, architecture, MCP execution.
- 📊 Analyst: Quantitative data, statistics, Mermaid diagrams, charts.
- 🛡️ Auditor: Security analysis, QA review, and final synthesis.

Analyze the user's objective and provide a crisp 2-3 step plan.
At the very end of your response, specify the next specialist on a new line using EXACTLY ONE of these tags:
[ROUTE: RESEARCHER] (if the query requires looking up external docs, live web data, or APIs)
[ROUTE: ANALYST] (if the query is primarily mathematical, data analysis, or visual diagramming)
[ROUTE: DEVELOPER] (for coding, engineering, troubleshooting, or general technical requests)

Format:
### 🎯 Supervisor Plan
**Objective:** [Brief statement of user goal]
**Strategy:** [Numbered 2-3 step plan]
**Assigned Specialist:** [Specialist Name]

[ROUTE: <TAG>]`
    );

    const response = await this.model.invoke([supervisorPrompt, lastMessage]);
    return { messages: [response] };
  }

  /**
   * Evaluates Supervisor output to choose next node
   */
  private routeFromSupervisor(state: typeof MessagesAnnotation.State): "researcher" | "analyst" | "developer" {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    const content = typeof lastMessage?.content === "string" ? lastMessage.content : "";

    if (content.includes("[ROUTE: RESEARCHER]")) {
      return "researcher";
    }
    if (content.includes("[ROUTE: ANALYST]")) {
      return "analyst";
    }
    return "developer";
  }

  /**
   * Helper to safely bind tools to model if supported
   */
  private getInvoker(tools: DynamicTool[]) {
    if (tools.length > 0 && "bindTools" in this.model && typeof this.model.bindTools === "function") {
      return this.model.bindTools(tools);
    }
    return this.model;
  }

  /**
   * 2. 🔍 Researcher Node:
   * Gathers external intelligence, documentation, and references.
   */
  private async researcherNode(state: typeof MessagesAnnotation.State) {
    const rTools = this.getResearcherTools();
    const invoker = this.getInvoker(rTools);

    const researcherPrompt = new SystemMessage(
      `You are the 🔍 Lead Researcher in the AgentSphere Council.
Your role:
1. Gather necessary facts, documentation, API signatures, or live web data required for the user's goal.
2. If search/fetch tools are available, invoke them.
3. Synthesize your research cleanly with sources, facts, and prerequisites.

Format your response starting with:
### 🔍 Research & Context Findings
[Your synthesized facts, references, and prerequisites for the Developer and Analyst]`
    );

    const messages = [researcherPrompt, ...state.messages];
    const response = await invoker.invoke(messages);
    return { messages: [response] };
  }

  /**
   * 3. 💻 Developer Node:
   * Writes robust code, implementations, and calls system/developer MCP tools.
   */
  private async developerNode(state: typeof MessagesAnnotation.State) {
    const dTools = this.getDeveloperTools();
    const invoker = this.getInvoker(dTools);

    const devPrompt = new SystemMessage(
      `${this.systemPrompt}

You are the 💻 Principal Software Engineer in the AgentSphere Council.
Your role:
1. Implement clean, modular, production-grade code adhering to best practices and TypeScript types.
2. Use available MCP tools for filesystem or database interactions where needed.
3. Build complete, runnable solutions with clear explanations and inline comments.

Format your response starting with:
### 💻 Developer Implementation
[Your detailed implementation, code blocks, and system explanations]`
    );

    const messages = [devPrompt, ...state.messages];
    const response = await invoker.invoke(messages);
    return { messages: [response] };
  }

  /**
   * 4. 📊 Analyst Node:
   * Handles quantitative logic, structured data tables, and Mermaid architecture diagrams.
   */
  private async analystNode(state: typeof MessagesAnnotation.State) {
    const aTools = this.getAnalystTools();
    const invoker = this.getInvoker(aTools);

    const analystPrompt = new SystemMessage(
      `You are the 📊 Lead Data Scientist & Architecture Analyst in the AgentSphere Council.
Your role:
1. Provide quantitative analysis, statistical reasoning, or performance tradeoffs.
2. Whenever appropriate, generate a beautiful Mermaid diagram (flowchart, sequence, or class diagram) to visually explain the architecture or process.
3. Structure complex information into clear comparison tables.

Format your response starting with:
### 📊 Data & Architecture Analysis
[Your quantitative insights, comparison tables, and/or Mermaid visual diagram]`
    );

    const messages = [analystPrompt, ...state.messages];
    const response = await invoker.invoke(messages);
    return { messages: [response] };
  }

  /**
   * 5. 🛡️ Auditor & Critic Node:
   * Reviews the council's work for OWASP vulnerabilities, bugs, edge cases, and synthesizes final delivery.
   */
  private async auditorNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // If last message has tool calls, let tools handle them
    if (
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
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

[Conclude with final advice or a polished wrap-up summary]`
    );

    const response = await this.model.invoke([auditorPrompt, ...messages]);
    return { messages: [response] };
  }

  /**
   * Checks whether developer or specialist made tool calls requiring approval
   */
  private shouldApproveTool(state: typeof MessagesAnnotation.State) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
      return "tool_approval";
    }
    return "auditor";
  }

  /**
   * Human-in-the-loop tool approval node (Safety Governor)
   */
  private async approveToolCall(state: typeof MessagesAnnotation.State) {
    if (this.approveAllTools) {
      return new Command({ goto: "tools" });
    }
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
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
          tool_calls: [
            {
              id: toolCall.id,
              name: toolCall.name,
              args: reviewData,
            },
          ],
          id: lastMessage.id,
        };
        return new Command({
          goto: "tools",
          update: { messages: [updatedMessage] },
        });
      } else if (reviewAction === "feedback") {
        const toolMessage = new ToolMessage({
          name: toolCall.name,
          content: reviewData,
          tool_call_id: toolCall.id,
        });
        return new Command({
          goto: "developer",
          update: { messages: [toolMessage] },
        });
      }
      throw new Error("Invalid review action");
    }
  }

  build() {
    const stateGraph = new StateGraph(MessagesAnnotation);
    stateGraph
      // 5 Council Nodes + Tools + Safety Governor
      .addNode("supervisor", this.supervisorNode.bind(this))
      .addNode("researcher", this.researcherNode.bind(this))
      .addNode("developer", this.developerNode.bind(this))
      .addNode("analyst", this.analystNode.bind(this))
      .addNode("auditor", this.auditorNode.bind(this))
      .addNode("tools", this.toolNode)
      .addNode("tool_approval", this.approveToolCall.bind(this), {
        ends: ["tools", "developer"],
      })
      // START -> Supervisor
      .addEdge(START, "supervisor")
      // Supervisor -> Conditional routing to Researcher, Developer, or Analyst
      .addConditionalEdges("supervisor", this.routeFromSupervisor.bind(this), [
        "researcher",
        "developer",
        "analyst",
      ])
      // Researcher hands off to Developer for technical implementation
      .addEdge("researcher", "developer")
      // Developer -> checks tool calls (tool_approval) or hands off to Auditor
      .addConditionalEdges("developer", this.shouldApproveTool.bind(this), [
        "tool_approval",
        "auditor",
      ])
      // Tools loop back to Developer
      .addEdge("tools", "developer")
      // Analyst hands off to Auditor
      .addEdge("analyst", "auditor")
      // Auditor concludes the council's work
      .addEdge("auditor", END);

    return stateGraph.compile({ checkpointer: this.checkpointer });
  }
}
