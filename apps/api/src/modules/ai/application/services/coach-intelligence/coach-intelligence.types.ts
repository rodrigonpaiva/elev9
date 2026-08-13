import type {
  CoachIntelligenceAggregate,
  CoachIntelligenceAvailabilityReasonCode,
  CoachIntelligenceSectionAvailability,
  CoachIntelligenceSectionFreshness,
  CoachIntelligenceSectionState,
  CoachIntelligenceSectionName,
  CoachIntelligenceWarning,
  CoachIntelligenceSections,
  CoachIntelligenceMetadata,
  CoachIntelligenceAvailability,
  CoachIntelligenceFreshness,
  CoachIntelligenceHeader,
  CoachIntelligenceOwnership,
  CoachIntelligenceInsight,
  CoachExpertName,
} from '@elev9/types';

import type {
  AgentContextDomain,
  AgentIntent,
  AgentRequest,
} from '../agent/agent.types';
import type { CoachExpertCompositionResult } from '../experts/composition/coach-expert-composition.types';
import type {
  CoachExpertContribution,
  CoachExpertResult,
} from '../experts/coach-expert.types';
import type { CoachExplanation } from '../explainability/coach-explainability.types';
import type { CoachPersonaGuidance } from '../persona/coach-persona-engine.types';
import type { UserHealthContext } from '../context-builder/build-user-health-context.service';
import type {
  CoachChatGoalContext,
  CoachChatLoadedContext,
  CoachChatProgressContext,
} from '../../use-cases/create-coach-chat/create-coach-chat.types';
import type { AgentPolicyEvaluation } from '../agent/policies/agent-policy.types';
import type { CoachDecisionReadModelPayload } from '../../../../../shared/mappers';

export type CoachIntelligenceSourceSectionState<TSectionData> = Readonly<
  CoachIntelligenceSectionState<TSectionData> & {
    sourceTimestamp?: string;
    fallbackUsed: boolean;
    retryable: boolean;
    reasonCode: CoachIntelligenceAvailabilityReasonCode;
    generatedAt: string;
  }
>;

export type CoachIntelligenceLoadedSectionName = Exclude<
  CoachIntelligenceSectionName,
  'insight' | 'evidence' | 'explainability'
>;

export type CoachIntelligenceSectionLoadResult<TSectionData> = Readonly<{
  sectionName: CoachIntelligenceLoadedSectionName;
  state: CoachIntelligenceSourceSectionState<TSectionData>;
  data: TSectionData | null;
  loadDurationMs: number;
}>;

export type CoachIntelligenceSectionLoadResultWithExtras<
  TSectionData,
  TExtras extends Readonly<Record<string, unknown>> = Readonly<
    Record<string, never>
  >,
> = Readonly<CoachIntelligenceSectionLoadResult<TSectionData> & TExtras>;

export type CoachIntelligenceSourceStateMap = Readonly<{
  training: CoachIntelligenceSourceSectionState<
    CoachIntelligenceSections['training']['data']
  >;
  nutrition: CoachIntelligenceSourceSectionState<
    CoachIntelligenceSections['nutrition']['data']
  >;
  recovery: CoachIntelligenceSourceSectionState<
    CoachIntelligenceSections['recovery']['data']
  >;
  goals: CoachIntelligenceSourceSectionState<
    CoachIntelligenceSections['goals']['data']
  >;
  habits: CoachIntelligenceSourceSectionState<
    CoachIntelligenceSections['habits']['data']
  >;
  progress: CoachIntelligenceSourceSectionState<
    CoachIntelligenceSections['progress']['data']
  >;
  personalization: CoachIntelligenceSourceSectionState<
    CoachIntelligenceSections['personalization']['data']
  >;
  notifications: CoachIntelligenceSourceSectionState<
    CoachIntelligenceSections['notifications']['data']
  >;
}>;

export type CoachIntelligenceSourceContext = Readonly<{
  authUserId: string;
  userProfileId: string;
  healthContext: UserHealthContext;
  coachDecision?: CoachDecisionReadModelPayload;
  sections: CoachIntelligenceSourceStateMap;
  expertContext: CoachChatLoadedContext;
  selectedDomains: readonly AgentContextDomain[];
  generatedAt: string;
  source: Readonly<{
    loadDurationMs: number;
  }>;
}>;

export type CoachIntelligenceSourceLoadResult = Readonly<{
  authUserId: string;
  userProfileId: string;
  healthContext: UserHealthContext;
  sections: CoachIntelligenceSourceStateMap;
  coachDecision?: CoachDecisionReadModelPayload;
  expertContext: CoachChatLoadedContext;
  selectedDomains: readonly AgentContextDomain[];
  generatedAt: string;
  loadDurationMs: number;
  source: Readonly<{
    loadDurationMs: number;
  }>;
  sectionLoadDurationsMs: Readonly<
    Record<CoachIntelligenceLoadedSectionName, number>
  >;
}>;

export type CoachIntelligenceContextAssemblyResult = Readonly<{
  authUserId: string;
  userProfileId: string;
  healthContext: UserHealthContext;
  source: CoachIntelligenceSourceLoadResult;
  selectedDomains: readonly AgentContextDomain[];
  generatedAt: string;
}>;

export type CoachIntelligencePipelineSelection = Readonly<{
  intent: AgentIntent;
  primaryExpert?: CoachExpertName;
  candidateExperts: readonly CoachExpertName[];
  participatingExperts: readonly CoachExpertName[];
}>;

export type CoachIntelligencePipelineResult = Readonly<{
  selection: CoachIntelligencePipelineSelection;
  routingDecision: Readonly<{
    primaryExpert?: CoachExpertName;
    participatingExperts: readonly CoachExpertName[];
    routeValid: boolean;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  policyEvaluation: AgentPolicyEvaluation;
  composition: CoachExpertCompositionResult;
  personaGuidance: CoachPersonaGuidance;
  explanation: CoachExplanation;
  expertResults: readonly CoachExpertResult[];
  expertContributions: readonly CoachExpertContribution[];
  executionDurationMs: number;
  compositionDurationMs: number;
  personaDurationMs: number;
  explainabilityDurationMs: number;
}>;

export type CoachIntelligenceBuildInput = Readonly<{
  authUserId: string;
  requestId?: string;
  conversationId?: string;
  userProfileId?: string;
}>;

export type CoachIntelligenceBuildResult = Readonly<{
  aggregate: CoachIntelligenceAggregate;
  source: CoachIntelligenceSourceContext;
  pipeline: CoachIntelligencePipelineResult;
  header: CoachIntelligenceHeader;
  ownership: CoachIntelligenceOwnership;
  insight: CoachIntelligenceInsight;
  warnings: readonly CoachIntelligenceWarning[];
  availability: CoachIntelligenceAvailability;
  freshness: CoachIntelligenceFreshness;
  metadata: CoachIntelligenceMetadata;
}>;
