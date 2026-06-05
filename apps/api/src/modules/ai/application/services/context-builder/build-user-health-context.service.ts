import { Inject, Injectable } from '@nestjs/common';

import {
  ActivityLevel,
  FitnessGoal,
  FitnessProfileLimitation,
} from '../../../../fitness/domain/entities/fitness-profile.entity';
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  CLOCK,
  Clock,
} from '../../../../progress/domain/services/clock.service';
import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionProfileRepository,
} from '../../../../nutrition/domain/repositories/nutrition-profile.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import { GetCurrentAdaptiveTrainingUseCase } from '../../../../training/application/use-cases/get-current-adaptive-training/get-current-adaptive-training.use-case';
import type { AdaptiveTrainingInfluenceProps } from '../../../../training/domain/value-objects/adaptive-training-influence.value-object';
import type {
  AdaptiveRecommendedIntensity,
  AdaptiveRecommendationType,
  AdaptiveVolumeAction,
} from '../../../../training/domain/value-objects/adaptive-recommendation-type.value-object';
import { BuildRecoverySnapshotUseCase } from '../../../../recovery/application/use-cases/build-recovery-snapshot/build-recovery-snapshot.use-case';
import { calculateStreak } from '../../../../progress/application/use-cases/get-progress-summary/calculate-streak';
import {
  TrainingPlanDay,
  TrainingPlanIntensity,
} from '../../../../training/domain/entities/training-plan.entity';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  RecoveryInfluence,
  RecoverySnapshot,
} from '../../../../recovery/domain/entities/recovery-snapshot.entity';

export type UserHealthContextTodayWorkout = {
  dayIndex: number;
  title: string;
  focus: string;
  format: string;
  intensity: TrainingPlanIntensity;
  exercises: TrainingPlanDay['exercises'];
};

export type FatigueLevel = 'LOW' | 'MODERATE' | 'HIGH';

export type UserHealthContextNutritionProfile = {
  goal: 'fat_loss' | 'maintenance' | 'muscle_gain';
  mealsPerDay: number;
  dietaryRestrictions: string[];
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
};

export type UserHealthContextRecoverySnapshot = {
  date: string;
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: RecoverySnapshot['recoveryTrend'];
  recommendedIntensity: RecoverySnapshot['recommendedIntensity'];
  influences: RecoveryInfluence[];
  formulaVersion: string;
  createdAt: Date;
};

export type UserHealthContextAdaptiveTrainingRecommendation = {
  recommendationType: AdaptiveRecommendationType;
  recommendedIntensity: AdaptiveRecommendedIntensity;
  volumeAction: AdaptiveVolumeAction;
  reasoning: string;
  influences: AdaptiveTrainingInfluenceProps[];
};

export type UserHealthContext = {
  authUserId: string;
  userProfileId?: string;
  userName?: string;
  goal?: FitnessGoal;
  activityLevel?: ActivityLevel;
  weeklyFrequency?: number;
  adherenceScore: number;
  currentStreak: number;
  averageWorkoutDuration: number;
  fatigueLevel: FatigueLevel;
  availableEquipment: string[];
  limitations: FitnessProfileLimitation[];
  todayWorkout: UserHealthContextTodayWorkout | null;
  activeTrainingPlanId?: string;
  latestCheckIn?: {
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
    createdAt: Date;
  };
  recoverySnapshot?: UserHealthContextRecoverySnapshot;
  adaptiveTrainingRecommendation?: UserHealthContextAdaptiveTrainingRecommendation;
  adaptiveRecommendationType?: AdaptiveRecommendationType;
  adaptiveRecommendedIntensity?: AdaptiveRecommendedIntensity;
  adaptiveVolumeAction?: AdaptiveVolumeAction;
  adaptiveTrainingInfluences?: AdaptiveTrainingInfluenceProps[];
  adaptiveTrainingReasoning?: string;
  readinessScore?: number;
  fatigueScore?: number;
  recoveryInfluences?: RecoveryInfluence[];
  recoveryTrend?: 'improving' | 'stable' | 'needs_recovery';
  recommendedIntensity?: RecoverySnapshot['recommendedIntensity'];
  nutritionProfile?: UserHealthContextNutritionProfile;
  recentWorkoutLogs: WorkoutLog[];
  generatedAt: Date;
};

