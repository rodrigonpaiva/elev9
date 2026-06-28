import { GoalAchievement } from '../entities/goal-achievement.entity';

export interface CreateGoalAchievementRepositoryInput {
  goalId: string;
  userProfileId: string;
  achievedAt: string;
  completionPercentage: number;
  notes?: string;
}

export interface GoalAchievementRepository {
  findManyByUserProfileId(userProfileId: string): Promise<GoalAchievement[]>;
  create(input: CreateGoalAchievementRepositoryInput): Promise<GoalAchievement>;
}

export const GOAL_ACHIEVEMENT_REPOSITORY = Symbol(
  'GOAL_ACHIEVEMENT_REPOSITORY',
);
