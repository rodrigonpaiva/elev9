import { HabitSnapshot } from '../entities/habit-snapshot.entity';
import type { HabitSourceContext } from '../habits.types';
import type { ConsistencyTrend } from '../habits.types';

export interface HabitSnapshotQueryOptions {
  limit?: number;
}

export interface UpsertHabitSnapshotRepositoryInput {
  userProfileId: string;
  date: string;
  consistencyScore: number;
  streakDays: number;
  adherenceScore: number;
  trend: ConsistencyTrend;
  sourceContext: HabitSourceContext;
  formulaVersion: string;
  generatedAt: Date;
}

export interface HabitSnapshotRepository {
  findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<HabitSnapshot | null>;
  findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<HabitSnapshot | null>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: HabitSnapshotQueryOptions,
  ): Promise<HabitSnapshot[]>;
  findById(id: string): Promise<HabitSnapshot | null>;
  upsertDailySnapshot(
    input: UpsertHabitSnapshotRepositoryInput,
  ): Promise<HabitSnapshot>;
}

export const HABIT_SNAPSHOT_REPOSITORY = Symbol('HABIT_SNAPSHOT_REPOSITORY');
