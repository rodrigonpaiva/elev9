import type {
  AgentAction,
  AgentContextDomain,
  AgentIntent,
  AgentSafetyConstraint,
  AgentToolDescriptor,
} from '../agent.types';
import type { CoachExpertMetadata } from '../../experts/coach-expert.types';
import type { CoachExpertRoutingDecision } from '../../experts/coach-expert-router';
import type { AgentPolicyEvaluation } from '../policies/agent-policy.types';

export type AgentExecutionStrategy =
  | 'DIRECT_REPLY'
  | 'SINGLE_CONTEXT'
  | 'MULTI_CONTEXT'
  | 'MEMORY_ENRICHED'
  | 'COACH_GUIDED'
  | 'FALLBACK_ONLY';

export type AgentPlanningStepName =
  | 'CLASSIFY_INTENT'
  | 'SELECT_CONTEXT'
  | 'SELECT_TOOLS'
  | 'VALIDATE_PLAN'
  | 'LOAD_CONTEXT'
  | 'BUILD_PROMPT'
  | 'CALL_LLM'
  | 'GENERATE_FALLBACK'
  | 'PERSIST_MESSAGES'
  | 'UPDATE_MEMORY'
  | 'COMPLETE';

export type AgentPlanningStep = {
  step: AgentPlanningStepName;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type AgentPlanningValidationStatus = 'valid' | 'invalid';

export type AgentPlanningValidationResult = {
  status: AgentPlanningValidationStatus;
  issues: string[];
};

export type AgentPlanningPolicyDecision = {
  executionStrategy: AgentExecutionStrategy;
  planningSteps: readonly AgentPlanningStep[];
  safetyConstraints: readonly AgentSafetyConstraint[];
  maximumExecutionDepth: number;
  expectedCost: number;
  expectedLatencyMs: number;
};

export type AgentPlannedToolSet = {
  candidateTools: readonly AgentToolDescriptor[];
  selectedTools: readonly AgentToolDescriptor[];
};

export type AgentPlanningInput = {
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateExperts: readonly CoachExpertMetadata[];
  selectedExperts: readonly CoachExpertMetadata[];
  expertRouting: CoachExpertRoutingDecision;
  candidateTools: readonly AgentToolDescriptor[];
  selectedTools: readonly AgentToolDescriptor[];
  actions: readonly AgentAction[];
  responseMode: 'standard' | 'stream';
  policyEvaluation: AgentPolicyEvaluation;
};
