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
 * MultiAgentBuilder
 * 
 * Implements a true Multi-Agent collaborative architecture in LangGraph:
 * 
 * 1. 🎯 Supervisor (Orchestrator): Assesses complexity, outlines goals, and plans delegation.
 * 2. 💻 Specialist (Execution Agent): Implements solution, binds and executes MCP tools.
 * 3. 🛡️ Critic (Verifier & Synthesizer): Validates against edge cases and produces final polished delivery.
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
   * Supervisor Node:
   * Analyzes user request, forms execution strategy, and initiates multi-agent collaboration.
   */
  private async supervisorNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // Only run supervisor planning on initial user turn
    const isFirstTurn = messages.filter((m) => m instanceof HumanMessage).length <= 1 &&
      messages.filter((m) => m instanceof AIMessage).length === 0;

    if (!isFirstTurn) {
      // If continuing conversation, delegate directly to specialist
      return { messages: [] };
    }

    const supervisorPrompt = new SystemMessage(
      `You are the Orchestration Supervisor in the AgentSphere Multi-Agent Team.
Your role:
1. Deconstruct the user's objective into clear execution steps.
2. Formulate a brief, structured action plan.
3. Identify which domain specialist (e.g., Code Engineer, Data Analyst, Researcher) and tools are needed.

Format your output starting with:
### 🎯 Multi-Agent Plan
**Goal:** [Brief statement of user goal]
**Strategy:** [Numbered 2-3 step execution plan]

Keep it concise and ready for specialist execution.`
    );

    const response = await this.model.invoke([supervisorPrompt, lastMessage]);
    return { messages: [response] };
  }

  /**
   * Specialist Node:
   * Carries out technical implementation and executes tools (including MCP servers).
   */
  private async specialistNode(state: typeof MessagesAnnotation.State) {
    const modelInvoker = this.tools.length > 0 ? this.model.bindTools(this.tools) : this.model;

    const specialistPrompt = new SystemMessage(
      `${this.systemPrompt}

You are the Lead Specialist & Execution Agent in the AgentSphere Multi-Agent Team.
Your role:
1. Follow the Supervisor's plan and execute the requested tasks.
2. Leverage external MCP tools whenever data lookup, calculations, or external actions are required.
3. Provide rigorous, production-grade implementation details with exact code or data answers.`
    );

    const messages = [specialistPrompt, ...state.messages];
    const response = await modelInvoker.invoke(messages);
    return { messages: [response] };
  }

  /**
   * Critic & Synthesis Node:
   * Reviews the specialist's response for accuracy, security, and edge cases.
   */
  private async criticNode(state: typeof MessagesAnnotation.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // If specialist called tools, let the tool loop handle it first
    if (
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
      return { messages: [] };
    }

    // If response is short or already finalized, return
    const content = typeof lastMessage.content === "string" ? lastMessage.content : "";
    if (content.includes("### 🛡️ Review & Verification") || content.length < 50) {
      return { messages: [] };
    }

    const criticPrompt = new SystemMessage(
      `You are the Quality & Security Critic in the AgentSphere Multi-Agent Team.
Review the specialist's implementation above.
If the solution is complete and accurate, append a brief verification note:

### 🛡️ Review & Verification
- **Correctness & Edge Cases:** Verified.
- **Recommendations:** [1 actionable bullet or "None, implementation is optimal."]

If there are bugs or security flaws, fix them directly in this response.`
    );

    const response = await this.model.invoke([criticPrompt, ...messages]);
    return { messages: [response] };
  }

  /**
   * Checks whether the specialist made tool calls requiring human approval.
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
    return "critic";
  }

  /**
   * Human-in-the-loop tool approval node
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
        question: "Is this correct?",
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
          goto: "specialist",
          update: { messages: [toolMessage] },
        });
      }
      throw new Error("Invalid review action");
    }
  }

  build() {
    const stateGraph = new StateGraph(MessagesAnnotation);
    stateGraph
      .addNode("supervisor", this.supervisorNode.bind(this))
      .addNode("specialist", this.specialistNode.bind(this))
      .addNode("tools", this.toolNode)
      .addNode("tool_approval", this.approveToolCall.bind(this), {
        ends: ["tools", "specialist"],
      })
      .addNode("critic", this.criticNode.bind(this))
      // Edges: START -> supervisor -> specialist
      .addEdge(START, "supervisor")
      .addEdge("supervisor", "specialist")
      // specialist -> tool_approval OR critic
      .addConditionalEdges("specialist", this.shouldApproveTool.bind(this), [
        "tool_approval",
        "critic",
      ])
      // tools loop back to specialist
      .addEdge("tools", "specialist")
      // critic finishes the response
      .addEdge("critic", END);

    return stateGraph.compile({ checkpointer: this.checkpointer });
  }
}
