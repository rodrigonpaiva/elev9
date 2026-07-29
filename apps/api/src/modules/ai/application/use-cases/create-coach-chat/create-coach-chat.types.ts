import type { CoachConversationMemory } from '../../../domain/entities/coach-conversation-memory.entity';
import type { GetDailyCheckInHistoryOutput } from '../../../../progress/application/use-cases/get-daily-check-in-history/get-daily-check-in-history.output';
import type { GetProgressSummaryOutput } from '../../../../progress/application/use-cases/get-progress-summary/get-progress-summary.output';
import type { GetWorkoutHistoryOutput } from '../../../../progress/application/use-cases/get-workout-history/get-workout-history.output';
import type {
  AiPromptBuilderConversationMemory,
  AiPromptBuilderConversationMessage,
} from '../../services/llm/ai-prompt-builder.service';
import type { UserHealthContext } from '../../services/context-builder/build-user-health-context.service';
import type { CoachNutritionContext } from '../../services/context-builder/coach-nutrition-context.types';
import type {
  CoachDecisionReadModelPayload,
  HabitMemoryPayload,
  HabitPromptPayload,
  NotificationMemoryPayload,
  NotificationPromptPayload,
  PersonalizationMemoryPayload,
  PersonalizationPromptPayload,
} from '../../../../../shared/mappers';
import type {
  Goal as GoalEntity,
} from '../../../../goals/domain/entities/goal.entity';
import type { GoalAchievement } from '../../../../goals/domain/entities/goal-achievement.entity';
import type { GoalForecast } from '../../../../goals/domain/entities/goal-forecast.entity';
import type { GoalMilestone } from '../../../../goals/domain/entities/goal-milestone.entity';
import type { GoalProgressSnapshot } from '../../../../goals/domain/entities/goal-progress-snapshot.entity';
import type { RecoverySnapshot } from '../../../../recovery/domain/entities/recovery-snapshot.entity';
import type { HabitSnapshot } from '../../../../habits/domain/entities/habit-snapshot.entity';
import type { CoachConversation } from '../../../domain/entities/coach-conversation.entity';

export type CreateCoachChatStreamOptions = {
  onDelta?: (delta: string) => void;
};

export type CoachChatLoadedContext = {
  userProfileId: string;
  healthContext: UserHealthContext;
  goalContext?: CoachChatGoalContext;
  progress?: CoachChatProgressContext;
  recoveryHistory?: readonly RecoverySnapshot[];
  /** Canonical Nutrition projection for Coach consumers. */
  nutritionContext?: CoachNutritionContext;
  coachDecision?: CoachDecisionReadModelPayload;
  notification?: NotificationPromptPayload;
  notificationMemory?: NotificationMemoryPayload;
  habit?: HabitPromptPayload;
  habitHistory?: readonly HabitSnapshot[];
  habitMemory?: HabitMemoryPayload;
  personalization?: PersonalizationPromptPayload;
  personalizationMemory?: PersonalizationMemoryPayload;
};

export type CoachChatGoalContext = {
  currentGoal?: GoalEntity;
  progressSnapshot?: GoalProgressSnapshot;
  forecast?: GoalForecast;
  goalHistory?: readonly GoalProgressSnapshot[];
  milestones?: readonly GoalMilestone[];
  achievementHistory?: readonly GoalAchievement[];
};

export type CoachChatProgressContext = {
  weeklySummary?: GetProgressSummaryOutput['summary'];
  monthlySummary?: GetProgressSummaryOutput['summary'];
  workoutHistory?: GetWorkoutHistoryOutput['workoutLogs'];
  dailyCheckInHistory?: GetDailyCheckInHistoryOutput['dailyCheckIns'];
};

export type CoachChatConversationState = {
  conversationId: string;
  conversation?: CoachConversation;
  conversationHistory: AiPromptBuilderConversationMessage[];
  conversationMemory?: AiPromptBuilderConversationMemory;
};

export type CoachChatReplySource = 'llm' | 'heuristic';

export type CoachChatReply = {
  content: string;
  source: CoachChatReplySource;
  provider?: string;
  model?: string;
  promptVersion?: string;
};

export type CoachChatMemoryUpdateInput = {
  conversationId: string;
  healthContext: UserHealthContext;
  conversationHistory: AiPromptBuilderConversationMessage[];
  userMessage: string;
  assistantReply: string;
  coachDecision?: CoachDecisionReadModelPayload;
  notification?: NotificationMemoryPayload;
  habit?: HabitMemoryPayload;
  personalization?: PersonalizationMemoryPayload;
};

export type CoachChatConversationSnapshot = Pick<
  CoachConversationMemory,
  'summary' | 'metadata'
>;
