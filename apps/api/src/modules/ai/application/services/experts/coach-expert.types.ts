import type {
  AgentContextDomain,
  AgentIntent,
  AgentRequest,
} from '../agent/agent.types';
import type { AgentPolicyEvaluation } from '../agent/policies/agent-policy.types';
import type { UserHealthContext } from '../context-builder/build-user-health-context.service';
import type { CoachNutritionContext } from '../context-builder/coach-nutrition-context.types';
import type { RecoverySnapshot } from '../../../../recovery/domain/entities/recovery-snapshot.entity';
import type { HabitSnapshot } from '../../../../habits/domain/entities/habit-snapshot.entity';
import type { HabitPromptPayload } from '../../../../../shared/mappers';
import type {
  CoachChatGoalContext,
  CoachChatProgressContext,
} from '../../use-cases/create-coach-chat/create-coach-chat.types';

export type CoachExpertCategory =
  | 'TRAINING'
  | 'NUTRITION'
  | 'RECOVERY'
  | 'GOALS'
  | 'HABITS'
  | 'PROGRESS'
  | 'MOTIVATION';

export type CoachExpertCapability =
  | 'TRAINING_SPECIALIST'
  | 'NUTRITION_SPECIALIST'
  | 'RECOVERY_SPECIALIST'
  | 'GOAL_SPECIALIST'
  | 'HABIT_SPECIALIST'
  | 'PROGRESS_SPECIALIST'
  | 'MOTIVATION_SPECIALIST'
  | 'GENERAL_COACH_SUPPORT'
  | 'COACH_ROUTING'
  | 'CONTEXT_SYNTHESIS';

export type CoachExpertPriority = number;

export type CoachExpertMetadata = {
  id: string;
  displayName: string;
  version: string;
  category: CoachExpertCategory;
  supportedIntents: readonly AgentIntent[];
  supportedDomains: readonly AgentContextDomain[];
  estimatedCost: number;
  estimatedLatencyMs: number;
  priority: CoachExpertPriority;
  capabilities: readonly CoachExpertCapability[];
  enabled: boolean;
};

export type CoachExpertPrioritySnapshot = {
  expertId: string;
  priority: CoachExpertPriority;
};

export type CoachExpertContribution = {
  expertId: string;
  type: 'CONTEXT' | 'ANALYSIS' | 'CONTRIBUTION';
  summary: string;
  metadata?: Readonly<Record<string, unknown>>;
};

export type CoachExpertResult = {
  expertId: string;
  summary: string;
  contributions: readonly CoachExpertContribution[];
  metadata: Readonly<Record<string, unknown>>;
};

export type CoachExpertContext = {
  request: CoachExpertRequest;
  policyEvaluation?: AgentPolicyEvaluation;
  healthContext?: UserHealthContext;
  goalContext?: CoachChatGoalContext;
  progress?: CoachChatProgressContext;
  recoveryHistory?: readonly RecoverySnapshot[];
  /** Canonical Nutrition projection. */
  nutritionContext?: CoachNutritionContext;
  habit?: HabitPromptPayload;
  habitHistory?: readonly HabitSnapshot[];
  selectionReason: string;
  runtimeMetadata: Readonly<Record<string, unknown>>;
};

export type CoachExpertRequest = AgentRequest & {
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  candidateExperts: readonly CoachExpertMetadata[];
  selectedExperts: readonly CoachExpertMetadata[];
};

export type CoachExpertSupportInput = {
  intent?: AgentIntent;
  selectedDomains?: readonly AgentContextDomain[];
  capability?: CoachExpertCapability;
};

export type CoachExpert = {
  readonly metadata: CoachExpertMetadata;
  supports(input: CoachExpertSupportInput): boolean;
  loadContext(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertContext;
  analyze(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertResult;
  contribute(
    input: CoachExpertRequest,
    context: CoachExpertContext,
    result: CoachExpertResult,
  ): readonly CoachExpertContribution[];
};
