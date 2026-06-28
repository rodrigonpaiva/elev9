import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../domain/repositories/goal.repository';
import {
  GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
  GoalProgressSnapshotRepository,
} from '../../../domain/repositories/goal-progress-snapshot.repository';
import {
  GOAL_FORECAST_REPOSITORY,
  GoalForecastRepository,
} from '../../../domain/repositories/goal-forecast.repository';
import type { GoalSourceContext } from '../../../../../shared/source-context';
import {
  GOAL_PROGRESS_CALCULATOR_VERSION,
  GoalProgressCalculatorService,
} from '../../services/goal-progress-calculator.service';
import { GoalDateService } from '../../services/goal-date.service';
import {
  BUILD_GOAL_FORECAST_ERROR_CODES,
  BuildGoalForecastError,
} from './build-goal-forecast.errors';
import { BuildGoalForecastInput } from './build-goal-forecast.input';
import { BuildGoalForecastOutput } from './build-goal-forecast.output';

const RECENT_SNAPSHOT_LIMIT = 7;

@Injectable()
export class BuildGoalForecastUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    @Inject(GOAL_FORECAST_REPOSITORY)
    private readonly goalForecastRepository: GoalForecastRepository,
    private readonly goalProgressCalculatorService: GoalProgressCalculatorService,
    private readonly goalDateService: GoalDateService,
  ) {}

  async execute(
    input: BuildGoalForecastInput,
  ): Promise<BuildGoalForecastOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildGoalForecastError(
        BUILD_GOAL_FORECAST_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildGoalForecastError(
          BUILD_GOAL_FORECAST_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const activeGoal = await this.goalRepository.findActiveByUserProfileId(
        userProfile.id,
      );

      if (!activeGoal) {
        throw new BuildGoalForecastError(
          BUILD_GOAL_FORECAST_ERROR_CODES.GOAL_NOT_FOUND,
          'Active goal not found.',
        );
      }

      const snapshots =
        await this.goalProgressSnapshotRepository.findManyByGoalId(
          activeGoal.id,
          {
            limit: RECENT_SNAPSHOT_LIMIT,
          },
        );

      const orderedSnapshots = [...snapshots].sort((left, right) =>
        left.date.localeCompare(right.date),
      );
      const latestSnapshot = orderedSnapshots.at(-1);
      const previousSnapshots = orderedSnapshots.slice(0, -1);
      const currentProgress = latestSnapshot?.progressPercentage ?? 50;
      const trend = this.goalProgressCalculatorService.calculateTrend(
        currentProgress,
        previousSnapshots.map((snapshot) => ({
          progressPercentage: snapshot.progressPercentage,
        })),
      );
      const forecastResult =
        this.goalProgressCalculatorService.calculateForecast(
          currentProgress,
          trend,
          previousSnapshots.map((snapshot) => ({
            progressPercentage: snapshot.progressPercentage,
          })),
          {
            goalType: activeGoal.type,
            startValue: latestSnapshot?.currentValue,
            currentValue: latestSnapshot?.currentValue,
            targetValue: latestSnapshot?.targetValue,
            adherenceScore: latestSnapshot
              ? this.resolveFromSnapshotContext(
                  latestSnapshot.sourceContext,
                  'adherenceScore',
                )
              : undefined,
            recoveryScore: latestSnapshot
              ? this.resolveFromSnapshotContext(
                  latestSnapshot.sourceContext,
                  'recoveryScore',
                )
              : undefined,
            consistencyScore: latestSnapshot
              ? this.resolveFromSnapshotContext(
                  latestSnapshot.sourceContext,
                  'consistencyScore',
                )
              : undefined,
          },
        );

      const generatedAt = this.goalDateService.todayUtcDateString();
      const predictedCompletionDate = forecastResult.predictedCompletionDays
        ? this.goalDateService.addDaysToDateString(
            generatedAt,
            forecastResult.predictedCompletionDays,
          )
        : undefined;

      const goalForecast = await this.goalForecastRepository.upsertForecast({
        goalId: activeGoal.id,
        userProfileId: userProfile.id,
        predictedCompletionDate,
        confidence: forecastResult.confidence,
        estimatedDaysRemaining: forecastResult.predictedCompletionDays,
        generatedAt,
        formulaVersion: GOAL_PROGRESS_CALCULATOR_VERSION,
      });

      return {
        goalForecast,
      };
    } catch (error) {
      if (error instanceof BuildGoalForecastError) {
        throw error;
      }

      throw new BuildGoalForecastError(
        BUILD_GOAL_FORECAST_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveFromSnapshotContext(
    sourceContext: GoalSourceContext,
    key: 'adherenceScore' | 'recoveryScore' | 'consistencyScore',
  ): number | undefined {
    const value = sourceContext[key];

    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }
}
