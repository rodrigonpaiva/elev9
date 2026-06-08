import type {
  ReplayComparison,
  ReplayDifference,
} from '../../../../../shared/replay';
import type { HabitSnapshot } from '../../../domain/entities/habit-snapshot.entity';
import type { ConsistencyTrend } from '../../../domain/habits.types';

export type ReplayHabitSnapshotComparisonField =
  | 'consistencyScore'
  | 'streakDays'
  | 'adherenceScore'
  | 'trend'
  | 'formulaVersion';

export type ReplayHabitSnapshotRecalculated = {
  consistencyScore: number;
  streakDays: number;
  adherenceScore: number;
  trend: ConsistencyTrend;
  formulaVersion: string;
};

export type ReplayHabitSnapshotOutput = {
  persisted: HabitSnapshot;
  recalculated: ReplayHabitSnapshotRecalculated;
  comparison: ReplayComparison<ReplayHabitSnapshotComparisonField>;
  replayedAt: string;
};

export type ReplayHabitSnapshotFieldDifference =
  ReplayDifference<ReplayHabitSnapshotComparisonField>;
