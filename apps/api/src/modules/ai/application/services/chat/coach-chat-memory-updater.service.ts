import { Inject, Injectable } from '@nestjs/common';

import {
  COACH_CONVERSATION_MEMORY_REPOSITORY,
  CoachConversationMemoryRepository,
} from '../../../domain/repositories/coach-conversation-memory.repository';
import {
  CoachConversationMemorySummarizer,
  COACH_CONVERSATION_MEMORY_VERSION,
} from '../memory/coach-conversation-memory-summarizer.service';
import { CoachChatMemoryUpdateInput } from '../../use-cases/create-coach-chat/create-coach-chat.types';

@Injectable()
export class CoachChatMemoryUpdaterService {
  constructor(
    private readonly coachConversationMemorySummarizer: CoachConversationMemorySummarizer,
    @Inject(COACH_CONVERSATION_MEMORY_REPOSITORY)
    private readonly coachConversationMemoryRepository: CoachConversationMemoryRepository,
  ) {}

  async update(input: CoachChatMemoryUpdateInput): Promise<void> {
    const memory = this.coachConversationMemorySummarizer.summarize({
      healthContext: input.healthContext,
      conversationMessages: [
        ...input.conversationHistory,
        {
          role: 'user',
          content: input.userMessage,
          createdAt: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: input.assistantReply,
          createdAt: new Date().toISOString(),
        },
      ],
      coachDecision: input.coachDecision,
      ...(input.notification ? { notification: input.notification } : {}),
      ...(input.habit ? { habit: input.habit } : {}),
      ...(input.personalization
        ? { personalization: input.personalization }
        : {}),
    });

    await this.coachConversationMemoryRepository.upsertByConversationId({
      conversationId: input.conversationId,
      summary: memory.summary,
      metadata: {
        generatedFromMessageCount: memory.metadata.generatedFromMessageCount,
        version: memory.metadata.version ?? COACH_CONVERSATION_MEMORY_VERSION,
      },
    });
  }
}
