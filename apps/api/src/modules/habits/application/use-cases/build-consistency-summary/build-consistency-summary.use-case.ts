import { Inject, Injectable } from '@nestjs/common';

import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import {
  HABIT_SNAPSHOT_REPOSITORY,
  HabitSnapshotRepository,
} from '../../../domain/repositories/habit-snapshot.repository';
import {
  CONSISTENCY_SUMMARY_REPOSITORY,
  ConsistencySummaryRepository,
} from '../../../domain/repositories/consistency-summary.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { HabitConsistencyCalculatorService } from '../../services/habit-consistency-calculator.service';
import type { HabitSnapshot } from '../../../domain/entities/habit-snapshot.entity';
import {
  BUILD_CONSISTENCY_SUMMARY_ERROR_CODES,
  BuildConsistencySummaryError,
} from './build-consistency-summary.errors';
import type { BuildConsistencySummaryInput } from './build-consistency-summary.input';
import type { BuildConsistencySummaryOutput } from './build-consistency-summary.output';

const HISTORY_LIMIT = 30;
const DEFAULT_NEUTRAL_SCORE = 50;

@Injectable()
export class BuildConsistencySummaryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(HABIT_SNAPSHOT_REPOSITORY)
    private readonly habitSnapshotRepository: HabitSnapshotRepository,
    @Inject(CONSISTENCY_SUMMARY_REPOSITORY)
    private readonly consistencySummaryRepository: ConsistencySummaryRepository,
    private readonly habitConsistencyCalculatorService: HabitConsistencyCalculatorService,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(
    input: BuildConsistencySummaryInput,
  ): Promise<BuildConsistencySummaryOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildConsistencySummaryError(
        BUILD_CONSISTENCY_SUMMARY_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildConsistencySummaryError(
          BUILD_CONSISTENCY_SUMMARY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const habitSnapshots =
        await this.habitSnapshotRepository.findManyByUserProfileId(
          userProfile.id,
          {
            limit: HISTORY_LIMIT,
          },
        );

      const latestSnapshot = habitSnapshots[0] ?? null;
      const previousSnapshot =
        habitSnapshots.find(
          (snapshot) => snapshot.date !== latestSnapshot?.date,
        ) ?? null;

      const snapshotSourceContext = latestSnapshot?.sourceContext ?? {};
      const todayDate = this.platformDateService.getTodayDateString();
      const generatedAt = new Date().toISOString();
      const result = this.habitConsistencyCalculatorService.calculate({
        userProfileId: userProfile.id,
        generatedAt,
        workoutCompletionRate:
          snapshotSourceContext.workoutCompletionRate ?? DEFAULT_NEUTRAL_SCORE,
        checkInCompletionRate:
          snapshotSourceContext.checkInCompletionRate ?? DEFAULT_NEUTRAL_SCORE,
        recoveryAdherence:
          snapshotSourceContext.recoveryAdherence ?? DEFAULT_NEUTRAL_SCORE,
        goalProgressScore:
          snapshotSourceContext.goalProgressScore ?? DEFAULT_NEUTRAL_SCORE,
        notificationEngagementScore:
          snapshotSourceContext.notificationEngagementScore ??
          DEFAULT_NEUTRAL_SCORE,
        consecutiveSuccessfulDays: latestSnapshot?.streakDays ?? 0,
        longestStreak: this.resolveLongestStreak(habitSnapshots),
        inactivityDays: latestSnapshot
          ? this.resolveInactivityDays(todayDate, latestSnapshot.date)
          : 0,
        previousScore: previousSnapshot?.consistencyScore,
      });

      const persistedSummary =
        await this.consistencySummaryRepository.upsertSummary({
          userProfileId: userProfile.id,
          score: result.summary.score,
          trend: result.summary.trend,
          currentStreak: result.summary.currentStreak,
          longestStreak: result.summary.longestStreak,
          adherenceRate: result.summary.adherenceRate,
          riskLevel: result.summary.riskLevel,
          formulaVersion: result.summary.formulaVersion,
        });

      return {
        consistencySummary: persistedSummary,
      };
    } catch (error) {
      if (error instanceof BuildConsistencySummaryError) {
        throw error;
      }

      throw new BuildConsistencySummaryError(
        BUILD_CONSISTENCY_SUMMARY_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveLongestStreak(snapshots: HabitSnapshot[]): number {
    if (snapshots.length === 0) {
      return 0;
    }

    return snapshots.reduce(
      (longest, snapshot) => Math.max(longest, snapshot.streakDays),
      0,
    );
  }

  private resolveInactivityDays(todayDate: string, lastDate: string): number {
    const today = new Date(`${todayDate}T00:00:00.000Z`);
    const date = new Date(`${lastDate}T00:00:00.000Z`);

    return Math.max(
      0,
      Math.floor((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)),
    );
  }
}
