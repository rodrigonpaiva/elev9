import { GoalAchievement } from '../../../domain/entities/goal-achievement.entity';

export type GetGoalAchievementHistoryOutput = {
  goalAchievements: GoalAchievement[];
  limit: number;
};
