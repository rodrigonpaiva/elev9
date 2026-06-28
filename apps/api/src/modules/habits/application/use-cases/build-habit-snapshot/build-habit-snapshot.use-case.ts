import { Inject, Injectable } from '@nestjs/common';

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../../goals/domain/repositories/goal.repository';
import {
  GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
  GoalProgressSnapshotRepository,
} from '../../../../goals/domain/repositories/goal-progress-snapshot.repository';
import {
  NOTIFICATION_DECISION_REPOSITORY,
  NotificationDecisionRepository,
} from '../../../../notifications/domain/repositories/notification-decision.repository';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import { HabitConsistencyCalculatorService } from '../../services/habit-consistency-calculator.service';
import {
  HABIT_SNAPSHOT_REPOSITORY,
  HabitSnapshotRepository,
} from '../../../domain/repositories/habit-snapshot.repository';
import type { HabitSourceContext } from '../../../domain/habits.types';
import {
  BUILD_HABIT_SNAPSHOT_ERROR_CODES,
  BuildHabitSnapshotError,
} from './build-habit-snapshot.errors';
import { BuildHabitSnapshotInput } from './build-habit-snapshot.input';
import { BuildHabitSnapshotOutput } from './build-habit-snapshot.output';

const RECENT_WINDOW_DAYS = 7;
const DEFAULT_NEUTRAL_SCORE = 50;
const CALCULATOR_VERSION = 'habit-engine-v1';
const HISTORY_LOOKBACK_LIMIT = 30;

