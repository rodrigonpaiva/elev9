export type AiLlmMessageRole = 'system' | 'user' | 'assistant';

export type AiLlmMessage = {
  role: AiLlmMessageRole;
  content: string;
};

export type AiLlmPrompt = {
  promptVersion: string;
  messages: AiLlmMessage[];
};

export type AiLlmGenerateReplyInput = {
  messages: AiLlmMessage[];
  model: string;
};

export type AiLlmGenerateReplyResult = {
  content: string;
  provider: string;
  model: string;
  promptVersion: string;
};

export interface AiLlmProvider {
  generateReply(input: AiLlmGenerateReplyInput): Promise<string>;
}

export const AI_LLM_PROVIDER = Symbol('AI_LLM_PROVIDER');
