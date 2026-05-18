import { CoachConversationMemory } from '../entities/coach-conversation-memory.entity';

export interface CreateCoachConversationMemoryRepositoryInput {
  conversationId: string;
  summary: string;
  metadata: {
    generatedFromMessageCount: number;
    version: string;
  };
}

export interface CoachConversationMemoryRepository {
  findByConversationId(
    conversationId: string,
  ): Promise<CoachConversationMemory | null>;
  upsertByConversationId(
    input: CreateCoachConversationMemoryRepositoryInput,
  ): Promise<CoachConversationMemory>;
}

export const COACH_CONVERSATION_MEMORY_REPOSITORY = Symbol(
  'COACH_CONVERSATION_MEMORY_REPOSITORY',
);
