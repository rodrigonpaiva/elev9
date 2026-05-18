export type AiLlmMessageRole = "system" | "user" | "assistant";

export type AiLlmMessage = {
  role: AiLlmMessageRole;
  content: string;
};

export type AiLlmPrompt = {
  messages: AiLlmMessage[];
};

export type AiLlmGenerateReplyInput = {
  messages: AiLlmMessage[];
  model: string;
};

export interface AiLlmProvider {
  generateReply(input: AiLlmGenerateReplyInput): Promise<string>;
}

export const AI_LLM_PROVIDER = Symbol("AI_LLM_PROVIDER");
