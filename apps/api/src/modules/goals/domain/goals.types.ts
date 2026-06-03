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
