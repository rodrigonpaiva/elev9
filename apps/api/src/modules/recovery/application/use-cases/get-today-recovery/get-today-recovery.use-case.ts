import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { BuildRecoverySnapshotUseCase } from '../build-recovery-snapshot/build-recovery-snapshot.use-case';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../domain/repositories/recovery-snapshot.repository';
import {
  GET_TODAY_RECOVERY_ERROR_CODES,
  GetTodayRecoveryError,
} from './get-today-recovery.errors';
import { GetTodayRecoveryInput } from './get-today-recovery.input';
import { GetTodayRecoveryOutput } from './get-today-recovery.output';
import { RecoveryDateService } from '../../services/recovery-date.service';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import {
  isRecoverySnapshotStaleForCheckIn,
  isRecoverySnapshotStaleForWorkout,
} from '../../services/recovery-freshness';
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';

@Injectable()
export class GetTodayRecoveryUseCase {
  private readonly logger = new Logger(GetTodayRecoveryUseCase.name);

  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    private readonly buildRecoverySnapshotUseCase: BuildRecoverySnapshotUseCase,
    private readonly recoveryDateService: RecoveryDateService,
    @Optional()
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository?: DailyCheckInRepository,
    @Optional()
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository?: FitnessProfileRepository,
    @Optional()
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository?: TrainingPlanRepository,
    @Optional()
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository?: WorkoutLogRepository,
  ) {}

  async execute(input: GetTodayRecoveryInput): Promise<GetTodayRecoveryOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetTodayRecoveryError(
        GET_TODAY_RECOVERY_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetTodayRecoveryError(
          GET_TODAY_RECOVERY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.recoveryDateService.getDateString(
        new Date(),
        String(userProfile.timezone || 'UTC'),
      );
      const existingSnapshot =
        await this.recoverySnapshotRepository.findByUserProfileIdAndDate(
          userProfile.id,
          todayDate,
        );

      if (existingSnapshot) {
        const todayCheckIn = this.dailyCheckInRepository
          ? await this.dailyCheckInRepository.findByUserProfileIdAndLocalDate({
              userProfileId: userProfile.id,
              localDate: todayDate,
            })
          : null;

        const latestWorkout = await this.findLatestWorkout(userProfile.id);
        if (
          !isRecoverySnapshotStaleForCheckIn(existingSnapshot, todayCheckIn) &&
          !isRecoverySnapshotStaleForWorkout(existingSnapshot, latestWorkout)
        ) {
          return { recoverySnapshot: existingSnapshot };
        }

        this.logger.log({
          event: 'recovery_stale_snapshot_rejected',
          operation: 'recovery.today',
          result: 'rebuild_required',
        });
      }

      return await this.buildRecoverySnapshotUseCase.execute({
        authUserId,
        date: todayDate,
      });
    } catch (error) {
      if (error instanceof GetTodayRecoveryError) {
        throw error;
      }

      throw new GetTodayRecoveryError(
        GET_TODAY_RECOVERY_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private async findLatestWorkout(userProfileId: string) {
    if (
      !this.fitnessProfileRepository ||
      !this.trainingPlanRepository ||
      !this.workoutLogRepository
    ) {
      return null;
    }
    const fitness =
      await this.fitnessProfileRepository.findActiveByUserProfileId(
        userProfileId,
      );
    if (!fitness) return null;
    const plan = await this.trainingPlanRepository.findActiveByFitnessProfileId(
      fitness.id,
    );
    if (!plan) return null;
    const workouts =
      await this.workoutLogRepository.findByTrainingPlanIdsOrdered({
        trainingPlanIds: [plan.id],
        limit: 1,
      });
    return workouts[0] ?? null;
  }
}
