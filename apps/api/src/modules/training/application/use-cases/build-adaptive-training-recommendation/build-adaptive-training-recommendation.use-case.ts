import { Inject, Injectable, Optional } from '@nestjs/common';

import { calculateStreak } from '../../../../progress/application/use-cases/get-progress-summary/calculate-streak';
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  NUTRITION_TRAINING_SIGNALS_PORT,
  TrainingNutritionSignals,
} from '../../../../nutrition/application/ports/nutrition-consumer.ports';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import { GetTodayRecoveryUseCase } from '../../../../recovery/application/use-cases/get-today-recovery/get-today-recovery.use-case';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../domain/repositories/training-plan.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
  AdaptiveTrainingRecommendationRepository,
} from '../../../domain/repositories/adaptive-training-recommendation.repository';
import type { AdaptiveTrainingSourceContext } from '../../../../../shared/source-context';
import {
  AdaptiveTrainingRecommendationCalculatorInput,
  AdaptiveTrainingRecommendationCalculatorService,
  ADAPTIVE_TRAINING_RECOMMENDATION_CALCULATOR_VERSION,
} from '../../services/adaptive-training-recommendation-calculator.service';
import { AdaptiveTrainingDateService } from '../../services/adaptive-training-date.service';
import {
  BUILD_ADAPTIVE_TRAINING_RECOMMENDATION_ERROR_CODES,
  BuildAdaptiveTrainingRecommendationError,
} from './build-adaptive-training-recommendation.errors';
import { BuildAdaptiveTrainingRecommendationInput } from './build-adaptive-training-recommendation.input';
import { BuildAdaptiveTrainingRecommendationOutput } from './build-adaptive-training-recommendation.output';

const RECENT_WINDOW_DAYS = 7;
const DEFAULT_NEUTRAL_SCORE = 50;

