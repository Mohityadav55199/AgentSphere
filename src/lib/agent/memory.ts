import { BaseMessage } from "@langchain/core/messages";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { MemorySaver, BaseCheckpointSaver } from "@langchain/langgraph";
import * as dotenv from "dotenv";

if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

/**
 * Creates a memory checkpointer instance (PostgresSaver or MemorySaver)
 * @returns Checkpointer instance
 */
export function createCheckpointer(): BaseCheckpointSaver {
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
      const connectionString = `${dbUrl}${
        process.env.DB_SSLMODE ? `?sslmode=${process.env.DB_SSLMODE}` : ""
      }`;
      return PostgresSaver.fromConnString(connectionString);
    }
  } catch (err) {
    console.warn("Failed to initialize PostgresSaver checkpointer, falling back to MemorySaver:", err);
  }
  return new MemorySaver();
}

export const postgresCheckpointer = createCheckpointer();

/**
 * Retrieves the message history for a specific thread.
 * @param threadId - The ID of the thread to retrieve history for.
 * @returns An array of messages associated with the thread.
 */
export const getHistory = async (threadId: string): Promise<BaseMessage[]> => {
  try {
    const history = await postgresCheckpointer.get({
      configurable: { thread_id: threadId },
    });
    return Array.isArray(history?.channel_values?.messages) ? history.channel_values.messages : [];
  } catch (err) {
    console.error("Failed to get history from checkpointer:", err);
    return [];
  }
};


