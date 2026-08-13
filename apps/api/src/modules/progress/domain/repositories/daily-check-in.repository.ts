import { DailyCheckIn } from '../entities/daily-check-in.entity';

export interface UpsertDailyCheckInRepositoryInput {
  userProfileId: string;
  localDate: string;
  timezone: string;
  legacyDayStart?: Date;
  legacyDayEnd?: Date;
  energyLevel: number;
  sleepQuality: number;
  muscleSoreness: number;
  motivationLevel: number;
}

export interface DailyCheckInRepository {
  upsert(input: UpsertDailyCheckInRepositoryInput): Promise<DailyCheckIn>;
  findByUserProfileIdAndLocalDate(input: {
    userProfileId: string;
    localDate: string;
    legacyDayStart?: Date;
    legacyDayEnd?: Date;
  }): Promise<DailyCheckIn | null>;
  findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<DailyCheckIn | null>;
  findManyByUserProfileId(userProfileId: string): Promise<DailyCheckIn[]>;
}

export const DAILY_CHECK_IN_REPOSITORY = Symbol('DAILY_CHECK_IN_REPOSITORY');
