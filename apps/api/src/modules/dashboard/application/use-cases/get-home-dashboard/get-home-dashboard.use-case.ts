import { Inject, Injectable } from "@nestjs/common";

import { BuildUserHealthContextService } from "../../../../ai/application/services/context-builder/build-user-health-context.service";
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from "../../../../fitness/domain/repositories/fitness-profile.repository";
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from "../../../../progress/domain/repositories/daily-check-in.repository";
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from "../../../../progress/domain/repositories/workout-log.repository";
import { CLOCK, Clock } from "../../../../progress/domain/services/clock.service";
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from "../../../../training/domain/repositories/training-plan.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  GET_HOME_DASHBOARD_ERROR_CODES,
  GetHomeDashboardError,
} from "./get-home-dashboard.errors";
import { GetHomeDashboardInput } from "./get-home-dashboard.input";
import { GetHomeDashboardOutput } from "./get-home-dashboard.output";

@Injectable()
export class GetHomeDashboardUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    @Inject(CLOCK)
    private readonly clock: Clock,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
  ) {}

  async execute(input: GetHomeDashboardInput): Promise<GetHomeDashboardOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";

    if (!authUserId) {
      throw new GetHomeDashboardError(
        GET_HOME_DASHBOARD_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);
      const healthContext = await this.buildUserHealthContextService.build({
        authUserId,
      });

      if (!userProfile) {
        throw new GetHomeDashboardError(
          GET_HOME_DASHBOARD_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const recentDailyCheckIns = (
        await this.dailyCheckInRepository.findManyByUserProfileId(userProfile.id)
      ).slice(0, 3);
      const recovery = this.buildRecoverySummary(
        healthContext,
        recentDailyCheckIns,
      );
      const nutritionGuidance = this.buildNutritionGuidance(
        healthContext,
        recovery.recoveryTrend,
      );
      const debug = this.buildDebugSnapshot(healthContext, recovery, nutritionGuidance);

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        return {
          dashboard: {
            user: {
              name: userProfile.name,
            },
            fitnessProfile: null,
            trainingPlan: null,
            progressSummary: this.buildEmptySummary(),
            recovery,
            nutritionGuidance,
            debug,
          },
        };
      }

      const trainingPlan =
        await this.trainingPlanRepository.findActiveByFitnessProfileId(
          fitnessProfile.id,
        );

      if (!trainingPlan || trainingPlan.status !== "active") {
        return {
          dashboard: {
            user: {
              name: userProfile.name,
            },
            fitnessProfile: {
              id: fitnessProfile.id,
              goal: fitnessProfile.goal,
              activityLevel: fitnessProfile.activityLevel,
            },
            trainingPlan: null,
            progressSummary: this.buildEmptySummary(),
            recovery,
            nutritionGuidance,
            debug,
          },
        };
      }

      const { startDate, endDate } = this.getWeekUtcDateRange();
      const workoutLogs =
        await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
          trainingPlanIds: [trainingPlan.id],
          startDate,
          endDate,
        });

      const todayWorkout = this.getTodayWorkout(trainingPlan.weeklySchedule);

      return {
        dashboard: {
          user: {
            name: userProfile.name,
          },
          fitnessProfile: {
            id: fitnessProfile.id,
            goal: fitnessProfile.goal,
            activityLevel: fitnessProfile.activityLevel,
          },
          trainingPlan: {
            id: trainingPlan.id,
            todayWorkout,
          },
          progressSummary: this.buildSummaryFromLogs(workoutLogs),
          recovery,
          nutritionGuidance,
          debug,
        },
      };
    } catch (error) {
      if (error instanceof GetHomeDashboardError) {
        throw error;
      }

      throw new GetHomeDashboardError(
        GET_HOME_DASHBOARD_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private getTodayWorkout(
    weeklySchedule: Array<{
      dayIndex: number;
      title: string;
      focus: string;
      format: string;
      intensity: "low" | "moderate" | "high";
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      }>;
    }>,
  ) {
    const todayIndex = this.getUtcDayIndex(this.clock.now());
    const matchingDay = weeklySchedule.find((day) => day.dayIndex === todayIndex);

    if (!matchingDay) {
      return null;
    }

    return {
      dayIndex: matchingDay.dayIndex,
      title: matchingDay.title,
      focus: matchingDay.focus,
      format: matchingDay.format,
      intensity: matchingDay.intensity,
      exercises: matchingDay.exercises,
    };
  }

  private getUtcDayIndex(date: Date): number {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
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

  private toUtcDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private buildEmptySummary(): GetHomeDashboardOutput["dashboard"]["progressSummary"] {
    return {
      period: "week",
      workoutsCompleted: 0,
      totalDurationMinutes: 0,
      averageDurationMinutes: 0,
      lastWorkoutDate: null,
    };
  }

  private buildSummaryFromLogs(
    workoutLogs: Array<{
      durationMinutes: number;
      date: string;
    }>,
  ): GetHomeDashboardOutput["dashboard"]["progressSummary"] {
    if (workoutLogs.length === 0) {
      return this.buildEmptySummary();
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
      period: "week",
      workoutsCompleted,
      totalDurationMinutes,
      averageDurationMinutes,
      lastWorkoutDate,
    };
  }

  private buildRecoverySummary(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService["build"]>>,
    recentDailyCheckIns: Array<{
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
    }>,
  ): GetHomeDashboardOutput["dashboard"]["recovery"] {
    return {
      fatigueLevel: healthContext.fatigueLevel,
      recommendedIntensity: this.mapRecommendedIntensity(
        healthContext.fatigueLevel,
      ),
      recoveryTrend: this.calculateRecoveryTrend(recentDailyCheckIns),
      latestCheckIn: healthContext.latestCheckIn
        ? {
            energyLevel: healthContext.latestCheckIn.energyLevel,
            sleepQuality: healthContext.latestCheckIn.sleepQuality,
            muscleSoreness: healthContext.latestCheckIn.muscleSoreness,
            motivationLevel: healthContext.latestCheckIn.motivationLevel,
            createdAt: healthContext.latestCheckIn.createdAt.toISOString(),
          }
        : undefined,
      };
  }

  private buildNutritionGuidance(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService["build"]>>,
    recoveryTrend: GetHomeDashboardOutput["dashboard"]["recovery"]["recoveryTrend"],
  ): GetHomeDashboardOutput["dashboard"]["nutritionGuidance"] {
    const latestCheckIn = healthContext.latestCheckIn;
    const nutritionProfile = healthContext.nutritionProfile;
    const hasLowSleep = latestCheckIn ? latestCheckIn.sleepQuality <= 2 : false;
    const hasHighSoreness = latestCheckIn
      ? latestCheckIn.muscleSoreness >= 4
      : false;
    const hasLowMotivation = latestCheckIn
      ? latestCheckIn.motivationLevel <= 2
      : false;
    const hasHighMotivation = latestCheckIn
      ? latestCheckIn.motivationLevel >= 4
      : false;
    const hasLowMealFrequency = nutritionProfile
      ? nutritionProfile.mealsPerDay <= 2
      : false;
    const hasLowConsistencySignal =
      hasLowMealFrequency || hasLowMotivation || healthContext.adherenceScore < 50;

    if (
      healthContext.fatigueLevel === "HIGH" ||
      recoveryTrend === "needs_recovery" ||
      hasLowSleep ||
      hasHighSoreness
    ) {
      const signals = this.buildRecoverySignals(healthContext, recoveryTrend);

      return {
        priority: "recovery",
        message: "Focus on recovery meals and hydration today.",
        signals,
      };
    }

    if (
      nutritionProfile?.goal === "muscle_gain" &&
      healthContext.fatigueLevel === "LOW" &&
      hasHighMotivation
    ) {
      const signals = this.collectSignals([
        "muscle_gain_goal",
        "high_motivation",
        "low_fatigue",
        recoveryTrend === "improving" ? "improving_recovery" : null,
      ]);

      return {
        priority: "performance",
        message: "Support today's training with consistent meals around your session.",
        signals,
      };
    }

    if (hasLowConsistencySignal) {
      const signals = this.collectSignals([
        hasLowMealFrequency ? "low_meal_frequency" : null,
        hasLowMotivation ? "low_motivation" : null,
        healthContext.adherenceScore < 50 ? "low_consistency" : null,
      ]);

      return {
        priority: "consistency",
        message: "Keep your meals consistent today to support recovery and routine.",
        signals,
      };
    }

    return {
      priority: "consistency",
      message: nutritionProfile
        ? "Stay consistent with your meals to support today's training rhythm."
        : "Keep your nutrition routine consistent today.",
      signals: nutritionProfile ? ["consistent_meal_rhythm"] : ["general_consistency"],
    };
  }

  private buildDebugSnapshot(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService["build"]>>,
    recovery: GetHomeDashboardOutput["dashboard"]["recovery"],
    nutritionGuidance: GetHomeDashboardOutput["dashboard"]["nutritionGuidance"],
  ): GetHomeDashboardOutput["dashboard"]["debug"] {
    return {
      generatedAt: healthContext.generatedAt.toISOString(),
      recoverySignals: this.buildRecoverySignals(healthContext, recovery.recoveryTrend),
      nutritionSignals: nutritionGuidance.signals,
    };
  }

  private buildRecoverySignals(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService["build"]>>,
    recoveryTrend: GetHomeDashboardOutput["dashboard"]["recovery"]["recoveryTrend"],
  ): string[] {
    const latestCheckIn = healthContext.latestCheckIn;
    const hasLowSleep = latestCheckIn ? latestCheckIn.sleepQuality <= 2 : false;
    const hasHighSoreness = latestCheckIn
      ? latestCheckIn.muscleSoreness >= 4
      : false;

    return this.collectSignals([
      healthContext.fatigueLevel === "HIGH" ? "high_fatigue" : null,
      hasLowSleep ? "poor_sleep" : null,
      hasHighSoreness ? "high_soreness" : null,
      recoveryTrend === "needs_recovery" ? "needs_recovery_trend" : null,
      recoveryTrend === "improving" ? "improving_recovery" : null,
    ]);
  }

  private collectSignals(
    signals: Array<string | null>,
  ): string[] {
    return signals.filter((signal): signal is string => Boolean(signal));
  }

  private calculateRecoveryTrend(
    recentDailyCheckIns: Array<{
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
    }>,
  ): GetHomeDashboardOutput["dashboard"]["recovery"]["recoveryTrend"] {
    if (recentDailyCheckIns.length < 3) {
      return "stable";
    }

    const latest = recentDailyCheckIns[0];
    const oldest = recentDailyCheckIns[recentDailyCheckIns.length - 1];

    let positiveSignals = 0;
    let negativeSignals = 0;

    if (latest.energyLevel > oldest.energyLevel) {
      positiveSignals += 1;
    } else if (latest.energyLevel < oldest.energyLevel) {
      negativeSignals += 1;
    }

    if (latest.sleepQuality > oldest.sleepQuality) {
      positiveSignals += 1;
    } else if (latest.sleepQuality < oldest.sleepQuality) {
      negativeSignals += 1;
    }

    if (latest.muscleSoreness < oldest.muscleSoreness) {
      positiveSignals += 1;
    } else if (latest.muscleSoreness > oldest.muscleSoreness) {
      negativeSignals += 1;
    }

    if (positiveSignals >= 2 && negativeSignals === 0) {
      return "improving";
    }

    if (negativeSignals >= 2 && positiveSignals === 0) {
      return "needs_recovery";
    }

    return "stable";
  }

  private mapRecommendedIntensity(
    fatigueLevel: GetHomeDashboardOutput["dashboard"]["recovery"]["fatigueLevel"],
  ): GetHomeDashboardOutput["dashboard"]["recovery"]["recommendedIntensity"] {
    switch (fatigueLevel) {
      case "HIGH":
        return "low";
      case "LOW":
        return "normal";
      case "MODERATE":
      default:
        return "medium";
    }
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
