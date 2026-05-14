import { Inject, Injectable } from "@nestjs/common";

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from "../../../domain/repositories/daily-check-in.repository";
import {
  GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES,
  GetDailyCheckInHistoryError,
} from "./get-daily-check-in-history.errors";
import { GetDailyCheckInHistoryInput } from "./get-daily-check-in-history.input";
import { GetDailyCheckInHistoryOutput } from "./get-daily-check-in-history.output";

@Injectable()
export class GetDailyCheckInHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
  ) {}

  async execute(
    input: GetDailyCheckInHistoryInput,
  ): Promise<GetDailyCheckInHistoryOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const normalizedLimit = this.normalizeLimit(input.limit);

    if (!authUserId) {
      throw new GetDailyCheckInHistoryError(
        GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetDailyCheckInHistoryError(
          GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const dailyCheckIns = await this.dailyCheckInRepository.findManyByUserProfileId(
        userProfile.id,
      );

      const orderedCheckIns = [...dailyCheckIns]
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, normalizedLimit);

      return {
        dailyCheckIns: orderedCheckIns.map((dailyCheckIn) => ({
          id: dailyCheckIn.id,
          energyLevel: dailyCheckIn.energyLevel,
          sleepQuality: dailyCheckIn.sleepQuality,
          muscleSoreness: dailyCheckIn.muscleSoreness,
          motivationLevel: dailyCheckIn.motivationLevel,
          createdAt: dailyCheckIn.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof GetDailyCheckInHistoryError) {
        throw error;
      }

      throw new GetDailyCheckInHistoryError(
        GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INTERNAL_ERROR,
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

    throw new GetDailyCheckInHistoryError(
      GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INVALID_INPUT,
      "Invalid daily check-in history input.",
    );
  }
}
