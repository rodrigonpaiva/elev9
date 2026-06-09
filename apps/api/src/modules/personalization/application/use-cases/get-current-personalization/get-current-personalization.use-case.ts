import { Inject, Injectable } from '@nestjs/common';

import { BuildPersonalizationSnapshotError } from '../build-personalization-snapshot/build-personalization-snapshot.errors';
import { BuildPersonalizationSnapshotUseCase } from '../build-personalization-snapshot/build-personalization-snapshot.use-case';
import {
  PERSONALIZATION_SNAPSHOT_REPOSITORY,
  PersonalizationSnapshotRepository,
} from '../../../domain/repositories/personalization-snapshot.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_CURRENT_PERSONALIZATION_ERROR_CODES,
  GetCurrentPersonalizationError,
} from './get-current-personalization.errors';
import type { GetCurrentPersonalizationInput } from './get-current-personalization.input';
import type { GetCurrentPersonalizationOutput } from './get-current-personalization.output';
import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
  resolveUserProfileOrThrow,
} from '../../services/personalization-read.errors';

@Injectable()
export class GetCurrentPersonalizationUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(PERSONALIZATION_SNAPSHOT_REPOSITORY)
    private readonly personalizationSnapshotRepository: PersonalizationSnapshotRepository,
    private readonly buildPersonalizationSnapshotUseCase: BuildPersonalizationSnapshotUseCase,
  ) {}

  async execute(
    input: GetCurrentPersonalizationInput,
  ): Promise<GetCurrentPersonalizationOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetCurrentPersonalizationError(code, message, details),
      });

      const latestSnapshot =
        await this.personalizationSnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (latestSnapshot) {
        return {
          personalizationSnapshot: latestSnapshot,
        };
      }

      return await this.buildPersonalizationSnapshotUseCase.execute({
        authUserId: input.authUserId,
      });
    } catch (error) {
      if (error instanceof PersonalizationReadError) {
        throw error;
      }

      if (error instanceof BuildPersonalizationSnapshotError) {
        throw new GetCurrentPersonalizationError(
          PERSONALIZATION_READ_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetCurrentPersonalizationError(
        GET_CURRENT_PERSONALIZATION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
