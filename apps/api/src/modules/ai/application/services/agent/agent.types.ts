import type { AiRolloutAssignment } from '../governance/ai-governance.types';
import type { CoachDecisionReadModelPayload } from '../../../../../shared/mappers';
import type {
  HabitMemoryPayload,
  HabitPromptPayload,
  NotificationMemoryPayload,
  NotificationPromptPayload,
  PersonalizationMemoryPayload,
  PersonalizationPromptPayload,
} from '../../../../../shared/mappers';
import type { NutritionLog } from '../../../../nutrition/domain/entities/nutrition-log.entity';
import type { CoachNutritionContext } from '../context-builder/coach-nutrition-context.types';
import type { NutritionPlan } from '../../../../nutrition/domain/entities/nutrition-plan.entity';
import type { GetTodayNutritionOutput } from '../../../../nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.output';
import type { RecoverySnapshot } from '../../../../recovery/domain/entities/recovery-snapshot.entity';
import type {
  AiPromptBuilderConversationMemory,
  AiPromptBuilderConversationMessage,
} from '../llm/ai-prompt-builder.service';
import type { CoachChatGoalContext } from '../../use-cases/create-coach-chat/create-coach-chat.types';
import type { UserHealthContext } from '../context-builder/build-user-health-context.service';
import type { AgentToolDescriptor } from './tools/agent-tool.types';
import type {
  AgentToolExecutionMetrics,
  AgentToolExecutionResult,
} from './tools/agent-tool-execution.types';
import type {
  CoachExpertContribution,
  CoachExpertResult,
  CoachExpertCapability,
  CoachExpertMetadata,
  CoachExpertPrioritySnapshot,
} from '../experts/coach-expert.types';
import type { CoachExpertRoutingDecision } from '../experts/router/coach-expert-router.types';
import type {
  AgentExecutionStrategy,
  AgentPlanningStep,
  AgentPlanningValidationResult,
} from './planning/agent-planning.types';
import type { AgentPolicyEvaluation } from './policies/agent-policy.types';
import type { AgentMemoryMetadata } from './memory/agent-memory.types';
import type { HabitSnapshot } from '../../../../habits/domain/entities/habit-snapshot.entity';
import type { CoachChatProgressContext } from '../../use-cases/create-coach-chat/create-coach-chat.types';

export type AgentContextDomain =
  | 'health'
  | 'training'
  | 'nutrition'
  | 'recovery'
  | 'goals'
  | 'habits'
  | 'progress'
  | 'personalization'
  | 'notifications'
  | 'coach_decision'
  | 'conversation_memory'
  | 'recent_messages'
  | 'user_profile';

export type AgentIntent =
  | 'GENERAL_CHAT'
  | 'TRAINING'
  | 'NUTRITION'
  | 'RECOVERY'
  | 'GOALS'
  | 'HABITS'
  | 'PERSONALIZATION'
  | 'PROGRESS'
  | 'DASHBOARD'
  | 'MOTIVATION'
  | 'PLANNING'
  | 'UNKNOWN';

export type AgentPlanIntent = AgentIntent;

export type AgentResponseMode = 'standard' | 'stream';

export type AgentSafetyConstraint =
  | 'deterministic_first'
  | 'no_tool_execution'
  | 'public_api_unchanged'
  | 'fallback_required';

export type AgentStepName =
  | 'CLASSIFY_INTENT'
  | 'SELECT_CONTEXT'
  | 'LOAD_CONTEXT'
  | 'EXECUTE_TOOL'
  | 'BUILD_PLAN'
  | 'BUILD_PROMPT'
  | 'CALL_LLM'
  | 'FALLBACK_REPLY'
  | 'PERSIST_RESPONSE'
  | 'UPDATE_MEMORY'
  | 'UPDATE_CONVERSATION_MEMORY'
  | 'GENERATE_FALLBACK'
  | 'COMPLETE';

export type AgentStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type AgentActionType =
  | 'READ_USER_PROFILE'
  | 'READ_HEALTH_CONTEXT'
  | 'READ_TRAINING_CONTEXT'
  | 'READ_NUTRITION_CONTEXT'
  | 'READ_RECOVERY_CONTEXT'
  | 'READ_GOALS_CONTEXT'
  | 'READ_PROGRESS_CONTEXT'
  | 'READ_MEMORY'
  | 'READ_HABIT_CONTEXT'
  | 'READ_NOTIFICATION_CONTEXT'
  | 'READ_PERSONALIZATION_CONTEXT'
  | 'READ_COACH_DECISION'
  | 'READ_RECENT_MESSAGES'
  | 'GENERATE_REPLY';

