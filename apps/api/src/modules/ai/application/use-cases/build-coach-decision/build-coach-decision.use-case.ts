import { Inject, Injectable } from '@nestjs/common';

import { calculateStreak } from '../../../../progress/application/use-cases/get-progress-summary/calculate-streak';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  NUTRITION_NOTIFICATION_SIGNALS_PORT,
  NotificationNutritionSignals,
} from '../../../../nutrition/application/ports/nutrition-consumer.ports';
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { GetCurrentRecoveryUseCase } from '../../../../recovery/application/use-cases/get-current-recovery/get-current-recovery.use-case';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetCurrentAdaptiveTrainingUseCase } from '../../../../training/application/use-cases/get-current-adaptive-training/get-current-adaptive-training.use-case';
import {
  GoalCoachDecisionSignals,
  GoalReadModelMapper,
} from '../../../../../shared/mappers';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { NotificationReadModelMapper } from '../../../../../shared/mappers';
import { HabitReadModelMapper } from '../../../../../shared/mappers';
import { PersonalizationReadModelMapper } from '../../../../../shared/mappers';
import {
  COACH_DECISION_REPOSITORY,
  CoachDecisionRepository,
} from '../../../domain/repositories/coach-decision.repository';
import type { CoachDecisionSourceContext } from '../../../../../shared/source-context';
import {
  COACH_DECISION_CALCULATOR_VERSION,
  CoachDecisionCalculatorInput,
  CoachDecisionCalculatorService,
} from '../../services/coach-decision-calculator.service';
import { CoachDecisionDateService } from '../../services/coach-decision-date.service';
import {
  BUILD_COACH_DECISION_ERROR_CODES,
  BuildCoachDecisionError,
} from './build-coach-decision.errors';
import { BuildCoachDecisionInput } from './build-coach-decision.input';
import { BuildCoachDecisionOutput } from './build-coach-decision.output';

const RECENT_WINDOW_DAYS = 7;
const DEFAULT_NEUTRAL_SCORE = 50;

