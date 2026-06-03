import { GoalMilestone } from '../entities/goal-milestone.entity';
import { GoalMilestoneType } from '../goals.types';

export interface GoalMilestoneRepository {
  findManyByGoalId(goalId: string): Promise<GoalMilestone[]>;
  createMany(input: GoalMilestone[]): Promise<GoalMilestone[]>;
  markAchieved(
    goalId: string,
    type: GoalMilestoneType,
    achievedAt: string,
  ): Promise<GoalMilestone | null>;
}

export const GOAL_MILESTONE_REPOSITORY = Symbol('GOAL_MILESTONE_REPOSITORY');
