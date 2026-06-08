import { ConsistencySummary } from '../entities/consistency-summary.entity';
import type { HabitRiskLevel } from '../habits.types';
import type { ConsistencyTrend } from '../habits.types';

export interface UpsertConsistencySummaryRepositoryInput {
  userProfileId: string;
  score: number;
  trend: ConsistencyTrend;
  currentStreak: number;
  longestStreak: number;
  adherenceRate: number;
  riskLevel: HabitRiskLevel;
  formulaVersion: string;
}

export interface ConsistencySummaryRepository {
  findByUserProfileId(userProfileId: string): Promise<ConsistencySummary | null>;
  upsertSummary(
    input: UpsertConsistencySummaryRepositoryInput,
  ): Promise<ConsistencySummary>;
}

export const CONSISTENCY_SUMMARY_REPOSITORY = Symbol(
  'CONSISTENCY_SUMMARY_REPOSITORY',
);
