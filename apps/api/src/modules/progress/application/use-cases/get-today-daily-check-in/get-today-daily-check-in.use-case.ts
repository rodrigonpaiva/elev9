import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../domain/repositories/daily-check-in.repository';
import { DailyCheckInDateService } from '../../services/daily-check-in-date.service';
import {
  GET_TODAY_DAILY_CHECK_IN_ERROR_CODES,
  GetTodayDailyCheckInError,
} from './get-today-daily-check-in.errors';
import { GetTodayDailyCheckInInput } from './get-today-daily-check-in.input';
import { GetTodayDailyCheckInOutput } from './get-today-daily-check-in.output';

@Injectable()
export class GetTodayDailyCheckInUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    private readonly dailyCheckInDateService: DailyCheckInDateService = new DailyCheckInDateService(),
  ) {}

  async execute(
    input: GetTodayDailyCheckInInput,
  ): Promise<GetTodayDailyCheckInOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetTodayDailyCheckInError(
        GET_TODAY_DAILY_CHECK_IN_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetTodayDailyCheckInError(
          GET_TODAY_DAILY_CHECK_IN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const day = this.dailyCheckInDateService.resolveDay(
        String(userProfile.timezone),
      );
      const dailyCheckIn =
        await this.dailyCheckInRepository.findByUserProfileIdAndLocalDate({
          userProfileId: userProfile.id,
          localDate: day.localDate,
          legacyDayStart: day.legacyDayStart,
          legacyDayEnd: day.legacyDayEnd,
        });

      return {
        completedToday: Boolean(dailyCheckIn),
        dailyCheckIn: dailyCheckIn
          ? {
              id: dailyCheckIn.id,
              energyLevel: dailyCheckIn.energyLevel,
              sleepQuality: dailyCheckIn.sleepQuality,
              muscleSoreness: dailyCheckIn.muscleSoreness,
              motivationLevel: dailyCheckIn.motivationLevel,
              localDate: dailyCheckIn.localDate ?? day.localDate,
              timezone: dailyCheckIn.timezone ?? day.timezone,
              createdAt: dailyCheckIn.createdAt,
              updatedAt: dailyCheckIn.updatedAt,
            }
          : null,
      };
    } catch (error) {
      if (error instanceof GetTodayDailyCheckInError) {
        throw error;
      }

      throw new GetTodayDailyCheckInError(
        GET_TODAY_DAILY_CHECK_IN_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
