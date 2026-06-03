import { GoalMilestone } from '../../../domain/entities/goal-milestone.entity';

export type GetGoalMilestonesOutput = {
  goalId: string;
  userProfileId: string;
  goalMilestones: GoalMilestone[];
};
