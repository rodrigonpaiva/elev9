import type {
  AgentContextDomain,
  AgentIntent,
  AgentRequest,
} from '../agent.types';
import type {
  AgentExecutionLifecycleEvent,
  AgentExecutionStep,
} from '../execution/agent-execution.types';
import type { AgentMemoryMetadata } from '../memory/agent-memory.types';
import type { CoachExpertRoutingConfidence } from '../../experts/coach-expert-router';
import type {
  AgentPolicyEvaluation,
  AgentPolicyViolation,
} from '../policies/agent-policy.types';
import type { AgentExecutionStrategy } from '../planning/agent-planning.types';
import type {
  AgentToolExecutionMetrics,
  AgentToolExecutionResult,
  AgentToolExecutionStatus,
} from '../tools/agent-tool-execution.types';

export type AgentTraceLifecycle =
  | 'AGENT_STARTED'
  | 'INTENT_CLASSIFIED'
  | 'CONTEXT_SELECTED'
  | 'ROUTING_STARTED'
  | 'ROUTING_COMPLETED'
  | 'ROUTING_FAILED'
  | 'COMPOSITION_STARTED'
  | 'COMPOSITION_COMPLETED'
  | 'COMPOSITION_FAILED'
  | 'PERSONA_STARTED'
  | 'PERSONA_COMPLETED'
  | 'PERSONA_FAILED'
  | 'EXPLAINABILITY_STARTED'
  | 'EXPLAINABILITY_COMPLETED'
  | 'EXPLAINABILITY_FAILED'
  | 'POLICY_EVALUATED'
  | 'PLAN_CREATED'
  | 'PLAN_VALIDATED'
  | 'TOOL_SELECTED'
  | 'TOOL_EXECUTED'
  | 'TOOL_SKIPPED'
  | 'STEP_STARTED'
  | 'STEP_COMPLETED'
  | 'STEP_FAILED'
  | 'MEMORY_SNAPSHOT_CREATED'
  | 'LLM_CALLED'
  | 'FALLBACK_USED'
  | 'AGENT_COMPLETED'
  | 'AGENT_ABORTED';

export type AgentTraceStatus = 'RUNNING' | 'COMPLETED' | 'ABORTED' | 'FAILED';

export type AgentTraceEvent = {
  event: AgentTraceLifecycle;
  timestamp: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type AgentTraceMetrics = {
  totalDurationMs: number;
  planningDurationMs: number;
  contextOrchestrationDurationMs: number;
  executionDurationMs: number;
  toolExecutionDurationMs: number;
  memoryDurationMs: number;
  llmDurationMs: number;
  selectedDomainCount: number;
  candidateExpertCount: number;
  selectedExpertCount: number;
  rejectedExpertCount: number;
  candidateToolCount: number;
  selectedToolCount: number;
  executedToolCount: number;
  skippedToolCount: number;
  failedToolCount: number;
  policyViolationCount: number;
  fallbackCount: number;
};

export type AgentTracePolicySnapshot = {
  stage: 'CONTEXT' | 'PLANNING' | 'EXECUTION';
  approved: boolean;
  blocked: boolean;
  fallbackRequired: boolean;
  allowedLLM: boolean;
  allowedDomains: readonly AgentContextDomain[];
  blockedDomains: readonly AgentContextDomain[];
  allowedTools: readonly string[];
  blockedTools: readonly string[];
  candidateExpertIds: readonly string[];
  selectedExpertIds: readonly string[];
  allowedExpertIds: readonly string[];
  blockedExpertIds: readonly string[];
  reason: string;
  actions: readonly string[];
  violations: readonly AgentPolicyViolation[];
  policyEvaluation: AgentPolicyEvaluation;
};

export type AgentTraceToolResultSummary = {
  toolId: string;
  status: AgentToolExecutionStatus;
  summary: string;
  durationMs: number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
};

export type AgentTraceToolSnapshot = {
  enabled: boolean;
  maxToolCalls: number;
  timeoutMs: number;
  candidateToolIds: readonly string[];
  selectedToolIds: readonly string[];
  executedToolIds: readonly string[];
  skippedToolIds: readonly string[];
  failedToolIds: readonly string[];
  timeoutToolIds: readonly string[];
  estimatedCost: number;
  estimatedLatencyMs: number;
  metrics: AgentToolExecutionMetrics;
  results: readonly AgentTraceToolResultSummary[];
};

export type AgentTraceMemorySnapshot = {
  metadata: AgentMemoryMetadata;
};

export type AgentTraceExecutionSnapshot = {
  strategy: AgentExecutionStrategy;
  currentStep?: string;
  completedStepCount: number;
  failedStepCount: number;
  skippedStepCount: number;
  executedStepCount: number;
  stepCount: number;
  fallbackUsed: boolean;
  executionDurationMs: number;
  steps: readonly AgentExecutionStep[];
  lifecycleEvents: readonly AgentExecutionLifecycleEvent[];
  toolExecutionMetrics?: AgentToolExecutionMetrics;
};

export type AgentTraceSummary = {
  traceId: string;
  requestId: string;
  conversationId: string;
  userIdHash: string;
  requestTimestamp: string;
  runtimeEnabled: boolean;
  toolsEnabled: boolean;
  detectedIntent?: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateExpertIds: readonly string[];
  selectedExpertIds: readonly string[];
  rejectedExpertIds: readonly string[];
  expertSelectionReason?: string;
  primaryExpertId?: string;
  complementaryExpertIds: readonly string[];
  orderedExpertIds: readonly string[];
  blockedExpertIds: readonly string[];
  skippedExpertIds: readonly string[];
  routingConfidence?: CoachExpertRoutingConfidence;
  candidateToolIds: readonly string[];
  selectedToolIds: readonly string[];
  executionStrategy?: AgentExecutionStrategy;
  fallbackUsed: boolean;
  durationMs?: number;
  status: AgentTraceStatus;
};

export type AgentTrace = {
  traceId: string;
  requestId: string;
  conversationId: string;
  userIdHash: string;
  requestTimestamp: string;
  runtimeEnabled: boolean;
  toolsEnabled: boolean;
  detectedIntent?: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateExpertIds: readonly string[];
  selectedExpertIds: readonly string[];
  rejectedExpertIds: readonly string[];
  expertSelectionReason?: string;
  complementaryExpertIds: readonly string[];
  orderedExpertIds: readonly string[];
  blockedExpertIds: readonly string[];
  skippedExpertIds: readonly string[];
  candidateToolIds: readonly string[];
  selectedToolIds: readonly string[];
  executionStrategy?: AgentExecutionStrategy;
  fallbackUsed: boolean;
  durationMs?: number;
  status: AgentTraceStatus;
  summary: AgentTraceSummary;
  metrics: AgentTraceMetrics;
  events: readonly AgentTraceEvent[];
  policySnapshot?: AgentTracePolicySnapshot;
  toolSnapshot?: AgentTraceToolSnapshot;
  memorySnapshot?: AgentTraceMemorySnapshot;
  executionSnapshot?: AgentTraceExecutionSnapshot;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type AgentTraceStartInput = {
  request: AgentRequest;
  runtimeEnabled: boolean;
  toolsEnabled: boolean;
  requestTimestamp: string;
};
