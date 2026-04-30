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
import { WORKOUT_LOG_REPOSITORY, WorkoutLogRepository } from "../../../domain/repositories/workout-log.repository";
import { CLOCK, Clock } from "../../../domain/services/clock.service";
import {
  GET_PROGRESS_SUMMARY_ERROR_CODES,
  GetProgressSummaryError,
} from "./get-progress-summary.errors";
import { GetProgressSummaryInput } from "./get-progress-summary.input";
import { GetProgressSummaryOutput } from "./get-progress-summary.output";

@Injectable()
export class GetProgressSummaryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(
    input: GetProgressSummaryInput,
  ): Promise<GetProgressSummaryOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const normalizedPeriod = this.normalizePeriod(input.period);

    if (!authUserId) {
      throw new GetProgressSummaryError(
        GET_PROGRESS_SUMMARY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetProgressSummaryError(
          GET_PROGRESS_SUMMARY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        throw new GetProgressSummaryError(
          GET_PROGRESS_SUMMARY_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          "Fitness profile not found.",
        );
      }

      const activeTrainingPlan =
        await this.trainingPlanRepository.findActiveByFitnessProfileId(
          fitnessProfile.id,
        );

      const trainingPlanIds = activeTrainingPlan ? [activeTrainingPlan.id] : [];

      if (trainingPlanIds.length === 0) {
        return this.buildEmptySummary(normalizedPeriod);
      }

      const { startDate, endDate } = this.getUtcDateRange(normalizedPeriod);

      const workoutLogs =
        await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
          trainingPlanIds,
          startDate,
          endDate,
        });

      if (workoutLogs.length === 0) {
        return this.buildEmptySummary(normalizedPeriod);
      }

      const workoutsCompleted = workoutLogs.length;
      const totalDurationMinutes = workoutLogs.reduce(
        (total, log) => total + log.durationMinutes,
        0,
      );
      const averageDurationMinutes = this.roundToTwoDecimals(
        totalDurationMinutes / workoutsCompleted,
      );
      const lastWorkoutDate = workoutLogs.reduce(
        (latest, log) => (latest === null || log.date > latest ? log.date : latest),
        null as string | null,
      );

      return {
        summary: {
          period: normalizedPeriod,
          workoutsCompleted,
          totalDurationMinutes,
          averageDurationMinutes,
          lastWorkoutDate,
        },
      };
    } catch (error) {
      if (error instanceof GetProgressSummaryError) {
        throw error;
      }

      throw new GetProgressSummaryError(
        GET_PROGRESS_SUMMARY_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private normalizePeriod(period?: string): "week" | "month" {
    if (period === undefined) {
      return "week";
    }

    if (period === "week" || period === "month") {
      return period;
    }

    throw new GetProgressSummaryError(
      GET_PROGRESS_SUMMARY_ERROR_CODES.INVALID_INPUT,
      "Invalid progress summary input.",
    );
  }

  private getUtcDateRange(period: "week" | "month"): {
    startDate: string;
    endDate: string;
  } {
    const now = this.clock.now();
    const daysToSubtract = period === "week" ? 6 : 29;
    const endDate = this.clock.todayUtcDateString();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    start.setUTCDate(start.getUTCDate() - daysToSubtract);

    return {
      startDate: this.toUtcDateString(start),
      endDate,
    };
  }

  private toUtcDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private buildEmptySummary(period: "week" | "month"): GetProgressSummaryOutput {
    return {
      summary: {
        period,
        workoutsCompleted: 0,
        totalDurationMinutes: 0,
        averageDurationMinutes: 0,
        lastWorkoutDate: null,
      },
    };
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
