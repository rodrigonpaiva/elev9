import { AiLlmTokenUsage } from '../llm/ai-llm.types';
import { AiSafetyClassification } from '../safety/ai-safety.types';

export const AI_COACH_CHAT_PROMPT_ID = 'coach-chat';

export type AiPromptVersionStatus = 'active' | 'previous' | 'deprecated';

export type AiPromptVersionMetadata = {
  promptId: string;
  version: string;
  releaseDate: string;
  status: AiPromptVersionStatus;
  author: string;
  description: string;
};

export type AiPromptRegistryEntry = {
  promptId: string;
  currentActiveVersion: string;
  previousVersion?: string;
  versions: AiPromptVersionMetadata[];
};

export type AiRolloutAssignment = {
  experimentId: string;
  promptId: string;
  currentPromptVersion: string;
  previousPromptVersion?: string;
  selectedPromptVersion: string;
  currentProvider: string;
  previousProvider?: string;
  selectedProvider: string;
  currentModel: string;
  previousModel?: string;
  selectedModel: string;
  canaryBucket: number;
  canaryPercentage: number;
  streamingEnabled: boolean;
  structuredOutputsEnabled: boolean;
  toolCallingEnabled: boolean;
  futureMemoryEnabled: boolean;
  rolloutVariant: 'current' | 'previous';
};

export type AiEvaluationGoldenPrompt = {
  id: string;
  description: string;
  promptId: string;
  message: string;
  expectedClassification: AiSafetyClassification;
  expectedFallback: boolean;
  expectedConversationContinuity: boolean;
};

export type AiEvaluationObservation = {
  id: string;
  promptId: string;
  promptVersion: string;
  provider: string;
  model: string;
  expectedClassification: AiSafetyClassification;
  expectedFallback: boolean;
  safetyBlocked: boolean;
  fallbackUsed: boolean;
  outputValid: boolean;
  matchesExpectation: boolean;
  latencyMs: number;
  tokenUsage?: AiLlmTokenUsage;
  estimatedCost: number | 'unknown';
};

export type AiEvaluationReport = {
  runId: string;
  evaluatedAt: string;
  experimentId: string;
  promptId: string;
  promptVersion: string;
  provider: string;
  model: string;
  requests: number;
  failures: number;
  fallbacks: number;
  safetyBlocks: number;
  averageLatencyMs: number;
  averageTokens: number | 'unknown';
  averageCost: number | 'unknown';
  successRate: number;
  observations: AiEvaluationObservation[];
};
