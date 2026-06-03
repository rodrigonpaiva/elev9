import { Inject, Injectable } from '@nestjs/common';

import {
  CoachFeedbackGenerator,
  COACH_FEEDBACK_GENERATOR_VERSION,
} from '../../services/coach-feedback/coach-feedback-generator.service';
import { BuildUserHealthContextService } from '../../services/context-builder/build-user-health-context.service';
import { GetCurrentCoachDecisionUseCase } from '../get-current-coach-decision/get-current-coach-decision.use-case';
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
    private readonly getCurrentCoachDecisionUseCase: GetCurrentCoachDecisionUseCase,
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
      const coachDecision = await this.resolveCoachDecision(authUserId);

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
        readinessScore: healthContext.readinessScore,
        fatigueScore: healthContext.fatigueScore,
        recoveryInfluences: healthContext.recoveryInfluences,
        recommendedIntensity: healthContext.recommendedIntensity,
        adaptiveTrainingRecommendation:
          healthContext.adaptiveTrainingRecommendation,
        coachDecision: coachDecision as Parameters<
          CoachFeedbackGenerator['generate']
        >[0]['coachDecision'],
        nutritionProfile: healthContext.nutritionProfile,
      });

      await this.coachFeedbackRepository.create({
        userProfileId: healthContext.userProfileId,
        message: feedback.message,
        insights: feedback.insights,
        recommendations: feedback.recommendations,
        influences: feedback.influences,
        generatorVersion: COACH_FEEDBACK_GENERATOR_VERSION,
        contextSnapshot: this.buildContextSnapshot(healthContext, coachDecision),
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
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    coachDecision?: {
      id: string;
      priority:
        | 'recovery'
        | 'nutrition'
        | 'training'
        | 'consistency'
        | 'motivation';
      headline: string;
      summary: string;
      actionItems: string[];
      influences: Array<{
        code: string;
        label: string;
        impact: 'positive' | 'negative' | 'neutral';
        source:
          | 'recovery'
          | 'nutrition'
          | 'training'
          | 'progress'
          | 'memory';
        weight?: number;
        value?: number;
      }>;
    },
  ): {
    goal?: 'lose_weight' | 'gain_muscle' | 'maintain';
    activityLevel?: 'low' | 'medium' | 'high';
    hasTrainingPlan?: boolean;
    fatigueLevel?: 'LOW' | 'MODERATE' | 'HIGH';
    recoveryTrend?: 'improving' | 'stable' | 'needs_recovery';
    readinessScore?: number;
    fatigueScore?: number;
    recoveryInfluences?: Array<{
      code:
        | 'LOW_SLEEP'
        | 'LOW_ENERGY'
        | 'HIGH_MUSCLE_SORENESS'
        | 'HIGH_ADHERENCE'
        | 'LOW_ADHERENCE'
        | 'HIGH_WORKOUT_LOAD'
        | 'RECENT_WORKOUT_COMPLETION'
        | 'LONG_STREAK'
        | 'MISSED_WORKOUTS';
      label: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight?: number;
      value?: number;
    }>;
    recommendedIntensity?: 'recovery' | 'light' | 'moderate' | 'hard';
    adaptiveTrainingRecommendation?: {
      recommendationType:
        | 'increase_intensity'
        | 'decrease_intensity'
        | 'increase_volume'
        | 'decrease_volume'
        | 'recovery_workout'
        | 'rest_day'
        | 'reschedule_workout'
        | 'maintain';
      recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
      volumeAction: 'increase' | 'maintain' | 'decrease';
      reasoning: string;
      influences: Array<{
        code:
          | 'HIGH_READINESS'
          | 'LOW_READINESS'
          | 'HIGH_FATIGUE'
          | 'LOW_FATIGUE'
          | 'RECOVERY_TREND_IMPROVING'
          | 'RECOVERY_TREND_DECLINING'
          | 'HIGH_ADHERENCE'
          | 'LOW_ADHERENCE'
          | 'LONG_STREAK'
          | 'MISSED_WORKOUTS'
          | 'GOOD_NUTRITION_SUPPORT'
          | 'POOR_NUTRITION_SUPPORT'
          | 'RECENT_WORKOUT_LOAD_HIGH'
          | 'RECENT_WORKOUT_LOAD_LOW';
        label: string;
        impact: 'positive' | 'negative' | 'neutral';
        weight?: number;
        value?: number;
      }>;
    };
    adaptiveRecommendationType?:
      | 'increase_intensity'
      | 'decrease_intensity'
      | 'increase_volume'
      | 'decrease_volume'
      | 'recovery_workout'
      | 'rest_day'
      | 'reschedule_workout'
      | 'maintain';
    adaptiveRecommendedIntensity?: 'recovery' | 'light' | 'moderate' | 'hard';
    adaptiveVolumeAction?: 'increase' | 'maintain' | 'decrease';
    adaptiveTrainingInfluences?: Array<{
      code:
        | 'HIGH_READINESS'
        | 'LOW_READINESS'
        | 'HIGH_FATIGUE'
        | 'LOW_FATIGUE'
        | 'RECOVERY_TREND_IMPROVING'
        | 'RECOVERY_TREND_DECLINING'
        | 'HIGH_ADHERENCE'
        | 'LOW_ADHERENCE'
        | 'LONG_STREAK'
        | 'MISSED_WORKOUTS'
        | 'GOOD_NUTRITION_SUPPORT'
        | 'POOR_NUTRITION_SUPPORT'
        | 'RECENT_WORKOUT_LOAD_HIGH'
        | 'RECENT_WORKOUT_LOAD_LOW';
      label: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight?: number;
      value?: number;
    }>;
    adaptiveTrainingReasoning?: string;
    coachDecisionId?: string;
    coachDecisionPriority?: 'recovery' | 'nutrition' | 'training' | 'consistency' | 'motivation';
    coachDecisionHeadline?: string;
    coachDecisionSummary?: string;
    coachDecisionActionItems?: string[];
    coachDecisionInfluences?: Array<{
      code: string;
      label: string;
      impact: 'positive' | 'negative' | 'neutral';
      source:
        | 'recovery'
        | 'nutrition'
        | 'training'
        | 'progress'
        | 'memory';
      weight?: number;
      value?: number;
    }>;
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
      goal: 'fat_loss' | 'maintenance' | 'muscle_gain';
      mealsPerDay: number;
    };
  } {
    const adaptiveTrainingRecommendation =
      healthContext.adaptiveTrainingRecommendation;
    const adaptiveTrainingInfluences =
      healthContext.adaptiveTrainingInfluences ??
      adaptiveTrainingRecommendation?.influences.map((influence) => ({
        code: influence.code,
        label: influence.label,
        impact: influence.impact,
        weight: influence.weight,
        value: influence.value,
      }));
    const adaptiveRecommendationType =
      healthContext.adaptiveRecommendationType ??
      adaptiveTrainingRecommendation?.recommendationType;
    const adaptiveRecommendedIntensity =
      healthContext.adaptiveRecommendedIntensity ??
      adaptiveTrainingRecommendation?.recommendedIntensity;
    const adaptiveVolumeAction =
      healthContext.adaptiveVolumeAction ??
      adaptiveTrainingRecommendation?.volumeAction;
    const adaptiveTrainingReasoning =
      healthContext.adaptiveTrainingReasoning ??
      adaptiveTrainingRecommendation?.reasoning;
    const coachDecisionInfluences =
      coachDecision?.influences.map((influence) => ({
        code: influence.code,
        label: influence.label,
        impact: influence.impact,
        source: influence.source,
        weight: influence.weight,
        value: influence.value,
      }));

    return {
      goal: healthContext.goal,
      activityLevel: healthContext.activityLevel,
      hasTrainingPlan: Boolean(healthContext.activeTrainingPlanId),
      fatigueLevel: healthContext.fatigueLevel,
      recoveryTrend:
        healthContext.recoveryTrend ??
        this.resolveRecoveryTrendFromFatigueLevel(healthContext.fatigueLevel),
      readinessScore: healthContext.readinessScore,
      fatigueScore: healthContext.fatigueScore,
      recoveryInfluences: healthContext.recoveryInfluences?.map((influence) => ({
        code: influence.code,
        label: influence.label,
        impact: influence.impact,
        weight: influence.weight,
        value: influence.value,
      })),
      recommendedIntensity: healthContext.recommendedIntensity,
      ...(adaptiveTrainingRecommendation
        ? {
            adaptiveTrainingRecommendation: {
              recommendationType: adaptiveTrainingRecommendation.recommendationType,
              recommendedIntensity:
                adaptiveTrainingRecommendation.recommendedIntensity,
              volumeAction: adaptiveTrainingRecommendation.volumeAction,
              reasoning: adaptiveTrainingRecommendation.reasoning,
              influences: adaptiveTrainingRecommendation.influences.map(
                (influence) => ({
                  code: influence.code,
                  label: influence.label,
                  impact: influence.impact,
                  weight: influence.weight,
                  value: influence.value,
                }),
              ),
            },
          }
        : {}),
      ...(adaptiveTrainingRecommendation || adaptiveRecommendationType
        ? {
            adaptiveRecommendationType,
            adaptiveRecommendedIntensity,
            adaptiveVolumeAction,
            adaptiveTrainingInfluences,
            adaptiveTrainingReasoning,
          }
        : {}),
      ...(coachDecision
        ? {
            coachDecisionId: coachDecision.id,
            coachDecisionPriority: coachDecision.priority,
            coachDecisionHeadline: coachDecision.headline,
            coachDecisionSummary: coachDecision.summary,
            coachDecisionActionItems: [...coachDecision.actionItems],
            coachDecisionInfluences,
          }
        : {}),
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

  private async resolveCoachDecision(authUserId: string) {
    try {
      const result = await this.getCurrentCoachDecisionUseCase.execute({
        authUserId,
      });

      return result?.coachDecision;
    } catch {
      return undefined;
    }
  }

  private resolveRecoveryTrendFromFatigueLevel(
    fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH',
  ): 'improving' | 'stable' | 'needs_recovery' {
    switch (fatigueLevel) {
      case 'LOW':
        return 'improving';
      case 'HIGH':
        return 'needs_recovery';
      case 'MODERATE':
      default:
        return 'stable';
    }
  }
}
