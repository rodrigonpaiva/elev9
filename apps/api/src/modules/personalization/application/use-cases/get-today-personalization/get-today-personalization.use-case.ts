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
import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import {
  GET_TODAY_PERSONALIZATION_ERROR_CODES,
  GetTodayPersonalizationError,
} from './get-today-personalization.errors';
import type { GetTodayPersonalizationInput } from './get-today-personalization.input';
import type { GetTodayPersonalizationOutput } from './get-today-personalization.output';
import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
  resolveUserProfileOrThrow,
} from '../../services/personalization-read.errors';

@Injectable()
export class GetTodayPersonalizationUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(PERSONALIZATION_SNAPSHOT_REPOSITORY)
    private readonly personalizationSnapshotRepository: PersonalizationSnapshotRepository,
    private readonly buildPersonalizationSnapshotUseCase: BuildPersonalizationSnapshotUseCase,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(
    input: GetTodayPersonalizationInput,
  ): Promise<GetTodayPersonalizationOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetTodayPersonalizationError(code, message, details),
      });

      const todayDate = this.platformDateService.getTodayDateString();
      const existingSnapshot =
        await this.personalizationSnapshotRepository.findByUserProfileIdAndDate(
          userProfile.id,
          todayDate,
        );

      if (existingSnapshot) {
        return {
          personalizationSnapshot: existingSnapshot,
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
        throw new GetTodayPersonalizationError(
          PERSONALIZATION_READ_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetTodayPersonalizationError(
        GET_TODAY_PERSONALIZATION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
