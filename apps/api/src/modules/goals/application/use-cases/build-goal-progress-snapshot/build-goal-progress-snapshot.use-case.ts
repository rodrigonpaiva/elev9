import { Inject, Injectable } from '@nestjs/common';

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import {
  NUTRITION_GOAL_SIGNALS_PORT,
  GoalNutritionSignals,
} from '../../../../nutrition/application/ports/nutrition-consumer.ports';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
  AdaptiveTrainingRecommendationRepository,
} from '../../../../training/domain/repositories/adaptive-training-recommendation.repository';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import { calculateStreak } from '../../../../progress/application/use-cases/get-progress-summary/calculate-streak';
import { DailyCheckIn } from '../../../../progress/domain/entities/daily-check-in.entity';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import { FitnessGoal } from '../../../../fitness/domain/entities/fitness-profile.entity';
import { Goal } from '../../../domain/entities/goal.entity';
import { GoalProgressCalculatorService } from '../../services/goal-progress-calculator.service';
import { GoalDateService } from '../../services/goal-date.service';
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../domain/repositories/goal.repository';
import {
  GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
  GoalProgressSnapshotRepository,
} from '../../../domain/repositories/goal-progress-snapshot.repository';
import type { GoalSourceContext } from '../../../../../shared/source-context';
import {
  BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES,
  BuildGoalProgressSnapshotError,
} from './build-goal-progress-snapshot.errors';
import { BuildGoalProgressSnapshotInput } from './build-goal-progress-snapshot.input';
import { BuildGoalProgressSnapshotOutput } from './build-goal-progress-snapshot.output';

const RECENT_WINDOW_DAYS = 7;
const DEFAULT_NEUTRAL_SCORE = 50;
const RECENT_SNAPSHOT_LIMIT = 8;
const GOAL_PROGRESS_CALCULATOR_VERSION = 'goal-deterministic-v1';

