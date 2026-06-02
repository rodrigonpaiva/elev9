import { Inject, Injectable } from '@nestjs/common';

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

@Injectable()
export class GetTodayRecoveryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    private readonly buildRecoverySnapshotUseCase: BuildRecoverySnapshotUseCase,
    private readonly recoveryDateService: RecoveryDateService,
  ) {}

  async execute(
    input: GetTodayRecoveryInput,
  ): Promise<GetTodayRecoveryOutput> {
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

      const todayDate = this.recoveryDateService.todayUtcDateString();
      const existingSnapshot =
        await this.recoverySnapshotRepository.findByUserProfileIdAndDate(
          userProfile.id,
          todayDate,
        );

      if (existingSnapshot) {
        return {
          recoverySnapshot: existingSnapshot,
        };
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
}
