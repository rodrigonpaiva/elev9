import { Inject, Injectable } from '@nestjs/common';

import { BuildUserBehaviorProfileError } from '../build-user-behavior-profile/build-user-behavior-profile.errors';
import { BuildUserBehaviorProfileUseCase } from '../build-user-behavior-profile/build-user-behavior-profile.use-case';
import {
  USER_BEHAVIOR_PROFILE_REPOSITORY,
  UserBehaviorProfileRepository,
} from '../../../domain/repositories/user-behavior-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_USER_BEHAVIOR_PROFILE_ERROR_CODES,
  GetUserBehaviorProfileError,
} from './get-user-behavior-profile.errors';
import type { GetUserBehaviorProfileInput } from './get-user-behavior-profile.input';
import type { GetUserBehaviorProfileOutput } from './get-user-behavior-profile.output';
import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
  resolveUserProfileOrThrow,
} from '../../services/personalization-read.errors';

@Injectable()
export class GetUserBehaviorProfileUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(USER_BEHAVIOR_PROFILE_REPOSITORY)
    private readonly userBehaviorProfileRepository: UserBehaviorProfileRepository,
    private readonly buildUserBehaviorProfileUseCase: BuildUserBehaviorProfileUseCase,
  ) {}

  async execute(
    input: GetUserBehaviorProfileInput,
  ): Promise<GetUserBehaviorProfileOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetUserBehaviorProfileError(code, message, details),
      });

      const existingProfile =
        await this.userBehaviorProfileRepository.findByUserProfileId(
          userProfile.id,
        );

      if (existingProfile) {
        return {
          userBehaviorProfile: existingProfile,
        };
      }

      return await this.buildUserBehaviorProfileUseCase.execute({
        authUserId: input.authUserId,
      });
    } catch (error) {
      if (error instanceof PersonalizationReadError) {
        throw error;
      }

      if (error instanceof BuildUserBehaviorProfileError) {
        throw new GetUserBehaviorProfileError(
          PERSONALIZATION_READ_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetUserBehaviorProfileError(
        GET_USER_BEHAVIOR_PROFILE_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
