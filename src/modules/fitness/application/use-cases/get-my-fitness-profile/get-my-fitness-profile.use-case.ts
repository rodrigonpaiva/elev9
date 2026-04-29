import { Inject, Injectable } from "@nestjs/common";

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from "../../../domain/repositories/fitness-profile.repository";
import {
  GET_MY_FITNESS_PROFILE_ERROR_CODES,
  GetMyFitnessProfileError,
} from "./get-my-fitness-profile.errors";
import { GetMyFitnessProfileOutput } from "./get-my-fitness-profile.output";

@Injectable()
export class GetMyFitnessProfileUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GetMyFitnessProfileOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";

    if (!authUserId) {
      throw new GetMyFitnessProfileError(
        GET_MY_FITNESS_PROFILE_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetMyFitnessProfileError(
          GET_MY_FITNESS_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        throw new GetMyFitnessProfileError(
          GET_MY_FITNESS_PROFILE_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          "Fitness profile not found.",
        );
      }

      return {
        fitnessProfile: {
          id: fitnessProfile.id,
          userProfileId: fitnessProfile.userProfileId,
          heightCm: fitnessProfile.heightCm,
          weightKg: fitnessProfile.weightKg,
          goal: fitnessProfile.goal,
          activityLevel: fitnessProfile.activityLevel,
          trainingAvailability: fitnessProfile.trainingAvailability,
          limitations: fitnessProfile.limitations ?? [],
          status: fitnessProfile.status,
          createdAt: fitnessProfile.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof GetMyFitnessProfileError) {
        throw error;
      }

      throw new GetMyFitnessProfileError(
        GET_MY_FITNESS_PROFILE_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }
}
