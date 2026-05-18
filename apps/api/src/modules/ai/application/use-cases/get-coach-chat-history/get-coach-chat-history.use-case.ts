import { Inject, Injectable } from "@nestjs/common";

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
  GET_COACH_CHAT_HISTORY_ERROR_CODES,
  GetCoachChatHistoryError,
} from "./get-coach-chat-history.errors";
import { GetCoachChatHistoryInput } from "./get-coach-chat-history.input";
import { GetCoachChatHistoryOutput } from "./get-coach-chat-history.output";

@Injectable()
export class GetCoachChatHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_CONVERSATION_REPOSITORY)
    private readonly coachConversationRepository: CoachConversationRepository,
    @Inject(COACH_MESSAGE_REPOSITORY)
    private readonly coachMessageRepository: CoachMessageRepository,
  ) {}

  async execute(
    input: GetCoachChatHistoryInput,
  ): Promise<GetCoachChatHistoryOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const normalizedLimit = this.normalizeLimit(input.limit);

    if (!authUserId) {
      throw new GetCoachChatHistoryError(
        GET_COACH_CHAT_HISTORY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCoachChatHistoryError(
          GET_COACH_CHAT_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const conversation =
        await this.coachConversationRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (!conversation) {
        return [];
      }

      const messages = await this.coachMessageRepository.findByConversationId({
        conversationId: conversation.id,
        limit: normalizedLimit,
      });

      return [...messages]
        .reverse()
        .map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        }));
    } catch (error) {
      if (error instanceof GetCoachChatHistoryError) {
        throw error;
      }

      throw new GetCoachChatHistoryError(
        GET_COACH_CHAT_HISTORY_ERROR_CODES.INTERNAL_ERROR,
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

    throw new GetCoachChatHistoryError(
      GET_COACH_CHAT_HISTORY_ERROR_CODES.INVALID_INPUT,
      "Invalid chat history input.",
    );
  }
}
