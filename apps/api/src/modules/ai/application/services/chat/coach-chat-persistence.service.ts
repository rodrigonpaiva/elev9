import { Inject, Injectable } from '@nestjs/common';

import {
  COACH_CONVERSATION_MEMORY_REPOSITORY,
  CoachConversationMemoryRepository,
} from '../../../domain/repositories/coach-conversation-memory.repository';
import {
  COACH_CONVERSATION_REPOSITORY,
  CoachConversationRepository,
} from '../../../domain/repositories/coach-conversation.repository';
import {
  COACH_MESSAGE_REPOSITORY,
  CoachMessageRepository,
} from '../../../domain/repositories/coach-message.repository';
import {
  AiPromptBuilderConversationMessage,
  AiPromptBuilderConversationMemory,
} from '../llm/ai-prompt-builder.service';
import { CoachChatReply } from '../../use-cases/create-coach-chat/create-coach-chat.types';

@Injectable()
export class CoachChatPersistenceService {
  constructor(
    @Inject(COACH_CONVERSATION_REPOSITORY)
    private readonly coachConversationRepository: CoachConversationRepository,
    @Inject(COACH_MESSAGE_REPOSITORY)
    private readonly coachMessageRepository: CoachMessageRepository,
    @Inject(COACH_CONVERSATION_MEMORY_REPOSITORY)
    private readonly coachConversationMemoryRepository: CoachConversationMemoryRepository,
  ) {}

  async resolveConversationState(userProfileId: string): Promise<{
    conversationId: string;
    conversationHistory: AiPromptBuilderConversationMessage[];
    conversationMemory?: AiPromptBuilderConversationMemory;
  }> {
    const existingConversation =
      await this.coachConversationRepository.findLatestByUserProfileId(
        userProfileId,
      );
    const conversation =
      existingConversation ??
      (await this.coachConversationRepository.create({
        userProfileId,
      }));

    const conversationMemory =
      await this.coachConversationMemoryRepository.findByConversationId(
        conversation.id,
      );

    const conversationHistory = existingConversation
      ? await this.coachMessageRepository.findByConversationId({
          conversationId: conversation.id,
          limit: 12,
        })
      : [];

    return {
      conversationId: conversation.id,
      conversationHistory: conversationHistory
        .slice()
        .reverse()
        .map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        })),
      conversationMemory: conversationMemory
        ? {
            summary: conversationMemory.summary,
            metadata: conversationMemory.metadata,
          }
        : undefined,
    };
  }

  async persistUserMessage(
    conversationId: string,
    message: string,
  ): Promise<void> {
    await this.coachMessageRepository.create({
      conversationId,
      role: 'user',
      content: message,
    });
  }

  async persistAssistantMessage(
    conversationId: string,
    reply: CoachChatReply,
  ): Promise<void> {
    const metadata =
      reply.source === 'llm'
        ? {
            source: 'llm' as const,
            ...(reply.provider ? { provider: reply.provider } : {}),
            ...(reply.model ? { model: reply.model } : {}),
            ...(reply.promptVersion
              ? { promptVersion: reply.promptVersion }
              : {}),
          }
        : {
            source: 'heuristic' as const,
          };

    await this.coachMessageRepository.create({
      conversationId,
      role: 'assistant',
      content: reply.content,
      metadata,
    });
  }
}
