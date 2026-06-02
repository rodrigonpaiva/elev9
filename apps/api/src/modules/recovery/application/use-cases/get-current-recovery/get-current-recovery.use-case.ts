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
  GET_CURRENT_RECOVERY_ERROR_CODES,
  GetCurrentRecoveryError,
} from './get-current-recovery.errors';
import { GetCurrentRecoveryInput } from './get-current-recovery.input';
import { GetCurrentRecoveryOutput } from './get-current-recovery.output';

@Injectable()
export class GetCurrentRecoveryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    private readonly buildRecoverySnapshotUseCase: BuildRecoverySnapshotUseCase,
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
        return {
          recoverySnapshot: latestSnapshot,
        };
      }

      return await this.buildRecoverySnapshotUseCase.execute({
        authUserId,
      });
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
}
