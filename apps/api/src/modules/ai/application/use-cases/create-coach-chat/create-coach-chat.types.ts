import type { CoachConversation } from '../../../domain/entities/coach-conversation.entity';
import type { CoachConversationMemory } from '../../../domain/entities/coach-conversation-memory.entity';
import type {
  AiPromptBuilderConversationMemory,
  AiPromptBuilderConversationMessage,
} from '../../services/llm/ai-prompt-builder.service';
import type { UserHealthContext } from '../../services/context-builder/build-user-health-context.service';
import type {
  CoachDecisionReadModelPayload,
  HabitMemoryPayload,
  HabitPromptPayload,
  NotificationMemoryPayload,
  NotificationPromptPayload,
  PersonalizationMemoryPayload,
  PersonalizationPromptPayload,
} from '../../../../../shared/mappers';

export type CreateCoachChatStreamOptions = {
  onDelta?: (delta: string) => void;
};

export type CoachChatLoadedContext = {
  userProfileId: string;
  healthContext: UserHealthContext;
  coachDecision?: CoachDecisionReadModelPayload;
  notification?: NotificationPromptPayload;
  notificationMemory?: NotificationMemoryPayload;
  habit?: HabitPromptPayload;
  habitMemory?: HabitMemoryPayload;
  personalization?: PersonalizationPromptPayload;
  personalizationMemory?: PersonalizationMemoryPayload;
};

export type CoachChatConversationState = {
  conversation: CoachConversation;
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
