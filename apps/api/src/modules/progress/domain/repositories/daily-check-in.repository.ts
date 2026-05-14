import { DailyCheckIn } from "../entities/daily-check-in.entity";

export interface CreateDailyCheckInRepositoryInput {
  userProfileId: string;
  energyLevel: number;
  sleepQuality: number;
  muscleSoreness: number;
  motivationLevel: number;
}

export interface DailyCheckInRepository {
  create(input: CreateDailyCheckInRepositoryInput): Promise<DailyCheckIn>;
  findLatestByUserProfileId(userProfileId: string): Promise<DailyCheckIn | null>;
  findManyByUserProfileId(userProfileId: string): Promise<DailyCheckIn[]>;
}

export const DAILY_CHECK_IN_REPOSITORY = Symbol("DAILY_CHECK_IN_REPOSITORY");