@Injectable()
export class BuildCoachDecisionUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(NUTRITION_NOTIFICATION_SIGNALS_PORT)
    private readonly nutritionSignalsPort: {
      getNotificationSignals(input: { authUserId: string }): Promise<NotificationNutritionSignals>;
    },
    @Inject(COACH_DECISION_REPOSITORY)
    private readonly coachDecisionRepository: CoachDecisionRepository,
    private readonly getCurrentRecoveryUseCase: GetCurrentRecoveryUseCase,
    private readonly getCurrentGoalUseCase: GetCurrentGoalUseCase,
    private readonly getCurrentAdaptiveTrainingUseCase: GetCurrentAdaptiveTrainingUseCase,
    private readonly getCurrentNotificationUseCase: GetCurrentNotificationUseCase,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    private readonly getCurrentHabitsUseCase: GetCurrentHabitsUseCase,
    private readonly getConsistencySummaryUseCase: GetConsistencySummaryUseCase,
    private readonly getHabitRiskSignalsUseCase: GetHabitRiskSignalsUseCase,
    private readonly getCurrentPersonalizationUseCase: GetCurrentPersonalizationUseCase,
    private readonly getUserBehaviorProfileUseCase: GetUserBehaviorProfileUseCase,
    private readonly getBehavioralPatternsUseCase: GetBehavioralPatternsUseCase,
    private readonly coachDecisionCalculatorService: CoachDecisionCalculatorService,
    private readonly coachDecisionDateService: CoachDecisionDateService,
  ) {}

  async execute(
    input: BuildCoachDecisionInput,
  ): Promise<BuildCoachDecisionOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildCoachDecisionError(
        BUILD_COACH_DECISION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildCoachDecisionError(
          BUILD_COACH_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.coachDecisionDateService.todayUtcDateString();
      const recentWindow = this.getRecentWindowDateRange(todayDate);

      const recoverySnapshot = (
        await this.getCurrentRecoveryUseCase.execute({ authUserId })
      ).recoverySnapshot;
      const goalContext = await this.resolveGoalContext(authUserId);
      const notificationSignals =
        await this.resolveNotificationSignals(authUserId);
      const habitContext = await this.resolveHabitContext(authUserId);
      const personalizationContext =
        await this.resolvePersonalizationContext(authUserId);

      const nutritionSignals = await this.nutritionSignalsPort.getNotificationSignals({
        authUserId,
      });

      const adaptiveTrainingRecommendation = (
        await this.getCurrentAdaptiveTrainingUseCase.execute({ authUserId })
      ).adaptiveTrainingRecommendation;

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      const activeTrainingPlan = fitnessProfile
        ? await this.trainingPlanRepository.findActiveByFitnessProfileId(
            fitnessProfile.id,
          )
        : null;

      const trainingPlanId = activeTrainingPlan?.id;
      const trainingPlanIds = trainingPlanId ? [trainingPlanId] : [];

      const recentWorkoutLogs = trainingPlanIds.length
        ? await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
            trainingPlanIds,
            startDate: recentWindow.startDate,
            endDate: recentWindow.endDate,
          })
        : [];
      const orderedWorkoutLogs = trainingPlanIds.length
        ? await this.workoutLogRepository.findByTrainingPlanIdsOrdered({
            trainingPlanIds,
            limit: 30,
          })
        : [];

      const recentWorkoutLogsCount = recentWorkoutLogs.length;
      const currentStreak = calculateStreak(orderedWorkoutLogs as WorkoutLog[]);
      const uniqueWorkoutDates = new Set(
        recentWorkoutLogs.map((log) => log.date),
      ).size;
      const missedWorkouts =
        trainingPlanId && recentWorkoutLogsCount > 0
          ? Math.max(
              0,
              activeTrainingPlan.weeklySchedule.length - uniqueWorkoutDates,
            )
          : 0;
      const noRecentActivity =
        Boolean(trainingPlanId) && recentWorkoutLogsCount === 0;

      const nutritionAdherence = this.resolveNutritionAdherence(
        nutritionSignals.adherencePercentage ?? undefined,
      );

      const calculatorInput: CoachDecisionCalculatorInput = {
        readinessScore:
          recoverySnapshot?.readinessScore ?? DEFAULT_NEUTRAL_SCORE,
        fatigueScore: recoverySnapshot?.fatigueScore ?? DEFAULT_NEUTRAL_SCORE,
        nutritionAdherence,
        adaptiveRecommendationType:
          adaptiveTrainingRecommendation?.recommendationType,
        adaptiveIntensity: adaptiveTrainingRecommendation?.recommendedIntensity,
        currentStreak: recentWorkoutLogsCount > 0 ? currentStreak : undefined,
        missedWorkouts: recentWorkoutLogsCount > 0 ? missedWorkouts : undefined,
        goalProgressPercentage: goalContext?.goalProgressPercentage,
        goalTrend: goalContext?.goalTrend,
        goalForecastConfidence: goalContext?.goalForecastConfidence,
        goalMilestoneClose: goalContext?.goalMilestoneClose,
        goalAchievementReached: goalContext?.goalAchievementReached,
        ...notificationSignals,
        ...habitContext?.signals,
        ...personalizationContext?.signals,
      };

      const calculatedResult =
        this.coachDecisionCalculatorService.calculate(calculatorInput);

      const sourceContext: CoachDecisionSourceContext = {
        ...(goalContext
          ? {
              goalId: goalContext.goalId,
              goalType: goalContext.goalType,
              goalProgressPercentage: goalContext.goalProgressPercentage,
              goalTrend: goalContext.goalTrend,
              goalForecastConfidence: goalContext.goalForecastConfidence,
              goalMilestoneClose: goalContext.goalMilestoneClose,
              goalAchievementReached: goalContext.goalAchievementReached,
            }
          : {}),
        readinessScore: calculatorInput.readinessScore,
        fatigueScore: calculatorInput.fatigueScore,
        nutritionAdherence,
        adaptiveRecommendationType:
          calculatorInput.adaptiveRecommendationType ?? undefined,
        adaptiveIntensity: calculatorInput.adaptiveIntensity ?? undefined,
        currentStreak,
        missedWorkouts,
        noRecentActivity,
        ...(habitContext?.sourceContext ?? {}),
        ...(personalizationContext?.sourceContext ?? {}),

        ...(adaptiveTrainingRecommendation?.id
          ? {
              adaptiveTrainingRecommendationId:
                adaptiveTrainingRecommendation.id,
            }
          : {}),
        formulaVersion: COACH_DECISION_CALCULATOR_VERSION,
        generatedAt: new Date().toISOString(),
      };

      const coachDecision =
        await this.coachDecisionRepository.upsertDailyDecision({
          userProfileId: userProfile.id,
          date: todayDate,
          nutritionRecommendationId: undefined,
          adaptiveTrainingRecommendationId: adaptiveTrainingRecommendation?.id,
          priority: calculatedResult.priority,
          headline: calculatedResult.headline,
          summary: calculatedResult.summary,
          actionItems: calculatedResult.actionItems,
          influences: calculatedResult.influences.map((influence) =>
            influence.toJSON(),
          ),
          sourceContext,
          formulaVersion: calculatedResult.formulaVersion,
          generatedBy: 'deterministic',
          llmMetadata: {
            used: false,
          },
        });

      return {
        coachDecision,
      };
    } catch (error) {
      if (error instanceof BuildCoachDecisionError) {
        throw error;
      }

      throw new BuildCoachDecisionError(
        BUILD_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private getRecentWindowDateRange(todayDate: string): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date(`${todayDate}T00:00:00.000Z`);
    const start = new Date(today);
    start.setUTCDate(today.getUTCDate() - (RECENT_WINDOW_DAYS - 1));

    return {
      startDate: this.coachDecisionDateService.getDateString(start),
      endDate: todayDate,
    };
  }

  private resolveNutritionAdherence(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private async resolveGoalContext(authUserId: string): Promise<
    | (GoalCoachDecisionSignals & {
        goalMilestoneClose: boolean;
        goalAchievementReached: boolean;
      })
    | null
  > {
    try {
      const result = await this.getCurrentGoalUseCase.execute({
        authUserId,
      });

      const goalSignals = GoalReadModelMapper.toCoachDecisionSignals(result);

      if (!goalSignals) {
        return null;
      }

      return {
        ...goalSignals,
        goalMilestoneClose:
          goalSignals.goalProgressPercentage >= 75 &&
          goalSignals.goalProgressPercentage < 100,
        goalAchievementReached:
          result.goal.status.value === 'achieved' ||
          goalSignals.goalProgressPercentage >= 100,
      };
    } catch {
      return null;
    }
  }

  private async resolveNotificationSignals(
    authUserId: string,
  ): Promise<Pick<
    CoachDecisionCalculatorInput,
    | 'notificationSuppressed'
    | 'notificationFatigueHigh'
    | 'notificationDismissedFrequently'
    | 'notificationHighEngagement'
  > | null> {
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

      const current =
        currentResult.status === 'fulfilled'
          ? currentResult.value.notificationDecision
          : undefined;
      const engagementSummary =
        engagementSummaryResult.status === 'fulfilled'
          ? engagementSummaryResult.value.engagementSummary
          : undefined;
      const notificationSignals =
        NotificationReadModelMapper.toCoachDecisionSignals(
          current,
          engagementSummary,
        );

      return notificationSignals ?? null;
    } catch {
      return null;
    }
  }

  private async resolveHabitContext(authUserId: string): Promise<{
    signals?: Pick<
      CoachDecisionCalculatorInput,
      | 'habitConsistencyImproving'
      | 'habitConsistencyDeclining'
      | 'habitRiskHigh'
      | 'habitStreakStrong'
      | 'habitDropoutRisk'
    >;
    sourceContext?: Pick<
      CoachDecisionSourceContext,
      | 'habitConsistencyScore'
      | 'habitTrend'
      | 'habitCurrentStreak'
      | 'habitRiskLevel'
      | 'habitRiskSignals'
    >;
  } | null> {
    try {
      const [currentResult, summaryResult, riskSignalsResult] =
        await Promise.allSettled([
          this.getCurrentHabitsUseCase.execute({ authUserId }),
          this.getConsistencySummaryUseCase.execute({ authUserId }),
          this.getHabitRiskSignalsUseCase.execute({ authUserId }),
        ]);

      const habitReadModel = {
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

      const signals =
        HabitReadModelMapper.toCoachDecisionSignals(habitReadModel);
      const dashboardPayload =
        HabitReadModelMapper.toDashboardPayload(habitReadModel);

      if (!signals && !dashboardPayload) {
        return null;
      }

      return {
        ...(signals ? { signals } : {}),
        ...(dashboardPayload
          ? {
              sourceContext: {
                ...(dashboardPayload.summary
                  ? {
                      habitConsistencyScore: dashboardPayload.summary.score,
                      habitTrend: dashboardPayload.summary.trend,
                      habitCurrentStreak:
                        dashboardPayload.summary.currentStreak,
                      habitRiskLevel: dashboardPayload.summary.riskLevel,
                    }
                  : dashboardPayload.current
                    ? {
                        habitConsistencyScore:
                          dashboardPayload.current.consistencyScore,
                        habitTrend: dashboardPayload.current.trend,
                        habitCurrentStreak: dashboardPayload.current.streakDays,
                        habitRiskLevel: 'low' as const,
                      }
                    : {}),
                ...(dashboardPayload.riskSignals
                  ? {
                      habitRiskSignals: dashboardPayload.riskSignals.map(
                        (signal) => signal.type,
                      ),
                    }
                  : {}),
              },
            }
          : {}),
      };
    } catch {
      return null;
    }
  }

  private async resolvePersonalizationContext(authUserId: string): Promise<{
    signals?: Pick<
      CoachDecisionCalculatorInput,
      | 'personalizationHighDisengagementRisk'
      | 'personalizationRespondsToStreaks'
      | 'personalizationRespondsToGoals'
      | 'personalizationPrefersDirectCoaching'
      | 'personalizationPrefersMotivationalCoaching'
      | 'personalizationLowNotificationResponsiveness'
    >;
    sourceContext?: Pick<
      CoachDecisionSourceContext,
      | 'personalizationPreferredCoachingStyle'
      | 'personalizationEngagementProfile'
      | 'personalizationNotificationResponsiveness'
      | 'personalizationGoalResponsiveness'
      | 'personalizationRecoveryResponsiveness'
      | 'personalizationHabitResponsiveness'
      | 'personalizationRiskOfDisengagement'
      | 'personalizationTopBehavioralPatterns'
    >;
  } | null> {
    try {
      const [snapshotResult, profileResult, patternsResult] =
        await Promise.allSettled([
          this.getCurrentPersonalizationUseCase.execute({ authUserId }),
          this.getUserBehaviorProfileUseCase.execute({ authUserId }),
          this.getBehavioralPatternsUseCase.execute({ authUserId }),
        ]);

      const personalizationReadModel = {
        ...(snapshotResult.status === 'fulfilled'
          ? { snapshot: snapshotResult.value.personalizationSnapshot }
          : {}),
        ...(profileResult.status === 'fulfilled'
          ? { profile: profileResult.value.userBehaviorProfile }
          : {}),
        ...(patternsResult.status === 'fulfilled'
          ? { patterns: patternsResult.value.behavioralPatterns }
          : {}),
      };

      const signals = PersonalizationReadModelMapper.toCoachDecisionSignals(
        personalizationReadModel,
      );
      const promptPayload = PersonalizationReadModelMapper.toPromptPayload(
        personalizationReadModel,
      );

      if (!signals && !promptPayload) {
        return null;
      }

      return {
        ...(signals ? { signals } : {}),
        ...(promptPayload
          ? {
              sourceContext: {
                personalizationPreferredCoachingStyle:
                  promptPayload.preferredCoachingStyle,
                personalizationEngagementProfile:
                  promptPayload.engagementProfile,
                personalizationNotificationResponsiveness:
                  promptPayload.notificationResponsiveness,
                personalizationGoalResponsiveness:
                  promptPayload.goalResponsiveness,
                personalizationRecoveryResponsiveness:
                  promptPayload.recoveryResponsiveness,
                personalizationHabitResponsiveness:
                  promptPayload.habitResponsiveness,
                personalizationRiskOfDisengagement:
                  promptPayload.riskOfDisengagement,
                personalizationTopBehavioralPatterns:
                  promptPayload.topBehavioralPatterns,
              },
            }
          : {}),
      };
    } catch {
      return null;
    }
  }
}
