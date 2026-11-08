/** Shared by the chat input (client) and the stream endpoint (server). */
export const MAX_MESSAGE_LENGTH = 20_000;

/** Custom system prompts are sent with every request; keep them bounded. */
export const MAX_SYSTEM_PROMPT_LENGTH = 8_000;