@Injectable()
export class BuildAdaptiveTrainingRecommendationUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    @Inject(NUTRITION_TRAINING_SIGNALS_PORT)
    private readonly nutritionSignalsPort: {
      getTrainingSignals(input: { authUserId: string }): Promise<TrainingNutritionSignals>;
    },
    @Inject(ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY)
    private readonly adaptiveTrainingRecommendationRepository: AdaptiveTrainingRecommendationRepository,
    private readonly adaptiveTrainingRecommendationCalculatorService: AdaptiveTrainingRecommendationCalculatorService,
    private readonly adaptiveTrainingDateService: AdaptiveTrainingDateService,
    @Optional()
    private readonly getTodayRecoveryUseCase?: GetTodayRecoveryUseCase,
  ) {}

  async execute(
    input: BuildAdaptiveTrainingRecommendationInput,
  ): Promise<BuildAdaptiveTrainingRecommendationOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildAdaptiveTrainingRecommendationError(
        BUILD_ADAPTIVE_TRAINING_RECOMMENDATION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildAdaptiveTrainingRecommendationError(
          BUILD_ADAPTIVE_TRAINING_RECOMMENDATION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.adaptiveTrainingDateService.todayUtcDateString();
      const recentWindow = this.getRecentWindowDateRange(todayDate);

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

      const recoverySnapshot = this.getTodayRecoveryUseCase
        ? (await this.getTodayRecoveryUseCase.execute({ authUserId }))
            .recoverySnapshot
        : await this.recoverySnapshotRepository.findLatestByUserProfileId(
            userProfile.id,
          );

      const recentWorkoutLogs = trainingPlanId
        ? await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
            trainingPlanIds: [trainingPlanId],
            startDate: recentWindow.startDate,
            endDate: recentWindow.endDate,
          })
        : [];
      const orderedWorkoutLogs = trainingPlanId
        ? await this.workoutLogRepository.findByTrainingPlanIdsOrdered({
            trainingPlanIds: [trainingPlanId],
            limit: 30,
          })
        : [];

      const nutritionSignals = await this.nutritionSignalsPort.getTrainingSignals({
        authUserId,
      });
      const nutritionAdherence = nutritionSignals.adherencePercentage ?? DEFAULT_NEUTRAL_SCORE;

      const recentWorkoutLogsCount = recentWorkoutLogs.length;
      const currentStreak = calculateStreak(orderedWorkoutLogs as WorkoutLog[]);
      const uniqueWorkoutDates = new Set(
        recentWorkoutLogs.map((log) => log.date),
      ).size;
      const missedWorkouts =
        activeTrainingPlan && recentWorkoutLogsCount > 0
          ? Math.max(
              0,
              activeTrainingPlan.weeklySchedule.length - uniqueWorkoutDates,
            )
          : 0;
      const recentWorkoutLoad =
        this.calculateRecentWorkoutLoad(recentWorkoutLogs);
      const adherenceScore = this.calculateAdherenceScore({
        hasTrainingPlan: Boolean(activeTrainingPlan),
        trainingPlanDays: activeTrainingPlan?.weeklySchedule.length ?? 0,
        recentWorkoutLogsCount,
        uniqueWorkoutDates,
      });

      const recoverySnapshotId = undefined;
      const nutritionRecommendationId = undefined;

      const calculatorInput: AdaptiveTrainingRecommendationCalculatorInput = {
        readinessScore:
          recoverySnapshot?.readinessScore ?? DEFAULT_NEUTRAL_SCORE,
        fatigueScore: recoverySnapshot?.fatigueScore ?? DEFAULT_NEUTRAL_SCORE,
        recoveryTrend: recoverySnapshot?.recoveryTrend ?? 'stable',
        recoveryRecommendedIntensity:
          recoverySnapshot?.recommendedIntensity ?? 'moderate',
        adherenceScore,
        currentStreak,
        missedWorkouts,
        recentWorkoutLoad,
        nutritionAdherence,
      };

      const calculatedResult =
        this.adaptiveTrainingRecommendationCalculatorService.calculate(
          calculatorInput,
        );

      const sourceContext: AdaptiveTrainingSourceContext = {
        readinessScore: calculatorInput.readinessScore,
        fatigueScore: calculatorInput.fatigueScore,
        recoveryTrend: calculatorInput.recoveryTrend,
        recoveryRecommendedIntensity:
          calculatorInput.recoveryRecommendedIntensity,
        adherenceScore,
        currentStreak,
        missedWorkouts,
        recentWorkoutLoad,
        nutritionAdherence,
        recentWorkoutLogsCount,
        ...(typeof trainingPlanId === 'string' ? { trainingPlanId } : {}),
        ...(typeof recoverySnapshotId === 'string'
          ? { recoverySnapshotId }
          : {}),
        ...(typeof nutritionRecommendationId === 'string'
          ? { nutritionRecommendationId }
          : {}),
        formulaVersion: ADAPTIVE_TRAINING_RECOMMENDATION_CALCULATOR_VERSION,
        generatedAt: new Date().toISOString(),
      };

      const adaptiveTrainingRecommendation =
        await this.adaptiveTrainingRecommendationRepository.upsertDailyRecommendation(
          {
            userProfileId: userProfile.id,
            trainingPlanId,
            date: todayDate,
            recommendationType: calculatedResult.recommendationType,
            recommendedIntensity: calculatedResult.recommendedIntensity,
            volumeAction: calculatedResult.volumeAction,
            reasoning: calculatedResult.reasoning,
            influences: calculatedResult.influences.map((influence) =>
              typeof influence.toJSON === 'function'
                ? influence.toJSON()
                : influence,
            ),
            sourceContext,
            formulaVersion: ADAPTIVE_TRAINING_RECOMMENDATION_CALCULATOR_VERSION,
            generatedBy: 'deterministic',
          },
        );

      return {
        adaptiveTrainingRecommendation,
      };
    } catch (error) {
      if (error instanceof BuildAdaptiveTrainingRecommendationError) {
        throw error;
      }

      throw new BuildAdaptiveTrainingRecommendationError(
        BUILD_ADAPTIVE_TRAINING_RECOMMENDATION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private calculateAdherenceScore(input: {
    hasTrainingPlan: boolean;
    trainingPlanDays: number;
    recentWorkoutLogsCount: number;
    uniqueWorkoutDates: number;
  }): number {
    if (!input.hasTrainingPlan || input.trainingPlanDays <= 0) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    if (input.recentWorkoutLogsCount === 0) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round((input.uniqueWorkoutDates / input.trainingPlanDays) * 100),
      ),
    );
  }

  private calculateRecentWorkoutLoad(workoutLogs: WorkoutLog[]): number {
    if (workoutLogs.length === 0) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    const totalDurationMinutes = workoutLogs.reduce(
      (total, log) => total + log.durationMinutes,
      0,
    );
    const totalExercises = workoutLogs.reduce(
      (total, log) => total + log.completedExercises.length,
      0,
    );

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          workoutLogs.length * 14 +
            totalDurationMinutes * 0.35 +
            totalExercises * 2,
        ),
      ),
    );
  }

  private getRecentWindowDateRange(todayDate: string): {
    startDate: string;
    endDate: string;
  } {
    const endDate = todayDate;
    const end = new Date(`${todayDate}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() - (RECENT_WINDOW_DAYS - 1));

    return {
      startDate: this.adaptiveTrainingDateService.getDateString(end),
      endDate,
    };
  }

}
