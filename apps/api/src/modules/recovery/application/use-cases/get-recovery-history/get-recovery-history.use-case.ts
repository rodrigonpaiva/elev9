import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../domain/repositories/recovery-snapshot.repository';
import {
  GET_RECOVERY_HISTORY_ERROR_CODES,
  GetRecoveryHistoryError,
} from './get-recovery-history.errors';
import { GetRecoveryHistoryInput } from './get-recovery-history.input';
import { GetRecoveryHistoryOutput } from './get-recovery-history.output';

const DEFAULT_LIMIT = 14;
const MAX_LIMIT = 90;

@Injectable()
export class GetRecoveryHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
  ) {}

  async execute(
    input: GetRecoveryHistoryInput,
  ): Promise<GetRecoveryHistoryOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetRecoveryHistoryError(
        GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const limit = this.resolveLimit(input.limit);
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetRecoveryHistoryError(
          GET_RECOVERY_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const recoverySnapshots =
        await this.recoverySnapshotRepository.findRecentByUserProfileId(
          userProfile.id,
          {
            limit,
          },
        );

      return {
        recoverySnapshots,
      };
    } catch (error) {
      if (error instanceof GetRecoveryHistoryError) {
        throw error;
      }

      throw new GetRecoveryHistoryError(
        GET_RECOVERY_HISTORY_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveLimit(limit?: number): number {
    if (limit === undefined) {
      return DEFAULT_LIMIT;
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new GetRecoveryHistoryError(
        GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_LIMIT,
        'Invalid recovery history limit.',
      );
    }

    return limit;
  }
}
