import { Inject, Injectable } from "@nestjs/common";

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from "../../../../fitness/domain/repositories/fitness-profile.repository";
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from "../../../../training/domain/repositories/training-plan.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from "../../../domain/repositories/workout-log.repository";
import {
  GET_WORKOUT_HISTORY_ERROR_CODES,
  GetWorkoutHistoryError,
} from "./get-workout-history.errors";
import { GetWorkoutHistoryInput } from "./get-workout-history.input";
import { GetWorkoutHistoryOutput } from "./get-workout-history.output";

@Injectable()
export class GetWorkoutHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
  ) {}

  async execute(
    input: GetWorkoutHistoryInput,
  ): Promise<GetWorkoutHistoryOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const normalizedLimit = this.normalizeLimit(input.limit);

    if (!authUserId) {
      throw new GetWorkoutHistoryError(
        GET_WORKOUT_HISTORY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetWorkoutHistoryError(
          GET_WORKOUT_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        throw new GetWorkoutHistoryError(
          GET_WORKOUT_HISTORY_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          "Fitness profile not found.",
        );
      }

      const activeTrainingPlan =
        await this.trainingPlanRepository.findActiveByFitnessProfileId(
          fitnessProfile.id,
        );

      const trainingPlanIds = activeTrainingPlan ? [activeTrainingPlan.id] : [];

      if (trainingPlanIds.length === 0) {
        return { workoutLogs: [] };
      }

      const workoutLogs =
        await this.workoutLogRepository.findByTrainingPlanIdsOrdered({
          trainingPlanIds,
          limit: normalizedLimit,
        });

      return {
        workoutLogs: workoutLogs.map((log) => ({
          id: log.id,
          trainingPlanId: log.trainingPlanId,
          workoutDayIndex: log.workoutDayIndex,
          durationMinutes: log.durationMinutes,
          completedExercises: log.completedExercises,
          feedback: log.feedback,
          date: log.date,
          createdAt: log.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      if (error instanceof GetWorkoutHistoryError) {
        throw error;
      }

      throw new GetWorkoutHistoryError(
        GET_WORKOUT_HISTORY_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private normalizeLimit(limit?: number): number {
    if (limit === undefined) {
      return 20;
    }

    if (Number.isInteger(limit) && limit >= 1 && limit <= 50) {
      return limit;
    }

    throw new GetWorkoutHistoryError(
      GET_WORKOUT_HISTORY_ERROR_CODES.INVALID_INPUT,
      "Invalid workout history input.",
    );
  }
}
