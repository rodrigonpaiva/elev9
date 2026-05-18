import { Inject, Injectable } from "@nestjs/common";

import {
  COACH_FEEDBACK_REPOSITORY,
  CoachFeedbackRepository,
} from "../../../domain/repositories/coach-feedback.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES,
  GetCoachFeedbackDebugHistoryError,
} from "./get-coach-feedback-debug-history.errors";
import { GetCoachFeedbackDebugHistoryInput } from "./get-coach-feedback-debug-history.input";
import { GetCoachFeedbackDebugHistoryOutput } from "./get-coach-feedback-debug-history.output";

@Injectable()
export class GetCoachFeedbackDebugHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_FEEDBACK_REPOSITORY)
    private readonly coachFeedbackRepository: CoachFeedbackRepository,
  ) {}

  async execute(
    input: GetCoachFeedbackDebugHistoryInput,
  ): Promise<GetCoachFeedbackDebugHistoryOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const normalizedLimit = this.normalizeLimit(input.limit);

    if (!authUserId) {
      throw new GetCoachFeedbackDebugHistoryError(
        GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCoachFeedbackDebugHistoryError(
          GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const feedbacks = await this.coachFeedbackRepository.findByUserProfileId({
        userProfileId: userProfile.id,
        limit: normalizedLimit,
      });

      return {
        feedbacks: feedbacks.map((feedback) => ({
          id: feedback.id,
          message: feedback.message,
          insights: feedback.insights,
          recommendations: feedback.recommendations,
          influences: feedback.influences ?? [],
          createdAt: feedback.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof GetCoachFeedbackDebugHistoryError) {
        throw error;
      }

      throw new GetCoachFeedbackDebugHistoryError(
        GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private normalizeLimit(limit?: number): number {
    if (limit === undefined) {
      return 20;
    }

    if (Number.isInteger(limit) && limit >= 1 && limit <= 100) {
      return limit;
    }

    throw new GetCoachFeedbackDebugHistoryError(
      GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT,
      "Invalid coach feedback debug history input.",
    );
  }
}
