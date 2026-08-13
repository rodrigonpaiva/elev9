import type {
  AgentContextDomain,
  AgentIntent,
  AgentPlan,
  AgentRequest,
} from '../agent.types';
import type { AgentExecutionStrategy } from '../planning/agent-planning.types';
import type { AgentToolDescriptor } from '../tools/agent-tool.types';
import type { CoachExpertMetadata } from '../../experts/coach-expert.types';

export type AgentPolicyCategory =
  | 'CONTEXT'
  | 'TOOL'
  | 'LLM'
  | 'SAFETY'
  | 'COST'
  | 'MEMORY';

export type AgentPolicy = {
  id: string;
  category: AgentPolicyCategory;
  displayName: string;
  description: string;
  version: string;
};

export type AgentPolicyViolationSeverity = 'INFO' | 'WARN' | 'BLOCK';

export type AgentPolicyViolation = {
  policyId: string;
  category: AgentPolicyCategory;
  severity: AgentPolicyViolationSeverity;
  reason: string;
  metadata?: Record<string, unknown>;
};

export type AgentPolicyMetrics = {
  stage: AgentPolicyStage;
  evaluatedPolicyIds: readonly string[];
  rejectedPolicyIds: readonly string[];
  violationCount: number;
  fallbackDecisionCount: number;
  blockedDomainIds: readonly AgentContextDomain[];
  blockedToolIds: readonly string[];
  blockedExpertIds: readonly string[];
  blockedLlmUsage: boolean;
  allowedDomainCount: number;
  allowedToolCount: number;
  allowedExpertCount: number;
  candidateExpertCount: number;
  selectedExpertCount: number;
  estimatedCost: number;
  estimatedLatencyMs: number;
  maximumExecutionDepth: number;
  maxSteps: number;
  maxToolCalls: number;
  evaluationDurationMs: number;
};

export type AgentPolicyDecision = {
  approved: boolean;
  blocked: boolean;
  fallbackRequired: boolean;
  allowedTools: readonly AgentToolDescriptor[];
  allowedExperts: readonly CoachExpertMetadata[];
  allowedDomains: readonly AgentContextDomain[];
  allowedLLM: boolean;
  metadata: AgentPolicyMetrics;
};

export type AgentPolicyEvaluation = {
  decision: AgentPolicyDecision;
  violations: readonly AgentPolicyViolation[];
  reason: string;
  actions: readonly string[];
};

export type AgentPolicyStage = 'CONTEXT' | 'PLANNING' | 'EXECUTION';

export type AgentPolicyContext = {
  stage: AgentPolicyStage;
  request: AgentRequest;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateTools?: readonly AgentToolDescriptor[];
  selectedTools?: readonly AgentToolDescriptor[];
  candidateExperts?: readonly CoachExpertMetadata[];
  selectedExperts?: readonly CoachExpertMetadata[];
  plan?: AgentPlan;
  responseMode: 'standard' | 'stream';
  runtimeEnabled: boolean;
  toolsEnabled: boolean;
  llmEnabled: boolean;
  safetyMetadata?: {
    deterministicFirst: boolean;
    toolCallingEnabled: boolean;
    fallbackAllowed: boolean;
    promptVersion: string;
  };
  executionStrategy?: AgentExecutionStrategy;
  orchestrationDurationMs?: number;
  planningDurationMs?: number;
  executionDurationMs?: number;
};
