import { AiLlmPrompt } from '../llm/ai-llm.types';

export type AiSafetyRiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AiSafetyClassification =
  | 'SAFE'
  | 'LOW_RISK'
  | 'NEEDS_REVIEW'
  | 'BLOCKED';

export type AiPromptInjectionAssessment = {
  riskLevel: AiSafetyRiskLevel;
  riskScore: number;
  triggers: string[];
};

export type AiSafetyMetadata = {
  promptVersion: string;
  promptId?: string;
  promptReleaseDate?: string;
  promptStatus?: string;
  promptAuthor?: string;
  promptDescription?: string;
  safetyVersion: string;
  contextVersion: string;
  provider: string;
  model: string;
  timestamp: string;
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
  promptSizeChars: number;
  contextSizeChars: number;
  riskLevel: AiSafetyRiskLevel;
  classification: AiSafetyClassification;
  redactionCount: number;
  removedMessageCount: number;
};

export type AiSafetyPreparedPrompt = {
  prompt: AiLlmPrompt;
  metadata: AiSafetyMetadata;
  blocked: boolean;
  blockedReason?: 'safety' | 'input_limit';
  assessment: AiPromptInjectionAssessment;
};

export type AiSafetyValidationResult = {
  allowed: boolean;
  classification: AiSafetyClassification;
  reason?: string;
};
