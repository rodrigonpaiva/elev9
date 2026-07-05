export type AiLlmMessageRole = 'system' | 'user' | 'assistant';

export type AiLlmMessage = {
  role: AiLlmMessageRole;
  content: string;
};

export type AiLlmTokenCount = number | 'unknown';

export type AiLlmTokenUsage = {
  promptTokens: AiLlmTokenCount;
  completionTokens: AiLlmTokenCount;
  totalTokens: AiLlmTokenCount;
};

export type AiLlmPromptTrace = {
  requestId?: string;
  conversationId?: string;
  userIdHash?: string;
  experimentId?: string;
  canaryBucket?: number;
  rolloutVariant?: 'current' | 'previous';
};

export type AiLlmPromptMetadata = {
  promptId?: string;
  promptReleaseDate?: string;
  promptStatus?: string;
  promptAuthor?: string;
  promptDescription?: string;
  safetyVersion?: string;
  contextVersion?: string;
  timestamp?: string;
  experimentId?: string;
  canaryBucket?: number;
  canaryPercentage?: number;
  streamingEnabled?: boolean;
  structuredOutputsEnabled?: boolean;
  toolCallingEnabled?: boolean;
  futureMemoryEnabled?: boolean;
  currentPromptVersion?: string;
  previousPromptVersion?: string;
  currentProvider?: string;
  previousProvider?: string;
  currentModel?: string;
  previousModel?: string;
  provider?: string;
  model?: string;
};

export type AiLlmPrompt = {
  promptVersion: string;
  messages: AiLlmMessage[];
  trace?: AiLlmPromptTrace;
  metadata?: AiLlmPromptMetadata;
  signal?: AbortSignal;
};

export type AiLlmGenerateReplyInput = {
  messages: AiLlmMessage[];
  model: string;
  signal?: AbortSignal;
};

export type AiLlmGenerateStreamReplyInput = AiLlmGenerateReplyInput & {
  onDelta?: (delta: string) => void;
};

export type AiLlmProviderReply = {
  content: string;
  usage?: AiLlmTokenUsage;
};

export type AiLlmProviderCapabilities = {
  streaming: boolean;
  structuredOutputs: boolean;
  toolCalling: boolean;
  imageInput: boolean;
};

export type AiLlmGenerateReplyResult = {
  content: string;
  provider: string;
  model: string;
  promptVersion: string;
  usage?: AiLlmTokenUsage;
};

export interface AiLlmProvider {
  generateReply(input: AiLlmGenerateReplyInput): Promise<AiLlmProviderReply>;
  streamReply(
    input: AiLlmGenerateStreamReplyInput,
  ): Promise<AiLlmProviderReply>;
}

export const AI_LLM_PROVIDER = Symbol('AI_LLM_PROVIDER');