@Injectable()
export class BuildHabitSnapshotUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    @Inject(NOTIFICATION_DECISION_REPOSITORY)
    private readonly notificationDecisionRepository: NotificationDecisionRepository,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    @Inject(HABIT_SNAPSHOT_REPOSITORY)
    private readonly habitSnapshotRepository: HabitSnapshotRepository,
    private readonly habitConsistencyCalculatorService: HabitConsistencyCalculatorService,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(
    input: BuildHabitSnapshotInput,
  ): Promise<BuildHabitSnapshotOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildHabitSnapshotError(
        BUILD_HABIT_SNAPSHOT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildHabitSnapshotError(
          BUILD_HABIT_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.platformDateService.getTodayDateString();
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
      const recentCheckIns =
        await this.dailyCheckInRepository.findManyByUserProfileId(
          userProfile.id,
        );
      const recentCheckInsInWindow = recentCheckIns.filter((checkIn) =>
        this.isDateInRange(
          this.platformDateService.getDateString(checkIn.createdAt),
          recentWindow.startDate,
          recentWindow.endDate,
        ),
      );
      const recoverySnapshot =
        await this.recoverySnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const activeGoal = await this.goalRepository.findActiveByUserProfileId(
        userProfile.id,
      );
      const goalProgressSnapshot = activeGoal
        ? await this.goalProgressSnapshotRepository.findLatestByGoalId(
            activeGoal.id,
          )
        : null;
      const latestNotification =
        await this.notificationDecisionRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const engagementSummaryResult =
        await this.getEngagementSummaryUseCase.execute({
          authUserId,
        });

      const workoutCompletionRate = this.resolveWorkoutCompletionRate({
        recentWorkoutLogs,
        hasActiveTrainingPlan: Boolean(activeTrainingPlan),
        activeTrainingPlanDays: activeTrainingPlan?.weeklySchedule.length ?? 0,
      });
      const checkInCompletionRate = this.resolveCheckInCompletionRate(
        recentCheckInsInWindow.length,
      );
      const recoveryAdherence = this.resolveRecoveryAdherence(recoverySnapshot);
      const goalProgressScore = goalProgressSnapshot
        ? goalProgressSnapshot.progressPercentage
        : DEFAULT_NEUTRAL_SCORE;
      const notificationEngagementScore =
        engagementSummaryResult.engagementSummary.engagementScore;
      const consecutiveSuccessfulDays = this.calculateConsecutiveSuccessfulDays(
        {
          workoutDates: recentWorkoutLogs.map((log) => log.date),
          checkInDates: recentCheckInsInWindow.map((checkIn) =>
            this.platformDateService.getDateString(checkIn.createdAt),
          ),
          todayDate,
        },
      );
      const previousHabitSnapshot = await this.resolvePreviousHabitSnapshot(
        userProfile.id,
        todayDate,
      );
      const previousScore = previousHabitSnapshot?.consistencyScore;
      const currentSnapshots =
        await this.habitSnapshotRepository.findManyByUserProfileId(
          userProfile.id,
          { limit: HISTORY_LOOKBACK_LIMIT },
        );

      const calculatorResult = this.habitConsistencyCalculatorService.calculate(
        {
          userProfileId: userProfile.id,
          generatedAt: new Date().toISOString(),
          workoutCompletionRate,
          checkInCompletionRate,
          recoveryAdherence,
          goalProgressScore,
          notificationEngagementScore,
          consecutiveSuccessfulDays,
          longestStreak: this.resolveLongestStreak(currentSnapshots),
          inactivityDays: previousHabitSnapshot
            ? this.resolveInactivityDays(todayDate, previousHabitSnapshot.date)
            : 0,
          previousScore,
        },
      );

      const sourceContext: HabitSourceContext = {
        workoutCompletionRate,
        checkInCompletionRate,
        recoveryAdherence,
        goalProgressScore,
        notificationEngagementScore,
        recentWorkoutLogsCount: recentWorkoutLogs.length,
        recentCheckInsCount: recentCheckInsInWindow.length,
        latestRecoverySnapshotDate: recoverySnapshot?.date,
        latestGoalSnapshotDate: goalProgressSnapshot?.date,
        latestNotificationDate: latestNotification?.date,
        consecutiveSuccessfulDays,
        previousScore,
        formulaVersion: CALCULATOR_VERSION,
        generatedAt: new Date().toISOString(),
      };

      const persistedSnapshot =
        await this.habitSnapshotRepository.upsertDailySnapshot({
          userProfileId: userProfile.id,
          date: todayDate,
          consistencyScore: calculatorResult.consistencyScore,
          streakDays: calculatorResult.streakDays,
          adherenceScore: calculatorResult.adherenceRate,
          trend: calculatorResult.trend,
          sourceContext,
          formulaVersion: CALCULATOR_VERSION,
          generatedAt: new Date(sourceContext.generatedAt),
        });

      return {
        habitSnapshot: persistedSnapshot,
      };
    } catch (error) {
      if (error instanceof BuildHabitSnapshotError) {
        throw error;
      }

      throw new BuildHabitSnapshotError(
        BUILD_HABIT_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveWorkoutCompletionRate(input: {
    recentWorkoutLogs: Array<{ date: string }>;
    hasActiveTrainingPlan: boolean;
    activeTrainingPlanDays: number;
  }): number {
    if (!input.hasActiveTrainingPlan || input.activeTrainingPlanDays <= 0) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    if (input.recentWorkoutLogs.length === 0) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    const uniqueWorkoutDays = new Set(
      input.recentWorkoutLogs.map((log) => log.date),
    ).size;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round((uniqueWorkoutDays / input.activeTrainingPlanDays) * 100),
      ),
    );
  }

  private resolveCheckInCompletionRate(recentCheckInsCount: number): number {
    if (recentCheckInsCount === 0) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round((recentCheckInsCount / RECENT_WINDOW_DAYS) * 100),
      ),
    );
  }

  private resolveRecoveryAdherence(
    recoverySnapshot: { readinessScore: number; fatigueScore: number } | null,
  ): number {
    if (!recoverySnapshot) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (recoverySnapshot.readinessScore +
            (100 - recoverySnapshot.fatigueScore)) /
            2,
        ),
      ),
    );
  }

  private calculateConsecutiveSuccessfulDays(input: {
    workoutDates: string[];
    checkInDates: string[];
    todayDate: string;
  }): number {
    const activityDates = new Set([
      ...input.workoutDates,
      ...input.checkInDates,
    ]);

    let streak = 0;
    const cursor = new Date(`${input.todayDate}T00:00:00.000Z`);

    for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
      const cursorDateString = this.platformDateService.getDateString(cursor);

      if (!activityDates.has(cursorDateString)) {
        break;
      }

      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
  }

  private resolvePreviousHabitSnapshot(
    userProfileId: string,
    todayDate: string,
  ) {
    return this.habitSnapshotRepository
      .findManyByUserProfileId(userProfileId, { limit: HISTORY_LOOKBACK_LIMIT })
      .then(
        (snapshots) =>
          snapshots.find((snapshot) => snapshot.date !== todayDate) ?? null,
      );
  }

  private resolveLongestStreak(
    snapshots: Array<{ streakDays: number }>,
  ): number {
    if (snapshots.length === 0) {
      return 0;
    }

    return snapshots.reduce(
      (longest, snapshot) => Math.max(longest, snapshot.streakDays),
      0,
    );
  }

  private getRecentWindowDateRange(todayDate: string): {
    startDate: string;
    endDate: string;
  } {
    const end = new Date(`${todayDate}T00:00:00.000Z`);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (RECENT_WINDOW_DAYS - 1));

    return {
      startDate: this.platformDateService.getDateString(start),
      endDate: todayDate,
    };
  }

  private isDateInRange(
    date: string,
    startDate: string,
    endDate: string,
  ): boolean {
    return date >= startDate && date <= endDate;
  }

  private resolveInactivityDays(todayDate: string, lastDate: string): number {
    const today = new Date(`${todayDate}T00:00:00.000Z`);
    const date = new Date(`${lastDate}T00:00:00.000Z`);
    const diff = today.getTime() - date.getTime();

    return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
  }
}
