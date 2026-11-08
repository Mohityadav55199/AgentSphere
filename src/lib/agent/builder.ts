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
import { SystemMessage, ToolMessage, ContentBlock } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { DynamicTool } from "@langchain/core/tools";
import { applyToolEdit, bindModelTools, countToolRounds, withoutToolCalls } from "./util";

/** Tool rounds the single agent may use per user message before it must answer. */
export const MAX_TOOL_ROUNDS = 8;
import { withCurrentDate } from "./prompt";

export class AgentBuilder {
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
      throw new Error("Language model (llm) is required");
    }
    this.tools = tools || [];
    this.toolNode = new ToolNode(tools || []);
    this.systemPrompt = prompt;
    this.model = llm;
    this.checkpointer = checkpointer;
    this.approveAllTools = approveAllTools || false;
  }

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
    return END;
  }

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
          // Only the reviewed call gets new args; any parallel calls are kept as they were.
          tool_calls: lastMessage.tool_calls!.map((tc) =>
            applyToolEdit(tc, toolCall.id, reviewData),
          ),
          id: lastMessage.id,
        };
        return new Command({
          goto: "tools",
          update: { messages: [updatedMessage] },
        });
      } else if (reviewAction === "feedback") {
        // Every tool call in the message needs a reply, otherwise the next model call is rejected.
        const toolMessages = lastMessage.tool_calls!.map(
          (tc) =>
            new ToolMessage({
              name: tc.name,
              content: reviewData,
              tool_call_id: tc.id ?? "",
            }),
        );
        return new Command({
          goto: "agent",
          update: { messages: toolMessages },
        });
      }
      throw new Error("Invalid review action");
    }
  }

  private async callModel(state: typeof MessagesAnnotation.State) {
    if (!this.model) {
      throw new Error("Invalid or missing language model (llm)");
    }
    // Tool budget per user message. Tools stay bound (Groq rejects tool_choice "none" with a 400
    // when the model still tries a call); the note asks it to answer and extra calls are dropped.
    // The note goes into the one leading system message: Anthropic and Gemini reject system
    // messages anywhere else.
    const exhausted = countToolRounds(state.messages) >= MAX_TOOL_ROUNDS;
    const budgetNote = exhausted
      ? "\n\nYou have used the maximum number of tool calls for this request. Do not call any more tools: answer now using the results above."
      : "";
    const messages = [
      // Add always system prompt so it is not duplicated in the messages
      new SystemMessage(withCurrentDate(this.systemPrompt + budgetNote)),
      ...state.messages,
    ];
    const modelInvoker = bindModelTools(this.model, this.tools);
    const response = await modelInvoker.invoke(messages);
    // Over budget: never leave an unexecuted tool call in the history.
    return { messages: exhausted ? withoutToolCalls(response) : response };
  }

  build() {
    const stateGraph = new StateGraph(MessagesAnnotation);
    stateGraph
      .addNode("agent", this.callModel.bind(this))
      .addNode("tools", this.toolNode)
      .addNode("tool_approval", this.approveToolCall.bind(this), {
        ends: ["tools", "agent"],
      })
      .addEdge(START, "agent")
      .addConditionalEdges("agent", this.shouldApproveTool.bind(this), ["tool_approval", END])
      .addEdge("tools", "agent");

    const compiledGraph = stateGraph.compile({ checkpointer: this.checkpointer });
    return compiledGraph;
  }
}