@Injectable()
export class BuildGoalProgressSnapshotUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    @Inject(NUTRITION_GOAL_SIGNALS_PORT)
    private readonly nutritionSignalsPort: {
      getGoalSignals(input: {
        authUserId: string;
        userProfileId: string;
        startDate: string;
        endDate: string;
      }): Promise<GoalNutritionSignals>;
    },
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    @Inject(ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY)
    private readonly adaptiveTrainingRecommendationRepository: AdaptiveTrainingRecommendationRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    private readonly goalProgressCalculatorService: GoalProgressCalculatorService,
    private readonly goalDateService: GoalDateService,
  ) {}

  async execute(
    input: BuildGoalProgressSnapshotInput,
  ): Promise<BuildGoalProgressSnapshotOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildGoalProgressSnapshotError(
        BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildGoalProgressSnapshotError(
          BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const activeGoal = await this.goalRepository.findActiveByUserProfileId(
        userProfile.id,
      );

      if (!activeGoal) {
        throw new BuildGoalProgressSnapshotError(
          BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES.GOAL_NOT_FOUND,
          'Active goal not found.',
        );
      }

      const todayDate = this.goalDateService.todayUtcDateString();
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

      const recentWorkoutLogs = activeTrainingPlan
        ? await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
            trainingPlanIds: [activeTrainingPlan.id],
            startDate: recentWindow.startDate,
            endDate: recentWindow.endDate,
          })
        : [];
      const orderedWorkoutLogs = activeTrainingPlan
        ? await this.workoutLogRepository.findByTrainingPlanIdsOrdered({
            trainingPlanIds: [activeTrainingPlan.id],
            limit: RECENT_SNAPSHOT_LIMIT,
          })
        : [];
      const recentCheckIns =
        await this.dailyCheckInRepository.findManyByUserProfileId(
          userProfile.id,
        );
      const nutritionSignals = await this.nutritionSignalsPort.getGoalSignals({
        authUserId,
        userProfileId: userProfile.id,
        startDate: recentWindow.startDate,
        endDate: recentWindow.endDate,
      });
      const recoverySnapshot =
        await this.recoverySnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const adaptiveTrainingRecommendation =
        await this.adaptiveTrainingRecommendationRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const recentGoalSnapshots =
        await this.goalProgressSnapshotRepository.findManyByGoalId(
          activeGoal.id,
          {
            limit: RECENT_SNAPSHOT_LIMIT + 1,
          },
        );
      const previousSnapshots = recentGoalSnapshots
        .filter((snapshot) => snapshot.date !== todayDate)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(-RECENT_SNAPSHOT_LIMIT)
        .map((snapshot) => ({
          progressPercentage: snapshot.progressPercentage,
        }));

      const goalSignals = this.resolveGoalSignals({
        activeGoal,
        fitnessProfileWeightKg: fitnessProfile?.weightKg,
        recentWorkoutLogs,
        orderedWorkoutLogs,
        recentCheckIns,
        nutritionSignals,
        recoverySnapshot,
        previousSnapshots,
      });

      const calculatorResult = this.goalProgressCalculatorService.calculate({
        goalType: activeGoal.type,
        startValue: goalSignals.startValue,
        currentValue: goalSignals.currentValue,
        targetValue: goalSignals.targetValue,
        adherenceScore: goalSignals.adherenceScore,
        recoveryScore: goalSignals.recoveryScore,
        consistencyScore: goalSignals.consistencyScore,
        previousSnapshots: goalSignals.previousSnapshots,
      });

      const sourceContext: GoalSourceContext = {
        goalType: activeGoal.type,
        startValue: goalSignals.startValue,
        currentValue: goalSignals.currentValue,
        targetValue: goalSignals.targetValue,
        adherenceScore: goalSignals.adherenceScore,
        recoveryScore: goalSignals.recoveryScore,
        consistencyScore: goalSignals.consistencyScore,
        workoutLogsCount: recentWorkoutLogs.length,
        checkInsCount: recentCheckIns.length,
        ...(adaptiveTrainingRecommendation?.id
          ? {
              adaptiveTrainingRecommendationId:
                adaptiveTrainingRecommendation.id,
            }
          : {}),
        formulaVersion: GOAL_PROGRESS_CALCULATOR_VERSION,
        generatedAt: new Date().toISOString(),
      };

      const persistedSnapshot =
        await this.goalProgressSnapshotRepository.upsertDailySnapshot({
          goalId: activeGoal.id,
          userProfileId: userProfile.id,
          date: todayDate,
          progressPercentage: calculatorResult.progressPercentage,
          currentValue: goalSignals.currentValue,
          targetValue: goalSignals.targetValue,
          trend: calculatorResult.trend,
          sourceContext,
          formulaVersion: GOAL_PROGRESS_CALCULATOR_VERSION,
        });

      return {
        goalProgressSnapshot: persistedSnapshot,
      };
    } catch (error) {
      if (error instanceof BuildGoalProgressSnapshotError) {
        throw error;
      }

      throw new BuildGoalProgressSnapshotError(
        BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveGoalSignals(input: {
    activeGoal: Goal;
    fitnessProfileWeightKg?: number;
    recentWorkoutLogs: WorkoutLog[];
    orderedWorkoutLogs: WorkoutLog[];
    recentCheckIns: DailyCheckIn[];
    nutritionSignals: GoalNutritionSignals;
    recoverySnapshot: { readinessScore: number; fatigueScore: number } | null;
    previousSnapshots: { progressPercentage: number }[];
  }): {
    startValue: number;
    currentValue: number;
    targetValue: number;
    adherenceScore: number;
    recoveryScore: number;
    consistencyScore: number;
    previousSnapshots: { progressPercentage: number }[];
  } {
    const recoveryScore = input.recoverySnapshot?.readinessScore ?? 50;
    const adherenceScore = this.calculateAdherenceScore({
      recentWorkoutLogsCount: input.recentWorkoutLogs.length,
      recentCheckInsCount: input.recentCheckIns.length,
      recentNutritionLogsCount: input.nutritionSignals.recentLoggedDays,
      hasActiveNutritionPlan: input.nutritionSignals.hasActivePlan,
    });
    const consistencyScore = this.calculateConsistencyScore({
      workoutLogs: input.orderedWorkoutLogs,
      recentWorkoutLogsCount: input.recentWorkoutLogs.length,
      recentCheckInsCount: input.recentCheckIns.length,
    });

    switch (input.activeGoal.type) {
      case 'lose_weight':
        this.assertTargetValue(input.activeGoal.targetValue, 'lose_weight');
        return {
          startValue: this.resolveSyntheticStartingWeight(
            input.fitnessProfileWeightKg ?? 0,
            input.activeGoal.targetValue ?? 0,
            'down',
          ),
          currentValue:
            input.fitnessProfileWeightKg ?? input.activeGoal.targetValue ?? 0,
          targetValue: input.activeGoal.targetValue ?? 0,
          adherenceScore,
          recoveryScore,
          consistencyScore,
          previousSnapshots: input.previousSnapshots,
        };
      case 'gain_muscle':
        this.assertTargetValue(input.activeGoal.targetValue, 'gain_muscle');
        return {
          startValue: this.resolveSyntheticStartingWeight(
            input.fitnessProfileWeightKg ?? 0,
            input.activeGoal.targetValue ?? 0,
            'up',
          ),
          currentValue:
            input.fitnessProfileWeightKg ?? input.activeGoal.targetValue ?? 0,
          targetValue: input.activeGoal.targetValue ?? 0,
          adherenceScore,
          recoveryScore,
          consistencyScore,
          previousSnapshots: input.previousSnapshots,
        };
      case 'maintain_weight':
        return {
          startValue: input.fitnessProfileWeightKg ?? 0,
          currentValue: input.fitnessProfileWeightKg ?? 0,
          targetValue:
            input.activeGoal.targetValue ?? input.fitnessProfileWeightKg ?? 0,
          adherenceScore,
          recoveryScore,
          consistencyScore,
          previousSnapshots: input.previousSnapshots,
        };
      case 'improve_consistency':
        return {
          startValue: 0,
          currentValue: consistencyScore,
          targetValue: 100,
          adherenceScore,
          recoveryScore,
          consistencyScore,
          previousSnapshots: input.previousSnapshots,
        };
      case 'improve_recovery':
      default:
        return {
          startValue: 0,
          currentValue: recoveryScore,
          targetValue: 100,
          adherenceScore,
          recoveryScore,
          consistencyScore,
          previousSnapshots: input.previousSnapshots,
        };
    }
  }

  private calculateAdherenceScore(input: {
    recentWorkoutLogsCount: number;
    recentCheckInsCount: number;
    recentNutritionLogsCount: number;
    hasActiveNutritionPlan: boolean;
  }): number {
    const workoutScore =
      input.recentWorkoutLogsCount > 0
        ? Math.min(100, input.recentWorkoutLogsCount * 20)
        : DEFAULT_NEUTRAL_SCORE;
    const checkInScore =
      input.recentCheckInsCount > 0
        ? Math.min(100, input.recentCheckInsCount * 14)
        : DEFAULT_NEUTRAL_SCORE;
    const nutritionScore =
      input.hasActiveNutritionPlan && input.recentNutritionLogsCount > 0
        ? Math.min(100, input.recentNutritionLogsCount * 20)
        : DEFAULT_NEUTRAL_SCORE;

    return Math.min(
      100,
      Math.max(
        0,
        Math.round((workoutScore + checkInScore + nutritionScore) / 3),
      ),
    );
  }

  private calculateConsistencyScore(input: {
    workoutLogs: WorkoutLog[];
    recentWorkoutLogsCount: number;
    recentCheckInsCount: number;
  }): number {
    if (input.workoutLogs.length === 0) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    const streak = calculateStreak(input.workoutLogs);
    const streakScore = Math.min(100, streak * 10);
    const workoutScore = Math.min(100, input.recentWorkoutLogsCount * 20);
    const checkInScore = Math.min(100, input.recentCheckInsCount * 14);

    return Math.min(
      100,
      Math.max(0, Math.round((streakScore + workoutScore + checkInScore) / 3)),
    );
  }

  private resolveSyntheticStartingWeight(
    currentWeight: number,
    targetWeight: number,
    direction: 'up' | 'down',
  ): number {
    const distance = Math.max(Math.abs(currentWeight - targetWeight), 5);

    return direction === 'down'
      ? currentWeight + distance
      : currentWeight - distance;
  }

  private assertTargetValue(
    targetValue: number | undefined,
    goalType: FitnessGoal,
  ): asserts targetValue is number {
    if (typeof targetValue !== 'number' || Number.isNaN(targetValue)) {
      throw new BuildGoalProgressSnapshotError(
        BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES.MISSING_TARGET_VALUE,
        `Target value is required for ${goalType}.`,
      );
    }
  }

  private getRecentWindowDateRange(todayDate: string): {
    startDate: string;
    endDate: string;
  } {
    const startDate = this.goalDateService.addDaysToDateString(
      todayDate,
      -(RECENT_WINDOW_DAYS - 1),
    );

    return {
      startDate,
      endDate: todayDate,
    };
  }
}
