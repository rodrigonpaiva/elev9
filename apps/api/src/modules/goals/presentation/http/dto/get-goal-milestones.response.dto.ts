import {
  GoalMilestoneResponse,
} from './goal-response.type';

export class GetGoalMilestonesResponseDto {
  goalId!: string;
  userProfileId!: string;
  goalMilestones!: GoalMilestoneResponse[];
}
