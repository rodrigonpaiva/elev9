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
  GET_CURRENT_RECOVERY_ERROR_CODES,
  GetCurrentRecoveryError,
} from './get-current-recovery.errors';
import { GetCurrentRecoveryInput } from './get-current-recovery.input';
import { GetCurrentRecoveryOutput } from './get-current-recovery.output';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import { RecoveryDateService } from '../../services/recovery-date.service';
import { isRecoverySnapshotStaleForCheckIn } from '../../services/recovery-freshness';
import { isRecoverySnapshotStaleForWorkout } from '../../services/recovery-freshness';
import { RecoveryObservabilityService } from '../../services/recovery-observability.service';
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
export class GetCurrentRecoveryUseCase {
  private readonly logger = new Logger(GetCurrentRecoveryUseCase.name);

  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    private readonly buildRecoverySnapshotUseCase: BuildRecoverySnapshotUseCase,
    @Optional()
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository?: DailyCheckInRepository,
    private readonly recoveryDateService: RecoveryDateService = new RecoveryDateService(),
    @Optional()
    private readonly observability?: RecoveryObservabilityService,
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

  async execute(
    input: GetCurrentRecoveryInput,
  ): Promise<GetCurrentRecoveryOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCurrentRecoveryError(
        GET_CURRENT_RECOVERY_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCurrentRecoveryError(
          GET_CURRENT_RECOVERY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const latestSnapshot =
        await this.recoverySnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (latestSnapshot) {
        const todayDate = this.recoveryDateService.getDateString(
          new Date(),
          String(userProfile.timezone || 'UTC'),
        );
        const todayCheckIn = this.dailyCheckInRepository
          ? await this.dailyCheckInRepository.findByUserProfileIdAndLocalDate({
              userProfileId: userProfile.id,
              localDate: todayDate,
            })
          : null;

        const latestWorkout = await this.findLatestWorkout(userProfile.id);
        if (
          !isRecoverySnapshotStaleForCheckIn(latestSnapshot, todayCheckIn) &&
          !isRecoverySnapshotStaleForWorkout(latestSnapshot, latestWorkout)
        ) {
          return { recoverySnapshot: latestSnapshot };
        }

        this.logger.log({
          event: 'recovery_stale_snapshot_rejected',
          operation: 'recovery.current',
          result: 'rebuild_required',
        });
      }

      return await this.rebuild(authUserId);
    } catch (error) {
      if (error instanceof GetCurrentRecoveryError) {
        throw error;
      }

      throw new GetCurrentRecoveryError(
        GET_CURRENT_RECOVERY_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private async rebuild(authUserId: string): Promise<GetCurrentRecoveryOutput> {
    this.observability?.recordRebuild('attempt');
    try {
      const result = await this.buildRecoverySnapshotUseCase.execute({
        authUserId,
      });
      this.observability?.recordRebuild('success');
      return result;
    } catch (error) {
      this.observability?.recordRebuild('failure');
      throw error;
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
