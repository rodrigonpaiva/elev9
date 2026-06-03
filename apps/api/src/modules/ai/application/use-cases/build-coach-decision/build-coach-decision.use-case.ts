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
  NUTRITION_RECOMMENDATION_REPOSITORY,
  NutritionRecommendationRepository,
} from '../../../../nutrition/domain/repositories/nutrition-recommendation.repository';
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
  COACH_DECISION_REPOSITORY,
  CoachDecisionRepository,
} from '../../../domain/repositories/coach-decision.repository';
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
const RECENT_NUTRITION_RECOMMENDATION_LIMIT = 1;
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
    @Inject(NUTRITION_RECOMMENDATION_REPOSITORY)
    private readonly nutritionRecommendationRepository: NutritionRecommendationRepository,
    @Inject(COACH_DECISION_REPOSITORY)
    private readonly coachDecisionRepository: CoachDecisionRepository,
    private readonly getCurrentRecoveryUseCase: GetCurrentRecoveryUseCase,
    private readonly getCurrentGoalUseCase: GetCurrentGoalUseCase,
    private readonly getCurrentAdaptiveTrainingUseCase: GetCurrentAdaptiveTrainingUseCase,
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

      const recoverySnapshot =
        (await this.getCurrentRecoveryUseCase.execute({ authUserId }))
          .recoverySnapshot;
      const goalContext = await this.resolveGoalContext(authUserId);

      const latestNutritionRecommendation =
        await this.nutritionRecommendationRepository.findManyByUserProfileId(
          userProfile.id,
          RECENT_NUTRITION_RECOMMENDATION_LIMIT,
        );
      const nutritionRecommendation =
        latestNutritionRecommendation[0] ?? null;

      const adaptiveTrainingRecommendation =
        (await this.getCurrentAdaptiveTrainingUseCase.execute({ authUserId }))
          .adaptiveTrainingRecommendation;

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
          ? Math.max(0, activeTrainingPlan.weeklySchedule.length - uniqueWorkoutDates)
          : 0;
      const noRecentActivity = Boolean(trainingPlanId) && recentWorkoutLogsCount === 0;

      const nutritionAdherence = this.resolveNutritionAdherence(
        nutritionRecommendation?.contextSnapshot?.adherenceScore,
      );

      const calculatorInput: CoachDecisionCalculatorInput = {
        readinessScore: recoverySnapshot?.readinessScore ?? DEFAULT_NEUTRAL_SCORE,
        fatigueScore: recoverySnapshot?.fatigueScore ?? DEFAULT_NEUTRAL_SCORE,
        nutritionAdherence,
        adaptiveRecommendationType:
          adaptiveTrainingRecommendation?.recommendationType,
        adaptiveIntensity: adaptiveTrainingRecommendation?.recommendedIntensity,
        currentStreak: recentWorkoutLogsCount > 0 ? currentStreak : undefined,
        missedWorkouts: recentWorkoutLogsCount > 0 ? missedWorkouts : undefined,
        goalProgressPercentage: goalContext?.progressPercentage,
        goalTrend: goalContext?.trend,
        goalForecastConfidence: goalContext?.forecastConfidence,
        goalMilestoneClose: goalContext?.milestoneClose,
        goalAchievementReached: goalContext?.achievementReached,
      };

      const calculatedResult =
        this.coachDecisionCalculatorService.calculate(calculatorInput);

      const sourceContext = {
        ...(goalContext
          ? {
              goalId: goalContext.goalId,
              goalType: goalContext.goalType,
              goalProgressPercentage: goalContext.progressPercentage,
              goalTrend: goalContext.trend,
              goalForecastConfidence: goalContext.forecastConfidence,
              goalMilestoneClose: goalContext.milestoneClose,
              goalAchievementReached: goalContext.achievementReached,
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
        ...(nutritionRecommendation?.id
          ? { nutritionRecommendationId: nutritionRecommendation.id }
          : {}),
        ...(adaptiveTrainingRecommendation?.id
          ? {
              adaptiveTrainingRecommendationId: adaptiveTrainingRecommendation.id,
            }
          : {}),
        formulaVersion: COACH_DECISION_CALCULATOR_VERSION,
        generatedAt: new Date().toISOString(),
      };

      const coachDecision = await this.coachDecisionRepository.upsertDailyDecision(
        {
          userProfileId: userProfile.id,
          date: todayDate,
          nutritionRecommendationId: nutritionRecommendation?.id,
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
        },
      );

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
      startDate: start.toISOString().slice(0, 10),
      endDate: todayDate,
    };
  }

  private resolveNutritionAdherence(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private async resolveGoalContext(authUserId: string): Promise<{
    goalId?: string;
    goalType?: string;
    progressPercentage?: number;
    trend?: 'improving' | 'stable' | 'declining';
    forecastConfidence?: 'low' | 'medium' | 'high';
    milestoneClose?: boolean;
    achievementReached?: boolean;
  } | null> {
    try {
      const result = await this.getCurrentGoalUseCase.execute({
        authUserId,
      });

      const progressPercentage = result.progressSnapshot.progressPercentage;

      return {
        goalId: result.goal.id,
        goalType: result.goal.type,
        progressPercentage,
        trend: result.progressSnapshot.trend.value,
        forecastConfidence: result.forecast.confidence.value,
        milestoneClose: progressPercentage >= 75 && progressPercentage < 100,
        achievementReached:
          result.goal.status.value === 'achieved' || progressPercentage >= 100,
      };
    } catch {
      return null;
    }
  }
}
