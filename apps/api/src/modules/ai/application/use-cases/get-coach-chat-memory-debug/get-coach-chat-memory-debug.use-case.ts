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
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES,
  GetCoachChatMemoryDebugError,
} from './get-coach-chat-memory-debug.errors';
import { GetCoachChatMemoryDebugInput } from './get-coach-chat-memory-debug.input';
import { GetCoachChatMemoryDebugOutput } from './get-coach-chat-memory-debug.output';

@Injectable()
export class GetCoachChatMemoryDebugUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_CONVERSATION_REPOSITORY)
    private readonly coachConversationRepository: CoachConversationRepository,
    @Inject(COACH_CONVERSATION_MEMORY_REPOSITORY)
    private readonly coachConversationMemoryRepository: CoachConversationMemoryRepository,
  ) {}

  async execute(
    input: GetCoachChatMemoryDebugInput,
  ): Promise<GetCoachChatMemoryDebugOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCoachChatMemoryDebugError(
        GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCoachChatMemoryDebugError(
          GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const conversation =
        await this.coachConversationRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (!conversation) {
        return {};
      }

      const memory =
        await this.coachConversationMemoryRepository.findByConversationId(
          conversation.id,
        );

      if (!memory) {
        return {};
      }

      return {
        memory: {
          version: memory.metadata.version,
          generatedFromMessageCount: memory.metadata.generatedFromMessageCount,
          summaryPreview: this.buildSummaryPreview(memory.summary),
          metadata: this.buildMetadataPreview(memory.summary),
          createdAt: memory.createdAt.toISOString(),
          updatedAt: memory.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof GetCoachChatMemoryDebugError) {
        throw error;
      }

      throw new GetCoachChatMemoryDebugError(
        GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private buildSummaryPreview(summary: string): string {
    return summary.trim().replace(/\s+/g, ' ').slice(0, 160);
  }

  private buildMetadataPreview(summary: string): {
    hasRecoveryContext: boolean;
    hasNutritionContext: boolean;
    hasWorkoutContinuity: boolean;
  } {
    const normalized = summary.toLowerCase();

    return {
      hasRecoveryContext:
        normalized.includes('recovery=') ||
        normalized.includes('user_concern=recovery'),
      hasNutritionContext: normalized.includes('nutrition='),
      hasWorkoutContinuity: normalized.includes('workout_continuity='),
    };
  }
}
