import { Goal } from '../../../domain/entities/goal.entity';
import { GoalForecast } from '../../../domain/entities/goal-forecast.entity';
import { GoalProgressSnapshot } from '../../../domain/entities/goal-progress-snapshot.entity';

export type GetCurrentGoalOutput = {
  goal: Goal;
  progressSnapshot: GoalProgressSnapshot;
  forecast: GoalForecast;
};
