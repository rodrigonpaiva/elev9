import { Inject, Injectable } from "@nestjs/common";

import {
  COACH_CONVERSATION_MEMORY_REPOSITORY,
  CoachConversationMemoryRepository,
} from "../../../domain/repositories/coach-conversation-memory.repository";
import {
  COACH_CONVERSATION_REPOSITORY,
  CoachConversationRepository,
} from "../../../domain/repositories/coach-conversation.repository";
import {
  COACH_MESSAGE_REPOSITORY,
  CoachMessageRepository,
} from "../../../domain/repositories/coach-message.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES,
  GetCoachChatDebugHistoryError,
} from "./get-coach-chat-debug-history.errors";
import { GetCoachChatDebugHistoryInput } from "./get-coach-chat-debug-history.input";
import { GetCoachChatDebugHistoryOutput } from "./get-coach-chat-debug-history.output";

@Injectable()
export class GetCoachChatDebugHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_CONVERSATION_REPOSITORY)
    private readonly coachConversationRepository: CoachConversationRepository,
    @Inject(COACH_MESSAGE_REPOSITORY)
    private readonly coachMessageRepository: CoachMessageRepository,
    @Inject(COACH_CONVERSATION_MEMORY_REPOSITORY)
    private readonly coachConversationMemoryRepository: CoachConversationMemoryRepository,
  ) {}

  async execute(
    input: GetCoachChatDebugHistoryInput,
  ): Promise<GetCoachChatDebugHistoryOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const normalizedLimit = this.normalizeLimit(input.limit);

    if (!authUserId) {
      throw new GetCoachChatDebugHistoryError(
        GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCoachChatDebugHistoryError(
          GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const conversation =
        await this.coachConversationRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (!conversation) {
        return { messages: [] };
      }

      const messages = await this.coachMessageRepository.findByConversationId({
        conversationId: conversation.id,
        limit: normalizedLimit,
      });
      const conversationMemory =
        await this.coachConversationMemoryRepository.findByConversationId(
          conversation.id,
        );

      return {
        ...(conversationMemory
          ? {
              conversationMemory: {
                version: conversationMemory.metadata.version,
                generatedFromMessageCount:
                  conversationMemory.metadata.generatedFromMessageCount,
                summaryPreview: conversationMemory.summary.slice(0, 160),
              },
            }
          : {}),
        messages: [...messages]
          .reverse()
          .map((message) => ({
            role: message.role,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            metadata: message.metadata
              ? {
                  source: message.metadata.source,
                  provider: message.metadata.provider,
                  model: message.metadata.model,
                  promptVersion: message.metadata.promptVersion,
                }
              : undefined,
          })),
      };
    } catch (error) {
      if (error instanceof GetCoachChatDebugHistoryError) {
        throw error;
      }

      throw new GetCoachChatDebugHistoryError(
        GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private normalizeLimit(limit?: number): number {
    if (limit === undefined) {
      return 50;
    }

    if (Number.isInteger(limit) && limit >= 1 && limit <= 100) {
      return limit;
    }

    throw new GetCoachChatDebugHistoryError(
      GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT,
      "Invalid chat debug history input.",
    );
  }
}
