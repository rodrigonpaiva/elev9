import type { AgentContextDomain, AgentIntent } from '../../agent.types';
import type { AgentPolicyEvaluation } from '../../agent/policies/agent-policy.types';
import type { AgentPlan } from '../../agent.types';
import type {
  CoachExpertContribution,
  CoachExpertMetadata,
  CoachExpertResult,
} from '../coach-expert.types';
import type { CoachExpertRoutingDecision } from '../router/coach-expert-router.types';

export type CoachUnifiedRiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'UNKNOWN';

export type CoachUnifiedConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachUnifiedRecommendationCategory =
  | 'PRIMARY'
  | 'SAFETY_CRITICAL'
  | 'SUPPORTING'
  | 'INFORMATIONAL';

export type CoachCompositionConflictType =
  | 'WORKOUT_VS_RECOVERY'
  | 'WORKOUT_VS_GOAL'
  | 'NUTRITION_VS_GOAL'
  | 'GOAL_ALIGNMENT_MISMATCH'
  | 'UNKNOWN';

export type CoachCompositionConflictSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type CoachCompositionResolutionStrategy =
  | 'SAFETY'
  | 'POLICY'
  | 'PRIMARY_EXPERT'
  | 'HIGHER_CONFIDENCE'
  | 'EARLIER_EXECUTION_ORDER'
  | 'NONE';

export type CoachCompositionConflictResolution = Readonly<{
  strategy: CoachCompositionResolutionStrategy;
  winnerExpertId?: string;
  winnerRecommendationCode?: string;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachUnifiedAssessment = Readonly<{
  summary: string;
  keyFindings: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachUnifiedRisk = Readonly<{
  level: CoachUnifiedRiskLevel;
  summary: string;
  factors: readonly string[];
  sources: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachUnifiedConfidence = Readonly<{
  level: CoachUnifiedConfidenceLevel;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachUnifiedRecommendation = Readonly<{
  code: string;
  summary: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: CoachUnifiedRecommendationCategory;
  sourceExperts: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachCompositionConflict = Readonly<{
  type: CoachCompositionConflictType;
  experts: readonly string[];
  severity: CoachCompositionConflictSeverity;
  resolution: CoachCompositionConflictResolution;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachExpertContributionSummary = Readonly<{
  expertId: string;
  expertName: string;
  role: 'PRIMARY' | 'COMPLEMENTARY' | 'DEPENDENCY';
  sequence: number;
  summary: string;
  recommendationCodes: readonly string[];
  riskLevels: readonly CoachUnifiedRiskLevel[];
  confidence: CoachUnifiedConfidenceLevel;
  keyFindings: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachCompositionMetadata = Readonly<{
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  primaryExpertId?: string;
  participatingExpertIds: readonly string[];
  supportingExpertIds: readonly string[];
  blockedExpertIds: readonly string[];
  skippedExpertIds: readonly string[];
  routeValid: boolean;
  routeConfidence: string;
  policyApproved: boolean;
  policyBlocked: boolean;
  policyFallbackRequired: boolean;
  candidateExpertCount: number;
  participatingExpertCount: number;
  recommendationCount: number;
  riskCount: number;
  conflictCount: number;
  expertResultCount: number;
  expertContributionCount: number;
  compositionDurationMs: number;
  planningDurationMs?: number;
  orchestrationDurationMs?: number;
  expertExecutionDurationMs?: number;
  executionDurationMs?: number;
  runtimeCompleteness: 'FULL' | 'PARTIAL' | 'EMPTY';
}>;

export type CoachExpertCompositionInput = Readonly<{
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  routingDecision: CoachExpertRoutingDecision;
  policyEvaluation: AgentPolicyEvaluation;
  expertResults: readonly CoachExpertResult[];
  expertContributions: readonly CoachExpertContribution[];
  runtimeMetadata: Readonly<{
    plan: AgentPlan;
    selectedDomains: readonly AgentContextDomain[];
    expertResults: readonly CoachExpertResult[];
    expertContributions: readonly CoachExpertContribution[];
    expertExecutionDurationMs: number;
  }>;
  executionMetadata: Readonly<{
    planningDurationMs: number;
    orchestrationDurationMs: number;
    expertExecutionDurationMs: number;
    executionDurationMs?: number;
  }>;
}>;

export type CoachExpertCompositionResult = Readonly<{
  primaryExpert: CoachExpertMetadata | null;
  participatingExperts: readonly CoachExpertContributionSummary[];
  assessment: CoachUnifiedAssessment;
  summary: string;
  keyFindings: readonly string[];
  recommendations: readonly CoachUnifiedRecommendation[];
  risks: readonly CoachUnifiedRisk[];
  confidence: CoachUnifiedConfidence;
  conflicts: readonly CoachCompositionConflict[];
  supportingExperts: readonly CoachExpertContributionSummary[];
  metadata: CoachCompositionMetadata;
}>;
