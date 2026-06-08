import { Inject, Injectable } from '@nestjs/common';

import { BuildConsistencySummaryError } from '../build-consistency-summary/build-consistency-summary.errors';
import { BuildConsistencySummaryUseCase } from '../build-consistency-summary/build-consistency-summary.use-case';
import {
  CONSISTENCY_SUMMARY_REPOSITORY,
  ConsistencySummaryRepository,
} from '../../../domain/repositories/consistency-summary.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_CONSISTENCY_SUMMARY_ERROR_CODES,
  GetConsistencySummaryError,
} from './get-consistency-summary.errors';
import type { GetConsistencySummaryInput } from './get-consistency-summary.input';
import type { GetConsistencySummaryOutput } from './get-consistency-summary.output';
import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
  resolveUserProfileOrThrow,
} from '../../services/habit-read.errors';

@Injectable()
export class GetConsistencySummaryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(CONSISTENCY_SUMMARY_REPOSITORY)
    private readonly consistencySummaryRepository: ConsistencySummaryRepository,
    private readonly buildConsistencySummaryUseCase: BuildConsistencySummaryUseCase,
  ) {}

  async execute(
    input: GetConsistencySummaryInput,
  ): Promise<GetConsistencySummaryOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetConsistencySummaryError(code, message, details),
      });

      const existingSummary =
        await this.consistencySummaryRepository.findByUserProfileId(
          userProfile.id,
        );

      if (existingSummary) {
        return {
          consistencySummary: existingSummary,
        };
      }

      return await this.buildConsistencySummaryUseCase.execute({
        authUserId: input.authUserId,
      });
    } catch (error) {
      if (error instanceof HabitReadError) {
        throw error;
      }

      if (error instanceof BuildConsistencySummaryError) {
        throw new GetConsistencySummaryError(
          GET_CONSISTENCY_SUMMARY_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetConsistencySummaryError(
        HABIT_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
