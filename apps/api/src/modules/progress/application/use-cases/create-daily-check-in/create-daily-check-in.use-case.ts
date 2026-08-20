import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { BuildRecoverySnapshotUseCase } from '../../../../recovery/application/use-cases/build-recovery-snapshot/build-recovery-snapshot.use-case';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../domain/repositories/daily-check-in.repository';
import { DailyCheckInDateService } from '../../services/daily-check-in-date.service';
import {
  CREATE_DAILY_CHECK_IN_ERROR_CODES,
  CreateDailyCheckInError,
} from './create-daily-check-in.errors';
import { CreateDailyCheckInInput } from './create-daily-check-in.input';
import { CreateDailyCheckInOutput } from './create-daily-check-in.output';

@Injectable()
export class CreateDailyCheckInUseCase {
  private readonly logger = new Logger(CreateDailyCheckInUseCase.name);

  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    private readonly dailyCheckInDateService: DailyCheckInDateService = new DailyCheckInDateService(),
    @Optional()
    private readonly buildRecoverySnapshotUseCase?: BuildRecoverySnapshotUseCase,
  ) {}

  async execute(
    input: CreateDailyCheckInInput,
  ): Promise<CreateDailyCheckInOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    this.validateInput({
      authUserId,
      energyLevel: input.energyLevel,
      sleepQuality: input.sleepQuality,
      muscleSoreness: input.muscleSoreness,
      motivationLevel: input.motivationLevel,
    });

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new CreateDailyCheckInError(
          CREATE_DAILY_CHECK_IN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const day = this.dailyCheckInDateService.resolveDay(
        String(userProfile.timezone),
      );
      const dailyCheckIn = await this.dailyCheckInRepository.upsert({
        userProfileId: userProfile.id,
        localDate: day.localDate,
        timezone: day.timezone,
        legacyDayStart: day.legacyDayStart,
        legacyDayEnd: day.legacyDayEnd,
        energyLevel: input.energyLevel,
        sleepQuality: input.sleepQuality,
        muscleSoreness: input.muscleSoreness,
        motivationLevel: input.motivationLevel,
      });

      this.logger.log({
        event: 'daily_check_in_upserted',
        localDate: day.localDate,
        timezone: day.timezone,
      });

      if (this.buildRecoverySnapshotUseCase) {
        try {
          await this.buildRecoverySnapshotUseCase.execute({
            authUserId,
            date: day.localDate,
          });
          this.logger.log({
            event: 'daily_check_in_recovery_recalculated',
            localDate: day.localDate,
          });
        } catch {
          this.logger.error({
            event: 'daily_check_in_recovery_recalculation_failed',
            localDate: day.localDate,
          });
          throw new CreateDailyCheckInError(
            CREATE_DAILY_CHECK_IN_ERROR_CODES.RECOVERY_RECALCULATION_FAILED,
            'Recovery recalculation failed after saving the daily check-in.',
          );
        }
      }

      return {
        dailyCheckIn: {
          id: dailyCheckIn.id,
          energyLevel: dailyCheckIn.energyLevel,
          sleepQuality: dailyCheckIn.sleepQuality,
          muscleSoreness: dailyCheckIn.muscleSoreness,
          motivationLevel: dailyCheckIn.motivationLevel,
          localDate: dailyCheckIn.localDate ?? day.localDate,
          timezone: dailyCheckIn.timezone ?? day.timezone,
          createdAt: dailyCheckIn.createdAt,
          updatedAt: dailyCheckIn.updatedAt,
        },
      };
    } catch (error) {
      if (error instanceof CreateDailyCheckInError) {
        throw error;
      }

      throw new CreateDailyCheckInError(
        CREATE_DAILY_CHECK_IN_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private validateInput(input: {
    authUserId: string;
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
  }): void {
    if (!input.authUserId) {
      throw new CreateDailyCheckInError(
        CREATE_DAILY_CHECK_IN_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    for (const value of [
      input.energyLevel,
      input.sleepQuality,
      input.muscleSoreness,
      input.motivationLevel,
    ]) {
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        throw new CreateDailyCheckInError(
          CREATE_DAILY_CHECK_IN_ERROR_CODES.INVALID_INPUT,
          'Invalid daily check-in input.',
        );
      }
    }
  }
}
