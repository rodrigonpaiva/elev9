import { GoalProgressSnapshot } from '../entities/goal-progress-snapshot.entity';
import { GoalTrend } from '../goals.types';
import { GoalMilestoneType } from '../goals.types';

export interface GoalProgressSnapshotQueryOptions {
  limit?: number;
}

export interface UpsertGoalProgressSnapshotRepositoryInput {
  goalId: string;
  userProfileId: string;
  date: string;
  progressPercentage: number;
  currentValue: number;
  targetValue: number;
  trend: GoalTrend;
  sourceContext: Record<string, unknown>;
  formulaVersion: string;
}

export interface GoalProgressSnapshotRepository {
  findByGoalIdAndDate(
    goalId: string,
    date: string,
  ): Promise<GoalProgressSnapshot | null>;
  findLatestByGoalId(goalId: string): Promise<GoalProgressSnapshot | null>;
  findManyByGoalId(
    goalId: string,
    options?: GoalProgressSnapshotQueryOptions,
  ): Promise<GoalProgressSnapshot[]>;
  upsertDailySnapshot(
    input: UpsertGoalProgressSnapshotRepositoryInput,
  ): Promise<GoalProgressSnapshot>;
}

export const GOAL_PROGRESS_SNAPSHOT_REPOSITORY = Symbol(
  'GOAL_PROGRESS_SNAPSHOT_REPOSITORY',
);
