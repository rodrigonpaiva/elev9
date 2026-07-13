import type {
  AgentContextDomain,
  AgentIntent,
  AgentSafetyMetadata,
} from '../agent.types';
import type { AgentPlan } from '../agent.types';
import type { AgentPolicyEvaluation } from '../policies/agent-policy.types';
import type { UserHealthContext } from '../context-builder/build-user-health-context.service';
import type { PersonalizationPromptPayload } from '../../../../../shared/mappers';
import type { CoachExpertCompositionResult } from '../experts/composition/coach-expert-composition.types';
import type { CoachExpertRoutingDecision } from '../experts/coach-expert-router';
import type { CoachPersonaGuidance } from '../persona/coach-persona-engine';

export type CoachEvidenceImportance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CoachEvidenceAvailability = 'AVAILABLE' | 'PARTIAL' | 'MISSING';

export type CoachEvidenceSource =
  | 'EXPERT'
  | 'COMPOSITION'
  | 'PERSONA'
  | 'RUNTIME'
  | 'POLICY'
  | 'HEALTH_CONTEXT'
  | 'PERSONALIZATION';

export type CoachEvidenceType =
  | 'WORKOUT_HISTORY'
  | 'WORKOUT_COMPLETION'
  | 'RECOVERY_CHECK_IN'
  | 'RECOVERY_SNAPSHOT'
  | 'NUTRITION_PROFILE'
  | 'GOAL_PROGRESS'
  | 'HABIT_STREAK'
  | 'WEEKLY_PROGRESS'
  | 'RECENT_MILESTONE'
  | 'PLATEAU_SIGNAL'
  | 'SAFETY_RISK'
  | 'CONFLICTING_GUIDANCE'
  | 'PERSONALIZATION_SIGNAL'
  | 'RUNTIME_COMPLETENESS'
  | 'POLICY_RESTRICTION'
  | 'EXPERT_CONTRIBUTION';

export type CoachExplanationReasonCategory =
  | 'SAFETY'
  | 'RECOVERY'
  | 'PERFORMANCE'
  | 'CONSISTENCY'
  | 'PROGRESS'
  | 'GOALS'
  | 'NUTRITION'
  | 'WORKOUT';

export type CoachEvidence = Readonly<{
  type: CoachEvidenceType;
  source: CoachEvidenceSource;
  expert?: string;
  importance: CoachEvidenceImportance;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  availability: CoachEvidenceAvailability;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachDecisionReason = Readonly<{
  code: string;
  decisionType:
    | 'FOCUS'
    | 'TONE'
    | 'VERBOSITY'
    | 'DIRECTIVE_LEVEL'
    | 'EMPATHY_LEVEL'
    | 'ENCOURAGEMENT_LEVEL'
    | 'TECHNICAL_DEPTH'
    | 'URGENCY'
    | 'CELEBRATION_LEVEL'
    | 'SAFETY_LEVEL';
  supportingEvidence: readonly CoachEvidence[];
  supportingExperts: readonly string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasonCategory: CoachExplanationReasonCategory;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachRecommendationReason = Readonly<{
  recommendationCode: string;
  supportingEvidence: readonly CoachEvidence[];
  supportingExperts: readonly string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasonCategory: CoachExplanationReasonCategory;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachRiskExplanation = Readonly<{
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  supportingEvidence: readonly CoachEvidence[];
  supportingExperts: readonly string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachConfidenceExplanation = Readonly<{
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  supportingEvidenceCount: number;
  supportingExpertCount: number;
  missingEvidenceCount: number;
  policyRestrictions: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachConflictExplanation = Readonly<{
  conflictType: string;
  experts: readonly string[];
  resolution: Readonly<{
    strategy: string;
    winnerExpertId?: string;
    winnerRecommendationCode?: string;
    metadata: Readonly<Record<string, unknown>>;
  }>;
  resolvedBy: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachMissingEvidence = Readonly<{
  type: string;
  source: CoachEvidenceSource;
  availability: CoachEvidenceAvailability;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type CoachExplainabilityMetadata = Readonly<{
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  primaryExpertId?: string;
  participatingExpertIds: readonly string[];
  supportingExpertIds: readonly string[];
  routeConfidence: string;
  policyApproved: boolean;
  policyBlocked: boolean;
  policyFallbackRequired: boolean;
  runtimeCompleteness: 'FULL' | 'PARTIAL' | 'EMPTY';
  evidenceCount: number;
  explanationCount: number;
  recommendationCount: number;
  riskCount: number;
  conflictCount: number;
  missingEvidenceCount: number;
  blockedExpertCount: number;
  blockedRecommendationCount: number;
  personaTone: string;
  personaFocus: string;
  personaSafetyLevel: string;
  personaUrgency: string;
  explanationVersion: string;
}>;

export type CoachExplanation = Readonly<{
  primaryExpertId?: string;
  participatingExperts: readonly string[];
  supportingExperts: readonly string[];
  evidence: readonly CoachEvidence[];
  decisionReasons: readonly CoachDecisionReason[];
  recommendationReasons: readonly CoachRecommendationReason[];
  riskExplanations: readonly CoachRiskExplanation[];
  confidenceExplanation: CoachConfidenceExplanation;
  conflictExplanations: readonly CoachConflictExplanation[];
  missingEvidence: readonly CoachMissingEvidence[];
  metadata: CoachExplainabilityMetadata;
}>;

export type CoachExplainabilityEngineInput = Readonly<{
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  unifiedCoachIntelligence?: CoachExpertCompositionResult;
  coachPersonaGuidance?: CoachPersonaGuidance;
  routingDecision?: CoachExpertRoutingDecision;
  runtimeMetadata: Readonly<{
    planningDurationMs?: number;
    orchestrationDurationMs?: number;
    expertExecutionDurationMs?: number;
    executionDurationMs?: number;
    stepCount?: number;
    responseMode?: AgentPlan['responseMode'];
  }>;
  healthContext: UserHealthContext;
  personalization?: PersonalizationPromptPayload;
  safetyDecisions: Readonly<{
    policyEvaluation: AgentPolicyEvaluation;
    safetyMetadata: AgentSafetyMetadata;
  }>;
}>;
