import { Inject, Injectable } from '@nestjs/common';

import {
  CoachFeedbackGenerator,
  COACH_FEEDBACK_GENERATOR_VERSION,
} from '../../services/coach-feedback/coach-feedback-generator.service';
import { BuildUserHealthContextService } from '../../services/context-builder/build-user-health-context.service';
import {
  CoachDecisionReadModelMapper,
  type HabitReadModel,
  type HabitMemoryPayload,
  PersonalizationReadModelMapper,
  type PersonalizationReadModelSource,
  type PersonalizationMemoryPayload,
  type PersonalizationPromptPayload,
} from '../../../../../shared/mappers';
import { NotificationReadModelMapper } from '../../../../../shared/mappers';
import { HabitReadModelMapper } from '../../../../../shared/mappers';
import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { GetCurrentCoachDecisionUseCase } from '../get-current-coach-decision/get-current-coach-decision.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
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
    private readonly getCurrentNotificationUseCase: GetCurrentNotificationUseCase,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    private readonly getCurrentHabitsUseCase: GetCurrentHabitsUseCase,
    private readonly getConsistencySummaryUseCase: GetConsistencySummaryUseCase,
    private readonly getHabitRiskSignalsUseCase: GetHabitRiskSignalsUseCase,
    private readonly getCurrentPersonalizationUseCase: GetCurrentPersonalizationUseCase,
    private readonly getUserBehaviorProfileUseCase: GetUserBehaviorProfileUseCase,
    private readonly getBehavioralPatternsUseCase: GetBehavioralPatternsUseCase,
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
      const notification = await this.resolveNotification(authUserId);
      const habit = await this.resolveHabit(authUserId);
      const habitMemory = HabitReadModelMapper.toMemoryPayload(habit);
      const personalization = await this.resolvePersonalization(authUserId);
      const personalizationPrompt =
        PersonalizationReadModelMapper.toPromptPayload(personalization);
      const personalizationMemory =
        PersonalizationReadModelMapper.toMemoryPayload(personalization);

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
        habit: HabitReadModelMapper.toPromptPayload(habit),
        coachDecision:
          CoachDecisionReadModelMapper.toFeedbackPayload(coachDecision),
        notification: NotificationReadModelMapper.toPromptPayload(
          notification?.current,
          notification?.engagementSummary,
        ),
        ...(personalizationPrompt
          ? { personalization: personalizationPrompt }
          : {}),
      });

      await this.coachFeedbackRepository.create({
        userProfileId: healthContext.userProfileId,
        message: feedback.message,
        insights: feedback.insights,
        recommendations: feedback.recommendations,
        influences: feedback.influences,
        generatorVersion: COACH_FEEDBACK_GENERATOR_VERSION,
        contextSnapshot: this.buildContextSnapshot(
          healthContext,
          coachDecision,
          habitMemory,
          personalizationPrompt ?? personalizationMemory,
        ),
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
    coachDecision?: CoachDecision,
    habit?: HabitMemoryPayload,
    personalization?:
      | PersonalizationPromptPayload
      | PersonalizationMemoryPayload,
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
    coachDecisionPriority?:
      | 'recovery'
      | 'nutrition'
      | 'training'
      | 'consistency'
      | 'motivation';
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
        | 'memory'
        | 'notification'
        | 'habit'
        | 'personalization';
      weight?: number;
      value?: number;
    }>;
    habitConsistencyScore?: number;
    habitTrend?: 'improving' | 'stable' | 'declining';
    habitCurrentStreak?: number;
    habitRiskLevel?: 'low' | 'medium' | 'high';
    personalization?:
      | PersonalizationPromptPayload
      | PersonalizationMemoryPayload;
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
      recoveryInfluences: healthContext.recoveryInfluences?.map(
        (influence) => ({
          code: influence.code,
          label: influence.label,
          impact: influence.impact,
          weight: influence.weight,
          value: influence.value,
        }),
      ),
      recommendedIntensity: healthContext.recommendedIntensity,
      ...(adaptiveTrainingRecommendation
        ? {
            adaptiveTrainingRecommendation: {
              recommendationType:
                adaptiveTrainingRecommendation.recommendationType,
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
            ...CoachDecisionReadModelMapper.toFeedbackContextSnapshot(
              coachDecision,
            ),
          }
        : {}),
      ...(habit
        ? {
            habitConsistencyScore: habit.habitConsistencyScore,
            habitTrend: habit.habitTrend,
            habitCurrentStreak: habit.habitCurrentStreak,
            habitRiskLevel: habit.habitRiskLevel,
          }
        : {}),
      ...(personalization
        ? {
            personalization: {
              ...personalization,
            },
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
    };
  }

  private async resolveHabit(
    authUserId: string,
  ): Promise<HabitReadModel | undefined> {
    try {
      const [currentResult, summaryResult, riskSignalsResult] =
        await Promise.allSettled([
          this.getCurrentHabitsUseCase.execute({ authUserId }),
          this.getConsistencySummaryUseCase.execute({ authUserId }),
          this.getHabitRiskSignalsUseCase.execute({ authUserId }),
        ]);

      return {
        ...(currentResult.status === 'fulfilled'
          ? { current: currentResult.value.habitSnapshot }
          : {}),
        ...(summaryResult.status === 'fulfilled'
          ? { summary: summaryResult.value.consistencySummary }
          : {}),
        ...(riskSignalsResult.status === 'fulfilled'
          ? { riskSignals: riskSignalsResult.value.habitRiskSignals }
          : {}),
      };
    } catch {
      return undefined;
    }
  }

  private async resolvePersonalization(
    authUserId: string,
  ): Promise<PersonalizationReadModelSource | undefined> {
    try {
      const [snapshotResult, profileResult, patternsResult] =
        await Promise.allSettled([
          this.getCurrentPersonalizationUseCase.execute({ authUserId }),
          this.getUserBehaviorProfileUseCase.execute({ authUserId }),
          this.getBehavioralPatternsUseCase.execute({ authUserId }),
        ]);

      return {
        snapshot:
          snapshotResult.status === 'fulfilled'
            ? snapshotResult.value.personalizationSnapshot
            : undefined,
        profile:
          profileResult.status === 'fulfilled'
            ? profileResult.value.userBehaviorProfile
            : undefined,
        patterns:
          patternsResult.status === 'fulfilled'
            ? patternsResult.value.behavioralPatterns
            : undefined,
      };
    } catch {
      return undefined;
    }
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

  private async resolveNotification(authUserId: string): Promise<{
    current?: Parameters<typeof NotificationReadModelMapper.toPromptPayload>[0];
    engagementSummary?: Parameters<
      typeof NotificationReadModelMapper.toPromptPayload
    >[1];
  } | null> {
    try {
      const [currentResult, engagementSummaryResult] = await Promise.allSettled(
        [
          this.getCurrentNotificationUseCase.execute({
            authUserId,
          }),
          this.getEngagementSummaryUseCase.execute({
            authUserId,
          }),
        ],
      );

      return {
        current:
          currentResult.status === 'fulfilled'
            ? currentResult.value.notificationDecision
            : undefined,
        engagementSummary:
          engagementSummaryResult.status === 'fulfilled'
            ? engagementSummaryResult.value.engagementSummary
            : undefined,
      };
    } catch {
      return null;
    }
  }
}
