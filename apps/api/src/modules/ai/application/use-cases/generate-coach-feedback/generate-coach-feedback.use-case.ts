import { Inject, Injectable } from "@nestjs/common";

import {
  CoachFeedbackGenerator,
} from "../../services/coach-feedback/coach-feedback-generator.service";
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from "../../../../fitness/domain/repositories/fitness-profile.repository";
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from "../../../../progress/domain/repositories/workout-log.repository";
import { CLOCK, Clock } from "../../../../progress/domain/services/clock.service";
import { calculateStreak } from "../../../../progress/application/use-cases/get-progress-summary/calculate-streak";
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from "../../../../training/domain/repositories/training-plan.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
  GenerateCoachFeedbackError,
} from "./generate-coach-feedback.errors";
import { GenerateCoachFeedbackInput } from "./generate-coach-feedback.input";
import { GenerateCoachFeedbackOutput } from "./generate-coach-feedback.output";

@Injectable()
export class GenerateCoachFeedbackUseCase {
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
    private readonly coachFeedbackGenerator: CoachFeedbackGenerator,
  ) {}

  async execute(
    input: GenerateCoachFeedbackInput,
  ): Promise<GenerateCoachFeedbackOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";

    if (!authUserId) {
      throw new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GenerateCoachFeedbackError(
          GENERATE_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        throw new GenerateCoachFeedbackError(
          GENERATE_COACH_FEEDBACK_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          "Fitness profile not found.",
        );
      }

      const trainingPlan =
        await this.trainingPlanRepository.findActiveByFitnessProfileId(
          fitnessProfile.id,
        );

      const { startDate, endDate } = this.getWeekUtcDateRange();
      const workoutLogs = trainingPlan
        ? await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
            trainingPlanIds: [trainingPlan.id],
            startDate,
            endDate,
          })
        : [];

      const workoutsCompleted = workoutLogs.length;
      const totalDurationMinutes = workoutLogs.reduce(
        (total, workoutLog) => total + workoutLog.durationMinutes,
        0,
      );
      const averageDurationMinutes =
        workoutsCompleted === 0
          ? 0
          : this.roundToTwoDecimals(totalDurationMinutes / workoutsCompleted);
      const currentStreak =
        workoutsCompleted === 0 ? 0 : calculateStreak(workoutLogs);
      const expectedWorkouts = this.resolveExpectedWorkouts({
        daysPerWeek: fitnessProfile.trainingAvailability?.daysPerWeek,
        activityLevel: fitnessProfile.activityLevel,
      });

      return this.coachFeedbackGenerator.generate({
        goal: fitnessProfile.goal,
        activityLevel: fitnessProfile.activityLevel,
        expectedWorkouts,
        currentStreak,
        averageDurationMinutes,
        workoutLogs,
        hasTrainingPlan: trainingPlan !== null,
      });
    } catch (error) {
      if (error instanceof GenerateCoachFeedbackError) {
        throw error;
      }

      throw new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private getWeekUtcDateRange(): {
    startDate: string;
    endDate: string;
  } {
    const now = this.clock.now();
    const endDate = this.clock.todayUtcDateString();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    start.setUTCDate(start.getUTCDate() - 6);

    return {
      startDate: this.toUtcDateString(start),
      endDate,
    };
  }

  private resolveExpectedWorkouts(input: {
    daysPerWeek?: number;
    activityLevel: "low" | "medium" | "high";
  }): number {
    if (
      typeof input.daysPerWeek === "number" &&
      Number.isFinite(input.daysPerWeek) &&
      input.daysPerWeek > 0
    ) {
      return Math.round(input.daysPerWeek);
    }

    switch (input.activityLevel) {
      case "low":
        return 2;
      case "medium":
        return 3;
      case "high":
      default:
        return 4;
    }
  }

  private toUtcDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
