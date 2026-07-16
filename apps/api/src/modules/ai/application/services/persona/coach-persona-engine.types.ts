import type {
  AgentContextDomain,
  AgentIntent,
  AgentSafetyMetadata,
} from '../agent/agent.types';
import type { AgentPlan } from '../agent/agent.types';
import type { AgentPolicyEvaluation } from '../agent/policies/agent-policy.types';
import type { UserHealthContext } from '../context-builder/build-user-health-context.service';
import type { PersonalizationPromptPayload } from '../../../../../shared/mappers';
import type { CoachExpertCompositionResult } from '../experts/composition/coach-expert-composition.types';
import type { CoachExpertRoutingDecision } from '../experts/coach-expert-router';

export type CoachTone =
  | 'SUPPORTIVE'
  | 'DIRECT'
  | 'ANALYTICAL'
  | 'CELEBRATORY'
  | 'CAUTIOUS'
  | 'CALM';

export type CoachVerbosity = 'VERY_SHORT' | 'SHORT' | 'NORMAL' | 'DETAILED';

export type CoachFocus =
  | 'WORKOUT'
  | 'RECOVERY'
  | 'NUTRITION'
  | 'GOALS'
  | 'CONSISTENCY'
  | 'PROGRESS'
  | 'MOTIVATION'
  | 'SAFETY';

export type CoachDirectiveLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachEmpathyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachEncouragementLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachTechnicalDepth = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type CoachUrgency = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CoachCelebrationLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export type CoachSafetyLevel = 'NORMAL' | 'ELEVATED' | 'STRICT';

export type CoachCommunicationStyle = Readonly<{
  tone: CoachTone;
  directiveLevel: CoachDirectiveLevel;
  empathyLevel: CoachEmpathyLevel;
  encouragementLevel: CoachEncouragementLevel;
  technicalDepth: CoachTechnicalDepth;
  urgency: CoachUrgency;
  celebrationLevel: CoachCelebrationLevel;
  safetyLevel: CoachSafetyLevel;
}>;

export type CoachPersonaProfile = Readonly<{
  communicationStyle: CoachCommunicationStyle;
  focus: CoachFocus;
  verbosity: CoachVerbosity;
}>;

export type CoachPersonaMetadata = Readonly<{
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  primaryExpertId?: string;
  participatingExpertIds: readonly string[];
  supportingExpertIds: readonly string[];
  blockedExpertIds: readonly string[];
  routeConfidence: string;
  policyApproved: boolean;
  policyBlocked: boolean;
  policyFallbackRequired: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  conflictCount: number;
  recommendationCount: number;
  communicationRuleCount: number;
  runtimeCompleteness: 'FULL' | 'PARTIAL' | 'EMPTY';
  userProfileId?: string;
  activityLevel?: string;
  technicalDepthSource: string;
  toneSource: string;
  safetySource: string;
  focusSource: string;
}>;

export type CoachPersonaGuidance = Readonly<
  CoachPersonaProfile &
    CoachCommunicationStyle & {
      communicationRules: readonly string[];
      metadata: CoachPersonaMetadata;
    }
>;

export type CoachPersonaEngineInput = Readonly<{
  requestId?: string;
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  unifiedCoachIntelligence?: CoachExpertCompositionResult;
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
  userProfile?: Readonly<{
    userProfileId?: string;
    userName?: string;
    language?: string;
    timezone?: string;
  }>;
  fitnessProfile?: Readonly<{
    goal?: UserHealthContext['goal'];
    activityLevel?: UserHealthContext['activityLevel'];
    weeklyFrequency?: UserHealthContext['weeklyFrequency'];
    adherenceScore?: number;
    currentStreak?: number;
    fatigueLevel?: UserHealthContext['fatigueLevel'];
    limitations?: UserHealthContext['limitations'];
  }>;
  personalization?: PersonalizationPromptPayload;
  safetyDecisions: Readonly<{
    policyEvaluation: AgentPolicyEvaluation;
    safetyMetadata: AgentSafetyMetadata;
  }>;
}>;
