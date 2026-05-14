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
  CREATE_DAILY_CHECK_IN_ERROR_CODES,
  CreateDailyCheckInError,
} from "./create-daily-check-in.errors";
import { CreateDailyCheckInInput } from "./create-daily-check-in.input";
import { CreateDailyCheckInOutput } from "./create-daily-check-in.output";

@Injectable()
export class CreateDailyCheckInUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
  ) {}

  async execute(
    input: CreateDailyCheckInInput,
  ): Promise<CreateDailyCheckInOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";

    this.validateInput({
      authUserId,
      energyLevel: input.energyLevel,
      sleepQuality: input.sleepQuality,
      muscleSoreness: input.muscleSoreness,
      motivationLevel: input.motivationLevel,
    });

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new CreateDailyCheckInError(
          CREATE_DAILY_CHECK_IN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const dailyCheckIn = await this.dailyCheckInRepository.create({
        userProfileId: userProfile.id,
        energyLevel: input.energyLevel,
        sleepQuality: input.sleepQuality,
        muscleSoreness: input.muscleSoreness,
        motivationLevel: input.motivationLevel,
      });

      return {
        dailyCheckIn: {
          id: dailyCheckIn.id,
          energyLevel: dailyCheckIn.energyLevel,
          sleepQuality: dailyCheckIn.sleepQuality,
          muscleSoreness: dailyCheckIn.muscleSoreness,
          motivationLevel: dailyCheckIn.motivationLevel,
          createdAt: dailyCheckIn.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof CreateDailyCheckInError) {
        throw error;
      }

      throw new CreateDailyCheckInError(
        CREATE_DAILY_CHECK_IN_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private validateInput(input: {
    authUserId: string;
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
  }): void {
    if (!input.authUserId) {
      throw new CreateDailyCheckInError(
        CREATE_DAILY_CHECK_IN_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    for (const value of [
      input.energyLevel,
      input.sleepQuality,
      input.muscleSoreness,
      input.motivationLevel,
    ]) {
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        throw new CreateDailyCheckInError(
          CREATE_DAILY_CHECK_IN_ERROR_CODES.INVALID_INPUT,
          "Invalid daily check-in input.",
        );
      }
    }
  }
}
