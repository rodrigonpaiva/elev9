import type { AgentContextDomain, AgentIntent } from '../../agent.types';
import type { AgentPolicyEvaluation } from '../../policies/agent-policy.types';
import type { CoachExpertMetadata } from '../coach-expert.types';

export type CoachExpertRoutingConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachExpertRoutingReasonCode =
  | 'PRIMARY_INTENT_MATCH'
  | 'PRIMARY_CAPABILITY_MATCH'
  | 'PRIMARY_DOMAIN_MATCH'
  | 'PRIMARY_SCORE_MATCH'
  | 'NO_PRIMARY_SELECTED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'COMPLEMENTARY_RULE'
  | 'DEPENDENCY_RULE'
  | 'MAX_EXPERT_LIMIT'
  | 'DUPLICATE_REMOVED'
  | 'DISABLED_EXPERT'
  | 'UNSUPPORTED_EXPERT'
  | 'POLICY_BLOCKED_EXPERT'
  | 'NO_MATCHING_COMBINATION'
  | 'CYCLE_DETECTED'
  | 'ROUTE_INVALID'
  | 'FALLBACK_ROUTE';

export type CoachExpertRoutingReason = Readonly<{
  code: CoachExpertRoutingReasonCode;
  expertId?: string;
  details?: Readonly<Record<string, unknown>>;
}>;

export type CoachExpertRoutingRole = 'PRIMARY' | 'COMPLEMENTARY' | 'DEPENDENCY';

export type CoachExpertSelection = Readonly<{
  expert: CoachExpertMetadata;
  role: CoachExpertRoutingRole;
  sequence: number;
  reasonCodes: readonly CoachExpertRoutingReasonCode[];
  sourceExpertId?: string;
}>;

export type CoachExpertRoute = Readonly<{
  primaryExpert: CoachExpertSelection | null;
  complementaryExperts: readonly CoachExpertSelection[];
  orderedExperts: readonly CoachExpertSelection[];
  blockedExperts: readonly CoachExpertSelection[];
  skippedExperts: readonly CoachExpertSelection[];
}>;

export type CoachExpertCombinationRule = Readonly<{
  leftExpertId: string;
  rightExpertId: string;
  allowed: boolean;
  reasonCode: CoachExpertRoutingReasonCode;
}>;

export type CoachExpertRoutingContext = Readonly<{
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateExperts: readonly CoachExpertMetadata[];
  policyEvaluation: AgentPolicyEvaluation;
  maxExperts: number;
}>;

export type CoachExpertRoutingMetadata = Readonly<{
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateExpertIds: readonly string[];
  allowedExpertIds: readonly string[];
  blockedExpertIds: readonly string[];
  skippedExpertIds: readonly string[];
  primaryExpertId?: string;
  complementaryExpertIds: readonly string[];
  orderedExpertIds: readonly string[];
  routeValid: boolean;
  validationIssues: readonly string[];
  selectedExpertCount: number;
  candidateExpertCount: number;
  blockedExpertCount: number;
  skippedExpertCount: number;
  estimatedCost: number;
  estimatedLatencyMs: number;
  confidence: CoachExpertRoutingConfidence;
  maxExperts: number;
  route: CoachExpertRoute;
}>;

export type CoachExpertRoutingDecision = Readonly<{
  primaryExpert: CoachExpertMetadata | null;
  complementaryExperts: readonly CoachExpertMetadata[];
  orderedExperts: readonly CoachExpertMetadata[];
  blockedExperts: readonly CoachExpertMetadata[];
  skippedExperts: readonly CoachExpertMetadata[];
  routingReasons: readonly CoachExpertRoutingReason[];
  estimatedCost: number;
  estimatedLatencyMs: number;
  confidence: CoachExpertRoutingConfidence;
  route: CoachExpertRoute;
  metadata: CoachExpertRoutingMetadata;
}>;
