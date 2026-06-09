import { Inject, Injectable } from '@nestjs/common';

import {
  PERSONALIZATION_SNAPSHOT_REPOSITORY,
  PersonalizationSnapshotRepository,
} from '../../../domain/repositories/personalization-snapshot.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_PERSONALIZATION_HISTORY_ERROR_CODES,
  GetPersonalizationHistoryError,
} from './get-personalization-history.errors';
import type { GetPersonalizationHistoryInput } from './get-personalization-history.input';
import type { GetPersonalizationHistoryOutput } from './get-personalization-history.output';
import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
  normalizeLimit,
  resolveUserProfileOrThrow,
} from '../../services/personalization-read.errors';

const DEFAULT_LIMIT = 14;
const MAX_LIMIT = 90;

@Injectable()
export class GetPersonalizationHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(PERSONALIZATION_SNAPSHOT_REPOSITORY)
    private readonly personalizationSnapshotRepository: PersonalizationSnapshotRepository,
  ) {}

  async execute(
    input: GetPersonalizationHistoryInput,
  ): Promise<GetPersonalizationHistoryOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetPersonalizationHistoryError(code, message, details),
      });

      const limit = normalizeLimit(
        input.limit,
        DEFAULT_LIMIT,
        MAX_LIMIT,
        (code, message, details) =>
          new GetPersonalizationHistoryError(code, message, details),
      );

      const personalizationSnapshots =
        await this.personalizationSnapshotRepository.findManyByUserProfileId(
          userProfile.id,
          { limit },
        );

      return {
        personalizationSnapshots,
        limit,
      };
    } catch (error) {
      if (error instanceof PersonalizationReadError) {
        throw error;
      }

      throw new GetPersonalizationHistoryError(
        PERSONALIZATION_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
