export type GoalType =
  | 'lose_weight'
  | 'gain_muscle'
  | 'maintain_weight'
  | 'improve_consistency'
  | 'improve_recovery';
export type GoalStatus = 'active' | 'achieved' | 'abandoned';
export type GoalTrend = 'improving' | 'stable' | 'declining';
export type GoalForecastConfidence = 'low' | 'medium' | 'high';
export type GoalMilestoneType =
  | 'weight_target'
  | 'workout_count'
  | 'streak'
  | 'adherence'
  | 'recovery'
  | 'custom';
export interface Goal {
  id: string;
  userProfileId: string;
  type: GoalType;
  status: GoalStatus;
  startDate: string;
  targetDate?: string;
  achievedAt?: string;
  targetValue?: number;
  createdAt: string;
  updatedAt: string;
}
export interface GoalProgressSnapshot {
  goalId: string;
  userProfileId: string;
  date: string;
  progressPercentage: number;
  currentValue: number;
  targetValue: number;
  trend: GoalTrend;
  sourceContext: Record<string, unknown>;
  formulaVersion: string;
}
export interface GoalForecast {
  goalId: string;
  userProfileId: string;
  predictedCompletionDate?: string;
  confidence: GoalForecastConfidence;
  estimatedDaysRemaining: number;
  generatedAt: string;
  formulaVersion: string;
}
export interface GoalMilestone {
  goalId: string;
  type: GoalMilestoneType;
  title: string;
  targetValue: number;
  achieved: boolean;
  achievedAt?: string;
}
export interface GoalAchievement {
  goalId: string;
  achievedAt: string;
  completionPercentage: number;
  notes?: string;
}
export interface GetCurrentGoalResponse {
  goal: Goal;
  progressSnapshot: GoalProgressSnapshot;
  forecast: GoalForecast;
}
export interface GetGoalHistoryQuery {
  limit?: number;
}
export interface GetGoalHistoryResponse {
  goalProgressSnapshots: GoalProgressSnapshot[];
  limit: number;
}
export interface GetGoalMilestonesResponse {
  goalId: string;
  userProfileId: string;
  goalMilestones: GoalMilestone[];
}
export interface GetGoalAchievementHistoryQuery {
  limit?: number;
}
export interface GetGoalAchievementHistoryResponse {
  goalAchievements: GoalAchievement[];
  limit: number;
}
export interface GetGoalForecastResponse {
  goalForecast: GoalForecast;
}
