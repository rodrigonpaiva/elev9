import type {
  GoalAchievementContract,
  GoalContract,
  GoalForecastContract,
  GoalMilestoneContract,
  GoalProgressSnapshotContract,
} from '../../../domain/goals.contract';

export type GoalResponse = GoalContract;
export type GoalProgressSnapshotResponse = GoalProgressSnapshotContract;
export type GoalForecastResponse = GoalForecastContract;
export type GoalMilestoneResponse = GoalMilestoneContract;
export type GoalAchievementResponse = GoalAchievementContract;
