import { Inject, Injectable } from '@nestjs/common';

import { BuildUserHealthContextService } from '../../services/context-builder/build-user-health-context.service';
import { AiLlmConfigService } from '../../services/llm/ai-llm-config.service';
import { AiPromptBuilder } from '../../services/llm/ai-prompt-builder.service';
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
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES,
  GetCoachChatPromptDebugError,
} from './get-coach-chat-prompt-debug.errors';
import { GetCoachChatPromptDebugInput } from './get-coach-chat-prompt-debug.input';
import { GetCoachChatPromptDebugOutput } from './get-coach-chat-prompt-debug.output';

@Injectable()
export class GetCoachChatPromptDebugUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_CONVERSATION_REPOSITORY)
    private readonly coachConversationRepository: CoachConversationRepository,
    @Inject(COACH_MESSAGE_REPOSITORY)
    private readonly coachMessageRepository: CoachMessageRepository,
    @Inject(COACH_CONVERSATION_MEMORY_REPOSITORY)
    private readonly coachConversationMemoryRepository: CoachConversationMemoryRepository,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
    private readonly aiPromptBuilder: AiPromptBuilder,
    private readonly aiLlmConfigService: AiLlmConfigService,
  ) {}

  async execute(
    input: GetCoachChatPromptDebugInput,
  ): Promise<GetCoachChatPromptDebugOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCoachChatPromptDebugError(
        GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCoachChatPromptDebugError(
          GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const healthContext = await this.buildUserHealthContextService.build({
        authUserId,
      });

      const conversation =
        await this.coachConversationRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      const messages = conversation
        ? await this.coachMessageRepository.findByConversationId({
            conversationId: conversation.id,
            limit: 6,
          })
        : [];
      const conversationMemory = conversation
        ? await this.coachConversationMemoryRepository.findByConversationId(
            conversation.id,
          )
        : null;

      const latestUserMessage =
        [...messages].reverse().find((message) => message.role === 'user')
          ?.content ??
        messages.at(-1)?.content ??
        '';

      const snapshot = this.aiPromptBuilder.buildDebugSnapshot({
        message: latestUserMessage,
        healthContext,
        conversationHistory: messages
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
      });

      return {
        promptVersion: snapshot.promptVersion,
        llm: {
          enabled: this.aiLlmConfigService.isEnabled(),
          provider: this.aiLlmConfigService.getProvider(),
          model: this.aiLlmConfigService.getModel(),
        },
        context: snapshot.context,
        promptPreview: snapshot.promptPreview,
        ...(snapshot.conversationMemory
          ? { conversationMemory: snapshot.conversationMemory }
          : {}),
      };
    } catch (error) {
      if (error instanceof GetCoachChatPromptDebugError) {
        throw error;
      }

      throw new GetCoachChatPromptDebugError(
        GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
