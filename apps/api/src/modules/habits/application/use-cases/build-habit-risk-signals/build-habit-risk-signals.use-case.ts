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
  HABIT_RISK_SIGNAL_REPOSITORY,
  HabitRiskSignalRepository,
} from '../../../domain/repositories/habit-risk-signal.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { HabitConsistencyCalculatorService } from '../../services/habit-consistency-calculator.service';
import { HabitRiskSignal } from '../../../domain/entities/habit-risk-signal.entity';
import { HabitRiskLevelValueObject } from '../../../domain/value-objects/habit-risk-level.value-object';
import {
  BUILD_HABIT_RISK_SIGNALS_ERROR_CODES,
  BuildHabitRiskSignalsError,
} from './build-habit-risk-signals.errors';
import type { BuildHabitRiskSignalsInput } from './build-habit-risk-signals.input';
import type { BuildHabitRiskSignalsOutput } from './build-habit-risk-signals.output';

const HISTORY_LIMIT = 30;

@Injectable()
export class BuildHabitRiskSignalsUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(HABIT_SNAPSHOT_REPOSITORY)
    private readonly habitSnapshotRepository: HabitSnapshotRepository,
    @Inject(CONSISTENCY_SUMMARY_REPOSITORY)
    private readonly consistencySummaryRepository: ConsistencySummaryRepository,
    @Inject(HABIT_RISK_SIGNAL_REPOSITORY)
    private readonly habitRiskSignalRepository: HabitRiskSignalRepository,
    private readonly habitConsistencyCalculatorService: HabitConsistencyCalculatorService,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(
    input: BuildHabitRiskSignalsInput,
  ): Promise<BuildHabitRiskSignalsOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildHabitRiskSignalsError(
        BUILD_HABIT_RISK_SIGNALS_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildHabitRiskSignalsError(
          BUILD_HABIT_RISK_SIGNALS_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const habitSnapshots = await this.habitSnapshotRepository.findManyByUserProfileId(
        userProfile.id,
        {
          limit: HISTORY_LIMIT,
        },
      );
      const latestSnapshot = habitSnapshots[0] ?? null;
      const consistencySummary =
        (await this.consistencySummaryRepository.findByUserProfileId(
          userProfile.id,
        )) ?? null;

      await this.habitRiskSignalRepository.deleteByUserProfileId(userProfile.id);

      if (!latestSnapshot && !consistencySummary) {
        return { habitRiskSignals: [] };
      }

      const derivedSummary = this.resolveSummaryFromSnapshot(
        latestSnapshot,
        habitSnapshots,
      );
      const summary = consistencySummary
        ? {
            score: consistencySummary.score,
            trend: consistencySummary.trend.value,
            currentStreak: consistencySummary.currentStreak,
            longestStreak: consistencySummary.longestStreak,
          }
        : derivedSummary;
      const inactivityDays = latestSnapshot
        ? this.resolveInactivityDays(
            this.platformDateService.getTodayDateString(),
            latestSnapshot.date,
          )
        : 0;

      const riskSignals = this.habitConsistencyCalculatorService.buildRiskSignals(
        {
          userProfileId: userProfile.id,
          generatedAt: new Date().toISOString(),
          consistencyScore: summary.score,
          trend: summary.trend,
          streakDays: summary.currentStreak,
          inactivityDays,
        },
      );

      if (riskSignals.length === 0) {
        return { habitRiskSignals: [] };
      }

      const persistedSignals = await this.habitRiskSignalRepository.createMany(
        riskSignals.map(
          (signal) =>
            new HabitRiskSignal({
              userProfileId: signal.userProfileId,
              type: signal.type,
              level: new HabitRiskLevelValueObject(signal.level),
              title: signal.title,
              description: signal.description,
              generatedAt: new Date(signal.generatedAt),
              formulaVersion: signal.formulaVersion,
            }),
        ),
      );

      return {
        habitRiskSignals: persistedSignals,
      };
    } catch (error) {
      if (error instanceof BuildHabitRiskSignalsError) {
        throw error;
      }

      throw new BuildHabitRiskSignalsError(
        BUILD_HABIT_RISK_SIGNALS_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveSummaryFromSnapshot(
    latestSnapshot:
      | {
          consistencyScore: number;
          streakDays: number;
          trend: { value: 'improving' | 'stable' | 'declining' };
          sourceContext?: {
            previousScore?: number;
          };
          date: string;
        }
      | null,
    snapshots: Array<{
      streakDays: number;
    }>,
  ): {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    currentStreak: number;
    longestStreak: number;
  } {
    if (!latestSnapshot) {
      return {
        score: 50,
        trend: 'stable',
        currentStreak: 0,
        longestStreak: this.resolveLongestStreak(snapshots),
      };
    }

    return {
      score: latestSnapshot.consistencyScore,
      trend: latestSnapshot.trend.value,
      currentStreak: latestSnapshot.streakDays,
      longestStreak: this.resolveLongestStreak(snapshots),
    };
  }

  private resolveLongestStreak(
    snapshots: Array<{
      streakDays: number;
    }>,
  ): number {
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
