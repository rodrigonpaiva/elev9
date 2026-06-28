import { Inject, Injectable } from '@nestjs/common';

import { ReplayComparator } from '../../../../../shared/replay';
import {
  USER_PROFILE_REPOSITORY,
  type UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  HabitConsistencyCalculatorService,
  type HabitConsistencyCalculationInput,
} from '../../services/habit-consistency-calculator.service';
import {
  HABIT_SNAPSHOT_REPOSITORY,
  type HabitSnapshotRepository,
} from '../../../domain/repositories/habit-snapshot.repository';
import type { HabitSourceContext } from '../../../domain/habits.types';
import {
  REPLAY_HABIT_SNAPSHOT_ERROR_CODES,
  ReplayHabitSnapshotError,
} from './replay-habit-snapshot.errors';
import type { ReplayHabitSnapshotInput } from './replay-habit-snapshot.input';
import type {
  ReplayHabitSnapshotComparisonField,
  ReplayHabitSnapshotOutput,
  ReplayHabitSnapshotRecalculated,
} from './replay-habit-snapshot.output';

const COMPARISON_FIELDS: readonly ReplayHabitSnapshotComparisonField[] = [
  'consistencyScore',
  'streakDays',
  'adherenceScore',
  'trend',
  'formulaVersion',
] as const;

@Injectable()
export class ReplayHabitSnapshotUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(HABIT_SNAPSHOT_REPOSITORY)
    private readonly habitSnapshotRepository: HabitSnapshotRepository,
    private readonly habitConsistencyCalculatorService: HabitConsistencyCalculatorService,
  ) {}

  async execute(
    input: ReplayHabitSnapshotInput,
  ): Promise<ReplayHabitSnapshotOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const habitSnapshotId =
      typeof input.habitSnapshotId === 'string'
        ? input.habitSnapshotId.trim()
        : '';

    if (!authUserId) {
      throw new ReplayHabitSnapshotError(
        REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    if (!habitSnapshotId) {
      throw new ReplayHabitSnapshotError(
        REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INVALID_INPUT,
        'Invalid habit snapshot id.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new ReplayHabitSnapshotError(
          REPLAY_HABIT_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const persisted =
        await this.habitSnapshotRepository.findById(habitSnapshotId);

      if (!persisted || persisted.userProfileId !== userProfile.id) {
        throw new ReplayHabitSnapshotError(
          REPLAY_HABIT_SNAPSHOT_ERROR_CODES.HABIT_SNAPSHOT_NOT_FOUND,
          'Habit snapshot not found.',
        );
      }

      const recalculated = this.recalculate({
        userProfileId: persisted.userProfileId,
        sourceContext: persisted.sourceContext,
      });
      const comparison = ReplayComparator.compare({
        persisted: persisted.toJSON(),
        recalculated,
        fields: COMPARISON_FIELDS,
      });

      return {
        persisted,
        recalculated,
        comparison,
        replayedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ReplayHabitSnapshotError) {
        throw error;
      }

      throw new ReplayHabitSnapshotError(
        REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private recalculate(input: {
    userProfileId: string;
    sourceContext: HabitSourceContext;
  }): ReplayHabitSnapshotRecalculated {
    const sourceContext = input.sourceContext;
    const result = this.habitConsistencyCalculatorService.calculate(
      this.mapSourceContextToCalculatorInput({
        userProfileId: input.userProfileId,
        sourceContext,
      }),
    );

    return {
      consistencyScore: result.consistencyScore,
      streakDays: result.streakDays,
      adherenceScore: result.adherenceRate,
      trend: result.trend,
      formulaVersion: result.formulaVersion,
    };
  }

  private mapSourceContextToCalculatorInput(input: {
    userProfileId: string;
    sourceContext: HabitSourceContext;
  }): HabitConsistencyCalculationInput {
    return {
      userProfileId: input.userProfileId,
      generatedAt: this.resolveGeneratedAt(input.sourceContext.generatedAt),
      workoutCompletionRate: input.sourceContext.workoutCompletionRate,
      checkInCompletionRate: input.sourceContext.checkInCompletionRate,
      recoveryAdherence: input.sourceContext.recoveryAdherence,
      goalProgressScore: input.sourceContext.goalProgressScore,
      notificationEngagementScore:
        input.sourceContext.notificationEngagementScore,
      consecutiveSuccessfulDays: input.sourceContext.consecutiveSuccessfulDays,
      longestStreak: input.sourceContext.longestStreak,
      inactivityDays: input.sourceContext.inactivityDays,
      previousScore: input.sourceContext.previousScore,
    };
  }

  private resolveGeneratedAt(value: unknown): string {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : new Date(0).toISOString();
  }
}
