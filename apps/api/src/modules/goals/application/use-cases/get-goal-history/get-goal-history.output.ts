import { GoalProgressSnapshot } from '../../../domain/entities/goal-progress-snapshot.entity';

export type GetGoalHistoryOutput = {
  goalProgressSnapshots: GoalProgressSnapshot[];
  limit: number;
};
