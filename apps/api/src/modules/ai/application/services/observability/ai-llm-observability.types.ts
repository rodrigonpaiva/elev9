import { AiLlmTokenUsage } from '../llm/ai-llm.types';

export type AiLlmRequestLifecycle = {
  requestId: string;
  conversationId?: string;
  userIdHash?: string;
  provider: string;
  model: string;
  promptVersion: string;
  safetyVersion: string;
  promptId?: string;
  promptReleaseDate?: string;
  promptStatus?: string;
  promptAuthor?: string;
  promptDescription?: string;
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
  createdAt: string;
  updatedAt: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  retryCount: number;
  success: boolean;
  failureReason?: string;
  fallbackUsed: boolean;
  tokenUsage?: AiLlmTokenUsage;
  estimatedCost?: number | 'unknown';
};

export type AiLlmUsageReportProviderUsage = Record<string, number>;

export type AiLlmUsageReportModelUsage = Record<string, number>;

export type AiLlmUsageReport = {
  day: string;
  requests: number;
  failures: number;
  safetyBlocks: number;
  fallbacks: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  p95LatencyMs: number | 'unknown';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  providerUsage: AiLlmUsageReportProviderUsage;
  modelUsage: AiLlmUsageReportModelUsage;
};

export type AiLlmObservabilityRequestContext = {
  requestId: string;
  conversationId?: string;
  userIdHash?: string;
  provider: string;
  model: string;
  promptVersion: string;
  safetyVersion: string;
  promptId?: string;
  promptReleaseDate?: string;
  promptStatus?: string;
  promptAuthor?: string;
  promptDescription?: string;
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
  retryCount: number;
  fallbackUsed: boolean;
  startTime: string;
};

export type AiLlmObservabilityAttemptContext =
  AiLlmObservabilityRequestContext & {
    attempt: number;
    startTime: string;
  };

export type AiLlmObservabilityLatencyContext =
  AiLlmObservabilityRequestContext & {
    durationMs: number;
  };

export type AiLlmObservabilityFailureContext =
  AiLlmObservabilityAttemptContext & {
    durationMs: number;
    errorCode: string;
  };

export type AiLlmObservabilitySuccessContext =
  AiLlmObservabilityAttemptContext & {
    durationMs: number;
    tokenUsage: AiLlmTokenUsage | undefined;
    estimatedCost: number | 'unknown';
  };

export type AiLlmObservabilitySafetyContext = {
  requestId: string;
  conversationId?: string;
  userIdHash?: string;
  provider: string;
  model: string;
  promptVersion: string;
  safetyVersion: string;
  classification: string;
  reason: string;
};

export type AiLlmObservabilityRetryContext =
  AiLlmObservabilityRequestContext & {
    attempt: number;
    errorCode: string;
  };

export type AiLlmObservabilityFallbackContext =
  AiLlmObservabilityRequestContext & {
    durationMs: number;
    errorCode: string;
    reason: string;
  };

export type AiLlmObservabilityCircuitContext =
  AiLlmObservabilityRequestContext & {
    reason: string;
  };

export type AiLlmObservabilityStreamContext =
  AiLlmObservabilityRequestContext & {
    durationMs?: number;
    tokenUsage?: AiLlmTokenUsage;
    estimatedCost?: number | 'unknown';
  };

export type AiLlmObservabilityStreamInterruptedContext =
  AiLlmObservabilityStreamContext & {
    durationMs: number;
    reason: string;
  };
