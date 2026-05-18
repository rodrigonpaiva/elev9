import { Inject, Injectable } from '@nestjs/common';

import {
  CoachFeedbackGenerator,
  COACH_FEEDBACK_GENERATOR_VERSION,
} from '../../services/coach-feedback/coach-feedback-generator.service';
import { BuildUserHealthContextService } from '../../services/context-builder/build-user-health-context.service';
import {
  COACH_FEEDBACK_REPOSITORY,
  CoachFeedbackRepository,
} from '../../../domain/repositories/coach-feedback.repository';
import { ActivityLevel } from '../../../../fitness/domain/entities/fitness-profile.entity';
import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
  GenerateCoachFeedbackError,
} from './generate-coach-feedback.errors';
import { GenerateCoachFeedbackInput } from './generate-coach-feedback.input';
import { GenerateCoachFeedbackOutput } from './generate-coach-feedback.output';

@Injectable()
export class GenerateCoachFeedbackUseCase {
  constructor(
    @Inject(COACH_FEEDBACK_REPOSITORY)
    private readonly coachFeedbackRepository: CoachFeedbackRepository,
    private readonly coachFeedbackGenerator: CoachFeedbackGenerator,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
  ) {}

  async execute(
    input: GenerateCoachFeedbackInput,
  ): Promise<GenerateCoachFeedbackOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const healthContext = await this.buildUserHealthContextService.build({
        authUserId,
      });

      if (!healthContext.userProfileId) {
        throw new GenerateCoachFeedbackError(
          GENERATE_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      if (!healthContext.goal || !healthContext.activityLevel) {
        throw new GenerateCoachFeedbackError(
          GENERATE_COACH_FEEDBACK_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      const feedback = this.coachFeedbackGenerator.generate({
        goal: healthContext.goal,
        activityLevel: healthContext.activityLevel,
        expectedWorkouts:
          healthContext.weeklyFrequency ??
          this.resolveExpectedWorkouts(healthContext.activityLevel),
        currentStreak: healthContext.currentStreak,
        averageDurationMinutes: healthContext.averageWorkoutDuration,
        workoutLogs: healthContext.recentWorkoutLogs,
        hasTrainingPlan: Boolean(healthContext.activeTrainingPlanId),
        fatigueLevel: healthContext.fatigueLevel,
        latestCheckIn: healthContext.latestCheckIn,
        nutritionProfile: healthContext.nutritionProfile,
      });

      await this.coachFeedbackRepository.create({
        userProfileId: healthContext.userProfileId,
        message: feedback.message,
        insights: feedback.insights,
        recommendations: feedback.recommendations,
        influences: feedback.influences,
        generatorVersion: COACH_FEEDBACK_GENERATOR_VERSION,
        contextSnapshot: this.buildContextSnapshot(healthContext),
      });

      return {
        message: feedback.message,
        insights: feedback.insights,
        recommendations: feedback.recommendations,
      };
    } catch (error) {
      if (error instanceof GenerateCoachFeedbackError) {
        throw error;
      }

      throw new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveExpectedWorkouts(activityLevel: ActivityLevel): number {
    switch (activityLevel) {
      case 'low':
        return 2;
      case 'medium':
        return 3;
      case 'high':
      default:
        return 4;
    }
  }

  private buildContextSnapshot(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService["build"]>>,
  ): {
    goal?: "lose_weight" | "gain_muscle" | "maintain";
    activityLevel?: "low" | "medium" | "high";
    hasTrainingPlan?: boolean;
    fatigueLevel?: "LOW" | "MODERATE" | "HIGH";
    recoveryTrend?: "improving" | "stable" | "needs_recovery";
    weeklyFrequency?: number;
    currentStreak?: number;
    averageWorkoutDuration?: number;
    recentWorkoutLogs?: Array<{
      date: string;
      durationMinutes: number;
      createdAt: string;
    }>;
    latestCheckIn?: {
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
    };
    nutritionProfile?: {
      goal: "fat_loss" | "maintenance" | "muscle_gain";
      mealsPerDay: number;
    };
  } {
    return {
      goal: healthContext.goal,
      activityLevel: healthContext.activityLevel,
      hasTrainingPlan: Boolean(healthContext.activeTrainingPlanId),
      fatigueLevel: healthContext.fatigueLevel,
      recoveryTrend: this.resolveRecoveryTrend(healthContext.fatigueLevel),
      weeklyFrequency: healthContext.weeklyFrequency,
      currentStreak: healthContext.currentStreak,
      averageWorkoutDuration: healthContext.averageWorkoutDuration,
      recentWorkoutLogs: healthContext.recentWorkoutLogs.map((log) => ({
        date: log.date,
        durationMinutes: log.durationMinutes,
        createdAt: log.createdAt.toISOString(),
      })),
      latestCheckIn: healthContext.latestCheckIn
        ? {
            energyLevel: healthContext.latestCheckIn.energyLevel,
            sleepQuality: healthContext.latestCheckIn.sleepQuality,
            muscleSoreness: healthContext.latestCheckIn.muscleSoreness,
            motivationLevel: healthContext.latestCheckIn.motivationLevel,
          }
        : undefined,
      nutritionProfile: healthContext.nutritionProfile
        ? {
            goal: healthContext.nutritionProfile.goal,
            mealsPerDay: healthContext.nutritionProfile.mealsPerDay,
          }
        : undefined,
    };
  }

  private resolveRecoveryTrend(
    fatigueLevel: "LOW" | "MODERATE" | "HIGH",
  ): "improving" | "stable" | "needs_recovery" {
    switch (fatigueLevel) {
      case "LOW":
        return "improving";
      case "HIGH":
        return "needs_recovery";
      case "MODERATE":
      default:
        return "stable";
    }
  }
}
