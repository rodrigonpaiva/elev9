import type { AgentContextDomain, AgentIntent } from '../../agent/agent.types';
import type { AgentPolicyEvaluation } from '../../agent/policies/agent-policy.types';
import type { CoachExpertMetadata } from '../coach-expert.types';
import type {
  CoachExpertContribution,
  CoachExpertResult,
} from '../coach-expert.types';
import type { CoachExpertRoutingDecision } from '../router/coach-expert-router.types';
import type { CoachExpertCompositionResult } from '../composition/coach-expert-composition.types';
import type { CoachPersonaGuidance } from '../../persona/coach-persona-engine.types';
import type { CoachExplanation } from '../../explainability/coach-explainability.types';
import type { CoachUnifiedConfidenceLevel } from '../composition/coach-expert-composition.types';

export type CoachExpertExecutionStatus =
  | 'NOT_SELECTED'
  | 'SELECTED'
  | 'EXECUTED'
  | 'SKIPPED'
  | 'BLOCKED'
  | 'FAILED';

export type CoachExpertHealthSummary = Readonly<{
  expertId: string;
  healthy: boolean;
  degraded: boolean;
  failing: boolean;
  disabled: boolean;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachExpertExecutionSummary = Readonly<{
  expertId: string;
  expertName: string;
  executionStatus: CoachExpertExecutionStatus;
  selected: boolean;
  executed: boolean;
  duration: number;
  contributionCount: number;
  recommendationCount: number;
  riskCount: number;
  confidence: CoachUnifiedConfidenceLevel | 'UNKNOWN';
  conflicts: number;
  missingEvidence: number;
  timestamp: string;
  health: CoachExpertHealthSummary;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachExpertContributionSummary = Readonly<{
  recommendations: number;
  risks: number;
  findings: number;
  alerts: number;
  strengths: number;
  weaknesses: number;
  confidence: CoachUnifiedConfidenceLevel | 'UNKNOWN';
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachExpertLatencySummary = Readonly<{
  routing: number;
  execution: number;
  composition: number;
  persona: number;
  explainability: number;
  promptAssembly: number;
  total: number;
}>;

export type CoachExpertConflictSummary = Readonly<{
  expertA: string;
  expertB: string;
  conflictType: string;
  resolution: string;
  resolved: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachExpertMetrics = Readonly<{
  totalExperts: number;
  selectedExperts: number;
  executedExperts: number;
  skippedExperts: number;
  blockedExperts: number;
  failedExperts: number;
  averageLatency: number;
  totalLatency: number;
  highestRiskExpert?: string;
  highestConfidenceExpert?: string;
  primaryExpert?: string;
  compositionDuration: number;
  personaDuration: number;
  explainabilityDuration: number;
}>;

export type CoachExpertTraceStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export type CoachExpertTrace = Readonly<{
  traceId: string;
  requestId?: string;
  conversationId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateExpertIds: readonly string[];
  routedExpertIds: readonly string[];
  executedExpertIds: readonly string[];
  skippedExpertIds: readonly string[];
  blockedExpertIds: readonly string[];
  failedExpertIds: readonly string[];
  primaryExpert?: string;
  participatingExperts: readonly string[];
  supportingExperts: readonly string[];
  executionSummaries: readonly CoachExpertExecutionSummary[];
  contributionSummary: CoachExpertContributionSummary;
  latencySummary: CoachExpertLatencySummary;
  conflicts: readonly CoachExpertConflictSummary[];
  metrics: CoachExpertMetrics;
  status: CoachExpertTraceStatus;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
}>;

export type CoachExpertTraceCandidateSnapshot = Readonly<{
  expertId: string;
  displayName: string;
  enabled: boolean;
  estimatedLatencyMs: number;
  priority: number;
}>;

export type CoachExpertObservabilityStartInput = Readonly<{
  requestId: string;
  conversationId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateExperts: readonly CoachExpertMetadata[];
  routingDecision: CoachExpertRoutingDecision;
  policyEvaluation: AgentPolicyEvaluation;
  runtimeMetadata: Readonly<{
    routingDurationMs?: number;
    planningDurationMs?: number;
    orchestrationDurationMs?: number;
    executionDurationMs?: number;
    compositionDurationMs?: number;
    personaDurationMs?: number;
    explainabilityDurationMs?: number;
    promptAssemblyDurationMs?: number;
    totalDurationMs?: number;
  }>;
}>;

export type CoachExpertObservabilityCompleteInput = Readonly<{
  requestId: string;
  expertResults: readonly CoachExpertResult[];
  expertContributions: readonly CoachExpertContribution[];
  composition?: CoachExpertCompositionResult;
  personaGuidance?: CoachPersonaGuidance;
  explanation?: CoachExplanation;
  runtimeMetadata: Readonly<{
    routingDurationMs?: number;
    executionDurationMs?: number;
    compositionDurationMs?: number;
    personaDurationMs?: number;
    explainabilityDurationMs?: number;
    promptAssemblyDurationMs?: number;
    totalDurationMs?: number;
  }>;
}>;
