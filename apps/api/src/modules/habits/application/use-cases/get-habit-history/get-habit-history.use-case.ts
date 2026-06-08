import { Inject, Injectable } from '@nestjs/common';

import {
  HABIT_SNAPSHOT_REPOSITORY,
  HabitSnapshotRepository,
} from '../../../domain/repositories/habit-snapshot.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_HABIT_HISTORY_ERROR_CODES,
  GetHabitHistoryError,
} from './get-habit-history.errors';
import type { GetHabitHistoryInput } from './get-habit-history.input';
import type { GetHabitHistoryOutput } from './get-habit-history.output';
import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
  normalizeLimit,
  resolveUserProfileOrThrow,
} from '../../services/habit-read.errors';

const DEFAULT_LIMIT = 14;
const MAX_LIMIT = 90;

@Injectable()
export class GetHabitHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(HABIT_SNAPSHOT_REPOSITORY)
    private readonly habitSnapshotRepository: HabitSnapshotRepository,
  ) {}

  async execute(input: GetHabitHistoryInput): Promise<GetHabitHistoryOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetHabitHistoryError(code, message, details),
      });

      const limit = normalizeLimit(
        input.limit,
        DEFAULT_LIMIT,
        MAX_LIMIT,
        (code, message, details) =>
          new GetHabitHistoryError(code, message, details),
      );
      const habitSnapshots =
        await this.habitSnapshotRepository.findManyByUserProfileId(
          userProfile.id,
          { limit },
        );

      return {
        habitSnapshots,
        limit,
      };
    } catch (error) {
      if (error instanceof HabitReadError) {
        throw error;
      }

      throw new GetHabitHistoryError(
        HABIT_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
