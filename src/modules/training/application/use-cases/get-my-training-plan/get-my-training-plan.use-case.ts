import { Inject, Injectable } from "@nestjs/common";

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from "../../../../fitness/domain/repositories/fitness-profile.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from "../../../domain/repositories/training-plan.repository";
import {
  GET_MY_TRAINING_PLAN_ERROR_CODES,
  GetMyTrainingPlanError,
} from "./get-my-training-plan.errors";
import { GetMyTrainingPlanInput } from "./get-my-training-plan.input";
import { GetMyTrainingPlanOutput } from "./get-my-training-plan.output";

@Injectable()
export class GetMyTrainingPlanUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
  ) {}

  async execute(
    input: GetMyTrainingPlanInput,
  ): Promise<GetMyTrainingPlanOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";

    if (!authUserId) {
      throw new GetMyTrainingPlanError(
        GET_MY_TRAINING_PLAN_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetMyTrainingPlanError(
          GET_MY_TRAINING_PLAN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        throw new GetMyTrainingPlanError(
          GET_MY_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          "Fitness profile not found.",
        );
      }

      const trainingPlan =
        await this.trainingPlanRepository.findActiveByFitnessProfileId(
          fitnessProfile.id,
        );

      if (!trainingPlan || trainingPlan.status !== "active") {
        throw new GetMyTrainingPlanError(
          GET_MY_TRAINING_PLAN_ERROR_CODES.TRAINING_PLAN_NOT_FOUND,
          "Training plan not found.",
        );
      }

      const weeklySchedule = [...trainingPlan.weeklySchedule].sort(
        (left, right) => left.dayIndex - right.dayIndex,
      );

      return {
        trainingPlan: {
          id: trainingPlan.id,
          fitnessProfileId: trainingPlan.fitnessProfileId,
          status: trainingPlan.status,
          goal: trainingPlan.goal,
          activityLevel: trainingPlan.activityLevel,
          weeklySchedule,
          createdAt: trainingPlan.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof GetMyTrainingPlanError) {
        throw error;
      }

      throw new GetMyTrainingPlanError(
        GET_MY_TRAINING_PLAN_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }
}
