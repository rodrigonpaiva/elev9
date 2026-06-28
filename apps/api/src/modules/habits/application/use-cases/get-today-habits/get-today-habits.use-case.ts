import { Inject, Injectable } from '@nestjs/common';

import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
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
  GET_TODAY_HABITS_ERROR_CODES,
  GetTodayHabitsError,
} from './get-today-habits.errors';
import type { GetTodayHabitsInput } from './get-today-habits.input';
import type { GetTodayHabitsOutput } from './get-today-habits.output';
import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
  resolveUserProfileOrThrow,
} from '../../services/habit-read.errors';

@Injectable()
export class GetTodayHabitsUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(HABIT_SNAPSHOT_REPOSITORY)
    private readonly habitSnapshotRepository: HabitSnapshotRepository,
    private readonly buildHabitSnapshotUseCase: BuildHabitSnapshotUseCase,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(input: GetTodayHabitsInput): Promise<GetTodayHabitsOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetTodayHabitsError(code, message, details),
      });

      const todayDate = this.platformDateService.getTodayDateString();
      const existingSnapshot =
        await this.habitSnapshotRepository.findByUserProfileIdAndDate(
          userProfile.id,
          todayDate,
        );

      if (existingSnapshot) {
        return {
          habitSnapshot: existingSnapshot,
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
        throw new GetTodayHabitsError(
          GET_TODAY_HABITS_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetTodayHabitsError(
        HABIT_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