@Injectable()
export class BuildUserHealthContextService {
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
    @Inject(NUTRITION_PROFILE_REPOSITORY)
    private readonly nutritionProfileRepository: NutritionProfileRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    private readonly getCurrentAdaptiveTrainingUseCase: GetCurrentAdaptiveTrainingUseCase,
    private readonly buildRecoverySnapshotUseCase: BuildRecoverySnapshotUseCase,
    @Inject(CLOCK)
    private readonly clock: Clock,
    private readonly platformDateService: PlatformDateService = new PlatformDateService(),
  ) {}

  async build(input: { authUserId: string }): Promise<UserHealthContext> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const generatedAt = this.clock.now();
    const baseContext = this.createBaseContext(authUserId, generatedAt);

    if (!authUserId) {
      return baseContext;
    }

    const userProfile =
      await this.userProfileRepository.findByAuthUserId(authUserId);

    if (!userProfile) {
      return baseContext;
    }

    const latestCheckIn =
      await this.dailyCheckInRepository.findLatestByUserProfileId(
        userProfile.id,
      );
    const fitnessProfile =
      await this.fitnessProfileRepository.findActiveByUserProfileId(
        userProfile.id,
      );
    const nutritionProfile =
      await this.nutritionProfileRepository.findActiveByUserProfileId(
        userProfile.id,
      );
    const adaptiveTrainingRecommendation =
      await this.resolveAdaptiveTrainingRecommendation({
        authUserId,
      });
    const recoverySnapshot =
      await this.resolveRecoverySnapshot({
        authUserId,
        userProfileId: userProfile.id,
        fitnessProfileId: fitnessProfile?.id,
      });

    const contextWithoutTrainingPlan: UserHealthContext = {
      ...baseContext,
      userProfileId: userProfile.id,
      userName: userProfile.name,
      goal: fitnessProfile?.goal,
      activityLevel: fitnessProfile?.activityLevel,
      weeklyFrequency: fitnessProfile
        ? this.resolveWeeklyFrequency({
            activityLevel: fitnessProfile.activityLevel,
            daysPerWeek: fitnessProfile.trainingAvailability?.daysPerWeek,
          })
        : undefined,
      limitations: fitnessProfile?.limitations ?? [],
      latestCheckIn: latestCheckIn
        ? {
            energyLevel: latestCheckIn.energyLevel,
            sleepQuality: latestCheckIn.sleepQuality,
            muscleSoreness: latestCheckIn.muscleSoreness,
            motivationLevel: latestCheckIn.motivationLevel,
            createdAt: latestCheckIn.createdAt,
        }
        : undefined,
      recoverySnapshot: recoverySnapshot
        ? this.mapRecoverySnapshot(recoverySnapshot)
        : undefined,
      ...(adaptiveTrainingRecommendation
        ? {
            adaptiveTrainingRecommendation,
            adaptiveRecommendationType:
              adaptiveTrainingRecommendation.recommendationType,
            adaptiveRecommendedIntensity:
              adaptiveTrainingRecommendation.recommendedIntensity,
            adaptiveVolumeAction: adaptiveTrainingRecommendation.volumeAction,
            adaptiveTrainingInfluences:
              adaptiveTrainingRecommendation.influences,
            adaptiveTrainingReasoning:
              adaptiveTrainingRecommendation.reasoning,
          }
        : {}),
      readinessScore: recoverySnapshot?.readinessScore,
      fatigueScore: recoverySnapshot?.fatigueScore,
      recoveryInfluences: recoverySnapshot?.influences ?? [],
      recoveryTrend: recoverySnapshot
        ? this.mapRecoveryTrend(recoverySnapshot.recoveryTrend)
        : undefined,
      recommendedIntensity: recoverySnapshot?.recommendedIntensity,
      nutritionProfile: nutritionProfile
        ? {
            goal: nutritionProfile.goal,
            mealsPerDay: nutritionProfile.mealsPerDay,
            dietaryRestrictions: nutritionProfile.dietaryRestrictions ?? [],
            allergies: nutritionProfile.allergies ?? [],
            dislikedFoods: nutritionProfile.dislikedFoods ?? [],
            preferredFoods: nutritionProfile.preferredFoods ?? [],
          }
        : undefined,
    };

    if (!fitnessProfile) {
      return contextWithoutTrainingPlan;
    }

    const trainingPlan =
      await this.trainingPlanRepository.findActiveByFitnessProfileId(
        fitnessProfile.id,
      );

    if (!trainingPlan) {
      return contextWithoutTrainingPlan;
    }

    const weeklyFrequency = contextWithoutTrainingPlan.weeklyFrequency;
    const { startDate, endDate } = this.getWeekUtcDateRange();
    const recentWorkoutLogs =
      await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
        trainingPlanIds: [trainingPlan.id],
        startDate,
        endDate,
      });

    const workoutsCompleted = recentWorkoutLogs.length;
    const averageWorkoutDuration =
      workoutsCompleted === 0
        ? 0
        : this.roundToTwoDecimals(
            recentWorkoutLogs.reduce(
              (total, workoutLog) => total + workoutLog.durationMinutes,
              0,
            ) / workoutsCompleted,
          );

    return {
      ...contextWithoutTrainingPlan,
      activeTrainingPlanId: trainingPlan.id,
      todayWorkout: this.getTodayWorkout(trainingPlan.weeklySchedule),
      recentWorkoutLogs,
      currentStreak:
        workoutsCompleted === 0 ? 0 : calculateStreak(recentWorkoutLogs),
      averageWorkoutDuration,
      adherenceScore: this.calculateAdherenceScore({
        workoutsCompleted,
        weeklyFrequency,
      }),
      fatigueLevel: recoverySnapshot
        ? this.mapFatigueLevel(recoverySnapshot.fatigueScore)
        : this.calculateFatigueLevel({
            currentStreak:
              workoutsCompleted === 0 ? 0 : calculateStreak(recentWorkoutLogs),
            weeklyFrequency,
            averageWorkoutDuration,
            recentLogsCount: recentWorkoutLogs.length,
            latestCheckIn: contextWithoutTrainingPlan.latestCheckIn,
          }),
    };
  }

  private createBaseContext(
    authUserId: string,
    generatedAt: Date,
  ): UserHealthContext {
    return {
      authUserId,
      adherenceScore: 0,
      currentStreak: 0,
      averageWorkoutDuration: 0,
      fatigueLevel: 'MODERATE',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt,
    };
  }

  private resolveWeeklyFrequency(input: {
    activityLevel: ActivityLevel;
    daysPerWeek?: number;
  }): number {
    if (
      typeof input.daysPerWeek === 'number' &&
      Number.isFinite(input.daysPerWeek) &&
      input.daysPerWeek > 0
    ) {
      return Math.round(input.daysPerWeek);
    }

    switch (input.activityLevel) {
      case 'low':
        return 2;
      case 'medium':
        return 3;
      case 'high':
      default:
        return 4;
    }
  }

  private calculateAdherenceScore(input: {
    workoutsCompleted: number;
    weeklyFrequency?: number;
  }): number {
    if (
      typeof input.weeklyFrequency !== 'number' ||
      input.weeklyFrequency <= 0 ||
      input.workoutsCompleted <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((input.workoutsCompleted / input.weeklyFrequency) * 100),
    );
  }

  private calculateFatigueLevel(input: {
    currentStreak: number;
    weeklyFrequency?: number;
    averageWorkoutDuration: number;
    recentLogsCount: number;
    latestCheckIn?: {
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
    };
  }): FatigueLevel {
    if (input.latestCheckIn) {
      if (
        input.latestCheckIn.energyLevel <= 2 ||
        input.latestCheckIn.sleepQuality <= 2 ||
        input.latestCheckIn.muscleSoreness >= 4
      ) {
        return 'HIGH';
      }

      if (
        input.latestCheckIn.energyLevel >= 4 &&
        input.latestCheckIn.sleepQuality >= 4 &&
        input.latestCheckIn.muscleSoreness <= 2 &&
        input.latestCheckIn.motivationLevel >= 4 &&
        input.currentStreak >= 1 &&
        input.currentStreak <= 4
      ) {
        return 'LOW';
      }

      return 'MODERATE';
    }

    if (input.recentLogsCount === 0 || input.weeklyFrequency === undefined) {
      return 'MODERATE';
    }

    if (
      input.currentStreak >= 6 ||
      input.averageWorkoutDuration >= 75 ||
      input.recentLogsCount > input.weeklyFrequency + 2
    ) {
      return 'HIGH';
    }

    if (
      input.currentStreak >= 1 &&
      input.currentStreak <= 3 &&
      input.averageWorkoutDuration <= 45 &&
      input.recentLogsCount <= input.weeklyFrequency
    ) {
      return 'LOW';
    }

    return 'MODERATE';
  }

  private mapFatigueLevel(fatigueScore: number): FatigueLevel {
    if (fatigueScore >= 70) {
      return 'HIGH';
    }

    if (fatigueScore >= 40) {
      return 'MODERATE';
    }

    return 'LOW';
  }

  private mapRecoveryTrend(
    recoveryTrend: RecoverySnapshot['recoveryTrend'],
  ): 'improving' | 'stable' | 'needs_recovery' {
    switch (recoveryTrend) {
      case 'declining':
        return 'needs_recovery';
      case 'improving':
      case 'stable':
      default:
        return recoveryTrend;
    }
  }

  private mapRecoverySnapshot(
    snapshot: RecoverySnapshot,
  ): UserHealthContextRecoverySnapshot {
    return {
      date: snapshot.date,
      readinessScore: snapshot.readinessScore,
      fatigueScore: snapshot.fatigueScore,
      recoveryTrend: snapshot.recoveryTrend,
      recommendedIntensity: snapshot.recommendedIntensity,
      influences: snapshot.influences,
      formulaVersion: snapshot.formulaVersion,
      createdAt: snapshot.createdAt,
    };
  }

  private async resolveRecoverySnapshot(input: {
    authUserId: string;
    userProfileId: string;
    fitnessProfileId?: string;
  }): Promise<RecoverySnapshot | null> {
    const existingSnapshot =
      await this.recoverySnapshotRepository.findLatestByUserProfileId(
        input.userProfileId,
      );

    if (existingSnapshot) {
      return existingSnapshot;
    }

    if (!input.fitnessProfileId) {
      return null;
    }

    try {
      const result = await this.buildRecoverySnapshotUseCase.execute({
        authUserId: input.authUserId,
      });

      return result.recoverySnapshot;
    } catch {
      return null;
    }
  }

  private async resolveAdaptiveTrainingRecommendation(input: {
    authUserId: string;
  }): Promise<UserHealthContextAdaptiveTrainingRecommendation | null> {
    try {
      const result = await this.getCurrentAdaptiveTrainingUseCase.execute({
        authUserId: input.authUserId,
      });

      return {
        recommendationType:
          result.adaptiveTrainingRecommendation.recommendationType,
        recommendedIntensity:
          result.adaptiveTrainingRecommendation.recommendedIntensity,
        volumeAction: result.adaptiveTrainingRecommendation.volumeAction,
        reasoning: result.adaptiveTrainingRecommendation.reasoning,
        influences: result.adaptiveTrainingRecommendation.influences.map(
          (influence) => influence.toJSON(),
        ),
      };
    } catch {
      return null;
    }
  }

  private getTodayWorkout(
    weeklySchedule: TrainingPlanDay[],
  ): UserHealthContextTodayWorkout | null {
    const todayIndex = this.getUtcDayIndex(this.clock.now());
    const matchingDay = weeklySchedule.find(
      (day) => day.dayIndex === todayIndex,
    );

    if (!matchingDay) {
      return null;
    }

    return {
      dayIndex: matchingDay.dayIndex,
      title: matchingDay.title,
      focus: matchingDay.focus,
      format: matchingDay.format,
      intensity: matchingDay.intensity,
      exercises: matchingDay.exercises,
    };
  }

  private getUtcDayIndex(date: Date): number {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
  }

  private getWeekUtcDateRange(): {
    startDate: string;
    endDate: string;
  } {
    const now = this.clock.now();
    const endDate = this.clock.todayUtcDateString();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    start.setUTCDate(start.getUTCDate() - 6);

    return {
      startDate: this.toUtcDateString(start),
      endDate,
    };
  }

  private toUtcDateString(date: Date): string {
    return this.platformDateService.getDateString(date);
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
