import { GoalAchievementResponse } from './goal-response.type';

export class GetGoalAchievementHistoryResponseDto {
  goalAchievements!: GoalAchievementResponse[];
  limit!: number;
}
