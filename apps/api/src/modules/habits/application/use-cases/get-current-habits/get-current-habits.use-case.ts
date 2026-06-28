import { Inject, Injectable } from '@nestjs/common';

import { BuildHabitSnapshotError } from '../build-habit-snapshot/build-habit-snapshot.errors';
import { BuildHabitSnapshotUseCase } from '../build-habit-snapshot/build-habit-snapshot.use-case';
import {
  HABIT_SNAPSHOT_REPOSITORY,
  HabitSnapshotRepository,
} from '../../../domain/repositories/habit-snapshot.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_CURRENT_HABITS_ERROR_CODES,
  GetCurrentHabitsError,
} from './get-current-habits.errors';
import type { GetCurrentHabitsInput } from './get-current-habits.input';
import type { GetCurrentHabitsOutput } from './get-current-habits.output';
import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
  resolveUserProfileOrThrow,
} from '../../services/habit-read.errors';

@Injectable()
export class GetCurrentHabitsUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(HABIT_SNAPSHOT_REPOSITORY)
    private readonly habitSnapshotRepository: HabitSnapshotRepository,
    private readonly buildHabitSnapshotUseCase: BuildHabitSnapshotUseCase,
  ) {}

  async execute(input: GetCurrentHabitsInput): Promise<GetCurrentHabitsOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetCurrentHabitsError(code, message, details),
      });

      const latestSnapshot =
        await this.habitSnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (latestSnapshot) {
        return {
          habitSnapshot: latestSnapshot,
        };
      }

      return await this.buildHabitSnapshotUseCase.execute({
        authUserId: input.authUserId,
      });
    } catch (error) {
      if (error instanceof HabitReadError) {
        throw error;
      }

      if (error instanceof BuildHabitSnapshotError) {
        throw new GetCurrentHabitsError(
          GET_CURRENT_HABITS_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetCurrentHabitsError(
        HABIT_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