export type AgentAction = {
  type: AgentActionType;
  domain: AgentContextDomain;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type AgentActionResultStatus = 'success' | 'failed' | 'skipped';

export type AgentActionResult = {
  action: AgentAction;
  status: AgentActionResultStatus;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type { AgentToolDescriptor } from './tools/agent-tool.types';
export type {
  AgentToolExecutionMetrics,
  AgentToolExecutionOutcome,
  AgentToolExecutionResult,
} from './tools/agent-tool-execution.types';
export type { CoachExpertRoutingDecision } from '../experts/router/coach-expert-router.types';

export type AgentSessionMetadata = {
  requestId: string;
  authUserId: string;
  userProfileId: string;
  conversationId: string;
  userIdHash: string;
};

export type AgentRequest = {
  userId: string;
  conversationId: string;
  userMessage: string;
  sessionMetadata: AgentSessionMetadata;
  promptVersion: string;
  streamingPreference: boolean;
  experimentMetadata: AiRolloutAssignment;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
};

export type AgentSafetyMetadata = {
  deterministicFirst: boolean;
  toolCallingEnabled: boolean;
  fallbackAllowed: boolean;
  promptVersion: string;
};

export type AgentContext = {
  intent: AgentIntent;
  selectedDomains: readonly AgentContextDomain[];
  healthContext: UserHealthContext;
  goalContext?: CoachChatGoalContext;
  progress?: CoachChatProgressContext;
  recoveryHistory?: readonly RecoverySnapshot[];
  nutritionPlan?: NutritionPlan;
  todayNutrition?: GetTodayNutritionOutput['todayNutrition'];
  nutritionLogs?: readonly NutritionLog[];
  /** Canonical Nutrition projection; raw Nutrition fields are deprecated. */
  nutritionContext?: CoachNutritionContext;
  habitHistory?: readonly HabitSnapshot[];
  conversationMemory?: AiPromptBuilderConversationMemory;
  recentMessages: AiPromptBuilderConversationMessage[];
  coachDecision?: CoachDecisionReadModelPayload;
  habit?: HabitPromptPayload;
  notification?: NotificationPromptPayload;
  personalization?: PersonalizationPromptPayload;
  notificationMemory?: NotificationMemoryPayload;
  habitMemory?: HabitMemoryPayload;
  personalizationMemory?: PersonalizationMemoryPayload;
  safetyMetadata: AgentSafetyMetadata;
  rolloutMetadata: AiRolloutAssignment;
};

export type AgentPlan = {
  intent: AgentPlanIntent;
  requiredContextDomains: readonly AgentContextDomain[];
  candidateExperts: readonly CoachExpertMetadata[];
  selectedExperts: readonly CoachExpertMetadata[];
  expertRouting: CoachExpertRoutingDecision;
  expertPriorities: readonly CoachExpertPrioritySnapshot[];
  expertCapabilities: readonly CoachExpertCapability[];
  responseMode: AgentResponseMode;
  safetyConstraints: readonly AgentSafetyConstraint[];
  maxSteps: number;
  actions: readonly AgentAction[];
  candidateTools: readonly AgentToolDescriptor[];
  selectedTools: readonly AgentToolDescriptor[];
  executionStrategy: AgentExecutionStrategy;
  planningSteps: readonly AgentPlanningStep[];
  maximumExecutionDepth: number;
  expectedCost: number;
  expectedLatencyMs: number;
  validation: AgentPlanningValidationResult;
  summary: string;
};

export type AgentStep = {
  step: AgentStepName;
  status: AgentStepStatus;
  startedAt: string;
  completedAt?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
};

export type AgentRuntimeMetadata = {
  enabled: boolean;
  detectedIntent: AgentIntent;
  planIntent: AgentPlanIntent;
  responseMode: AgentResponseMode;
  executionStrategy: AgentExecutionStrategy;
  stepCount: number;
  fallbackUsed: boolean;
  selectedDomains: readonly AgentContextDomain[];
  selectedDomainCount: number;
  candidateExpertIds: readonly string[];
  selectedExpertIds: readonly string[];
  rejectedExpertIds: readonly string[];
  expertSelectionReason: string;
  candidateToolIds: readonly string[];
  selectedToolIds: readonly string[];
  candidateToolCount: number;
  selectedToolCount: number;
  candidateExpertCount: number;
  selectedExpertCount: number;
  rejectedExpertCount: number;
  expertRoutingPrimaryExpertId?: string;
  expertRoutingComplementaryExpertIds: readonly string[];
  expertRoutingOrderedExpertIds: readonly string[];
  expertRoutingBlockedExpertIds: readonly string[];
  expertRoutingSkippedExpertIds: readonly string[];
  expertRoutingConfidence?: string;
  estimatedToolCost: number;
  estimatedToolLatencyMs: number;
  planningStepCount: number;
  planningDurationMs: number;
  executionDurationMs: number;
  planningValidationPassed: boolean;
  toolExecutionEnabled: boolean;
  toolExecutionMetrics: AgentToolExecutionMetrics;
  toolExecutionResults: readonly AgentToolExecutionResult[];
  toolExecutionDurationMs: number;
  durationMs: number;
  orchestrationDurationMs: number;
  stepLimitReached: boolean;
  promptVersion: string;
  experimentId: string;
  streamingPreference: boolean;
  rolloutVariant: AiRolloutAssignment['rolloutVariant'];
  selectedPromptVersion: string;
  plan: AgentPlan;
  memory: AgentMemoryMetadata;
  policyApproved?: boolean;
  policyBlocked?: boolean;
  policyFallbackRequired?: boolean;
  policyReason?: string;
  policyViolationCount?: number;
  policyAllowedLLM?: boolean;
  policyAllowedDomainCount?: number;
  policyAllowedToolCount?: number;
  policyBlockedDomainIds?: readonly AgentContextDomain[];
  policyBlockedToolIds?: readonly string[];
  policyEvaluation?: AgentPolicyEvaluation;
  expertResults?: readonly CoachExpertResult[];
  expertContributions?: readonly CoachExpertContribution[];
  expertExecutionDurationMs?: number;
};

export type AgentObservabilityTraceReference = {
  requestId: string;
  conversationId: string;
  userIdHash: string;
  experimentId: string;
  promptVersion: string;
};

export type AgentResponse = {
  conversationId: string;
  assistantText: string;
  fallbackUsed: boolean;
  planSummary: string;
  executedSteps: AgentStep[];
  actionResults: readonly AgentActionResult[];
  metadata: AgentRuntimeMetadata;
  observabilityTraceReference: AgentObservabilityTraceReference;
};
