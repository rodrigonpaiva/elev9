import { Inject, Injectable } from '@nestjs/common';

import { BuildBehavioralPatternsError } from '../build-behavioral-patterns/build-behavioral-patterns.errors';
import { BuildBehavioralPatternsUseCase } from '../build-behavioral-patterns/build-behavioral-patterns.use-case';
import {
  BEHAVIORAL_PATTERN_REPOSITORY,
  BehavioralPatternRepository,
} from '../../../domain/repositories/behavioral-pattern.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_BEHAVIORAL_PATTERNS_ERROR_CODES,
  GetBehavioralPatternsError,
} from './get-behavioral-patterns.errors';
import type { GetBehavioralPatternsInput } from './get-behavioral-patterns.input';
import type { GetBehavioralPatternsOutput } from './get-behavioral-patterns.output';
import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
  resolveUserProfileOrThrow,
} from '../../services/personalization-read.errors';

@Injectable()
export class GetBehavioralPatternsUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(BEHAVIORAL_PATTERN_REPOSITORY)
    private readonly behavioralPatternRepository: BehavioralPatternRepository,
    private readonly buildBehavioralPatternsUseCase: BuildBehavioralPatternsUseCase,
  ) {}

  async execute(
    input: GetBehavioralPatternsInput,
  ): Promise<GetBehavioralPatternsOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetBehavioralPatternsError(code, message, details),
      });

      const behavioralPatterns =
        await this.behavioralPatternRepository.findManyByUserProfileId(
          userProfile.id,
        );

      if (behavioralPatterns.length > 0) {
        return {
          behavioralPatterns,
        };
      }

      return await this.buildBehavioralPatternsUseCase.execute({
        authUserId: input.authUserId,
      });
    } catch (error) {
      if (error instanceof PersonalizationReadError) {
        throw error;
      }

      if (error instanceof BuildBehavioralPatternsError) {
        throw new GetBehavioralPatternsError(
          PERSONALIZATION_READ_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetBehavioralPatternsError(
        GET_BEHAVIORAL_PATTERNS_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
