import type { HabitSnapshotContract } from '../../../domain/habits.contract';
import type { ConsistencyTrend } from '../../../domain/habits.types';

export type HabitSnapshotResponse = HabitSnapshotContract;

export type HabitReplayDifferenceResponse = {
  field:
    | 'consistencyScore'
    | 'streakDays'
    | 'adherenceScore'
    | 'trend'
    | 'formulaVersion';
  persisted: unknown;
  recalculated: unknown;
};

export type HabitReplayComparisonResponse = {
  matches: boolean;
  differences: HabitReplayDifferenceResponse[];
};

export type HabitReplayRecalculatedResponse = {
  consistencyScore: number;
  streakDays: number;
  adherenceScore: number;
  trend: ConsistencyTrend;
  formulaVersion: string;
};
