import { Inject, Injectable } from '@nestjs/common';

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import { calculateStreak } from '../../../../progress/application/use-cases/get-progress-summary/calculate-streak';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../domain/repositories/recovery-snapshot.repository';
import {
  RECOVERY_SCORE_CALCULATOR_VERSION,
  RecoveryScoreCalculatorInput,
  RecoveryScoreCalculatorService,
} from '../../services/recovery-score-calculator.service';
import { RecoveryDateService } from '../../services/recovery-date.service';
import {
  BUILD_RECOVERY_SNAPSHOT_ERROR_CODES,
  BuildRecoverySnapshotError,
} from './build-recovery-snapshot.errors';
import { BuildRecoverySnapshotInput } from './build-recovery-snapshot.input';
import { BuildRecoverySnapshotOutput } from './build-recovery-snapshot.output';

const RECENT_WINDOW_DAYS = 7;
const RECENT_READINESS_SNAPSHOT_LIMIT = 6;
const FIVE_SCALE_NEUTRAL_VALUE = 3;
const SCORE_NEUTRAL_VALUE = 50;

@Injectable()
export class BuildRecoverySnapshotUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    private readonly recoveryScoreCalculatorService: RecoveryScoreCalculatorService,
    private readonly recoveryDateService: RecoveryDateService,
  ) {}

  async execute(
    input: BuildRecoverySnapshotInput,
  ): Promise<BuildRecoverySnapshotOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildRecoverySnapshotError(
        BUILD_RECOVERY_SNAPSHOT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildRecoverySnapshotError(
          BUILD_RECOVERY_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.resolveDateString(input.date);
      const recentWindow = this.getRecentWindowDateRange(todayDate);

      const dailyCheckIns =
        await this.dailyCheckInRepository.findManyByUserProfileId(
          userProfile.id,
        );
      const recentCheckIns = dailyCheckIns.filter((checkIn) =>
        this.isDateInRange(
          this.toDateString(checkIn.createdAt),
          recentWindow.startDate,
          recentWindow.endDate,
        ),
      );
      const latestCheckIn =
        this.pickLatestCheckInForDate(dailyCheckIns, todayDate) ??
        dailyCheckIns[0] ??
        null;

      const resolvedSleepQuality = latestCheckIn?.sleepQuality ?? 3;
      const resolvedEnergyLevel = latestCheckIn?.energyLevel ?? 3;
      const resolvedMuscleSoreness = latestCheckIn?.muscleSoreness ?? 3;

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      let trainingPlanId: string | undefined;
      let activeTrainingPlanDays = 0;
      if (fitnessProfile) {
        const activeTrainingPlan =
          await this.trainingPlanRepository.findActiveByFitnessProfileId(
            fitnessProfile.id,
          );

        if (activeTrainingPlan) {
          trainingPlanId = activeTrainingPlan.id;
          activeTrainingPlanDays = activeTrainingPlan.weeklySchedule.length;
        }
      }

      const trainingPlanIds = trainingPlanId ? [trainingPlanId] : [];
      const recentWorkoutLogs = trainingPlanIds.length
        ? await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
            trainingPlanIds,
            startDate: recentWindow.startDate,
            endDate: recentWindow.endDate,
          })
        : [];
      const streakWorkoutLogs = trainingPlanIds.length
        ? await this.workoutLogRepository.findByTrainingPlanIdsOrdered({
            trainingPlanIds,
            limit: 30,
          })
        : [];
      const recentWorkoutLogsCount = recentWorkoutLogs.length;
      const currentStreak = calculateStreak(streakWorkoutLogs as WorkoutLog[]);
      const uniqueWorkoutDates = new Set(recentWorkoutLogs.map((log) => log.date))
        .size;
      const missedWorkouts =
        trainingPlanId && recentWorkoutLogsCount > 0
          ? Math.max(0, activeTrainingPlanDays - uniqueWorkoutDates)
          : 0;

      const adherenceScore = this.calculateAdherenceScore({
        activeTrainingPlanDays,
        recentWorkoutLogsCount,
        hasTrainingPlan: Boolean(trainingPlanId),
      });
      const recentWorkoutLoad = this.calculateRecentWorkoutLoad(
        recentWorkoutLogs,
      );

      const previousReadinessScores =
        await this.getPreviousReadinessScores(userProfile.id, todayDate);

      const calculatorInput: RecoveryScoreCalculatorInput = {
        sleepQuality: latestCheckIn ? latestCheckIn.sleepQuality : undefined,
        energyLevel: latestCheckIn ? latestCheckIn.energyLevel : undefined,
        muscleSoreness: latestCheckIn ? latestCheckIn.muscleSoreness : undefined,
        adherenceScore:
          trainingPlanId || recentWorkoutLogsCount > 0
            ? adherenceScore
            : undefined,
        recentWorkoutLoad:
          recentWorkoutLogsCount > 0 ? recentWorkoutLoad : undefined,
        currentStreak,
        missedWorkouts,
        previousReadinessScores,
      };

      const scoreResult =
        this.recoveryScoreCalculatorService.calculate(calculatorInput);

      const sourceContext = {
        sleepQuality: resolvedSleepQuality,
        energyLevel: resolvedEnergyLevel,
        muscleSoreness: resolvedMuscleSoreness,
        adherenceScore,
        recentWorkoutLoad,
        currentStreak,
        missedWorkouts,
        recentCheckInsCount: recentCheckIns.length,
        recentWorkoutLogsCount,
        trainingPlanId,
        formulaVersion: RECOVERY_SCORE_CALCULATOR_VERSION,
        generatedAt: new Date().toISOString(),
      };

      const recoverySnapshot =
        await this.recoverySnapshotRepository.upsertDailySnapshot({
          userProfileId: userProfile.id,
          date: todayDate,
          readinessScore: scoreResult.readinessScore,
          fatigueScore: scoreResult.fatigueScore,
          recoveryTrend: scoreResult.recoveryTrend,
          recommendedIntensity: scoreResult.recommendedIntensity,
          influences: scoreResult.influences.map((influence) =>
            influence.toJSON(),
          ),
          formulaVersion: RECOVERY_SCORE_CALCULATOR_VERSION,
          sourceContext,
          generatedBy: 'deterministic',
        });

      return {
        recoverySnapshot,
      };
    } catch (error) {
      if (error instanceof BuildRecoverySnapshotError) {
        throw error;
      }

      throw new BuildRecoverySnapshotError(
        BUILD_RECOVERY_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private calculateAdherenceScore(input: {
    hasTrainingPlan: boolean;
    activeTrainingPlanDays: number;
    recentWorkoutLogsCount: number;
  }): number {
    if (!input.hasTrainingPlan || input.activeTrainingPlanDays <= 0) {
      return SCORE_NEUTRAL_VALUE;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (input.recentWorkoutLogsCount / input.activeTrainingPlanDays) * 100,
        ),
      ),
    );
  }

  private calculateRecentWorkoutLoad(
    workoutLogs: WorkoutLog[],
  ): number {
    if (workoutLogs.length === 0) {
      return SCORE_NEUTRAL_VALUE;
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

  private async getPreviousReadinessScores(
    userProfileId: string,
    todayDate: string,
  ): Promise<number[]> {
    const snapshots =
      await this.recoverySnapshotRepository.findRecentByUserProfileId(
        userProfileId,
        {
          limit: RECENT_READINESS_SNAPSHOT_LIMIT,
        },
      );

    return snapshots
      .filter((snapshot) => snapshot.date !== todayDate)
      .map((snapshot) => snapshot.readinessScore)
      .slice(0, 5);
  }

  private pickLatestCheckInForDate(
    checkIns: Array<{
      sleepQuality: number;
      energyLevel: number;
      muscleSoreness: number;
      createdAt: Date;
    }>,
    dateString: string,
  ) {
    const todayCheckIns = checkIns.filter(
      (checkIn) => this.toDateString(checkIn.createdAt) === dateString,
    );

    if (todayCheckIns.length > 0) {
      return todayCheckIns.reduce((latest, current) =>
        current.createdAt > latest.createdAt ? current : latest,
      );
    }

    if (checkIns.length === 0) {
      return null;
    }

    return checkIns.slice(1).reduce(
      (latest, current) =>
        current.createdAt > latest.createdAt ? current : latest,
      checkIns[0],
    );
  }

  private resolveDateString(date?: string): string {
    const value = typeof date === 'string' ? date.trim() : '';

    return value || this.recoveryDateService.todayUtcDateString();
  }

  private getRecentWindowDateRange(todayDate: string): {
    startDate: string;
    endDate: string;
  } {
    const endDate = todayDate;
    const end = new Date(`${todayDate}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() - (RECENT_WINDOW_DAYS - 1));

    return {
      startDate: this.toDateString(end),
      endDate,
    };
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private isDateInRange(
    date: string,
    startDate: string,
    endDate: string,
  ): boolean {
    return date >= startDate && date <= endDate;
  }
}
