export type SourceContextBase = {
  formulaVersion: string;
  generatedAt: string;
};

export type RecoverySourceContext = SourceContextBase & {
  sleepQuality?: number;
  energyLevel?: number;
  muscleSoreness?: number;
  adherenceScore?: number;
  recentWorkoutLoad?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  recentCheckInsCount?: number;
  recentWorkoutLogsCount?: number;
  trainingPlanId?: string;
};

export type AdaptiveTrainingSourceContext = SourceContextBase & {
  readinessScore?: number;
  fatigueScore?: number;
  recoveryTrend?: 'improving' | 'stable' | 'declining';
  recoveryRecommendedIntensity?: 'recovery' | 'light' | 'moderate' | 'hard';
  adherenceScore?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  recentWorkoutLoad?: number;
  nutritionAdherence?: number;
  recentWorkoutLogsCount?: number;
  trainingPlanId?: string;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
};

export type CoachDecisionSourceContext = SourceContextBase & {
  readinessScore?: number;
  fatigueScore?: number;
  nutritionAdherence?: number;
  adaptiveRecommendationType?: string;
  adaptiveIntensity?: string;
  currentStreak?: number;
  missedWorkouts?: number;
  noRecentActivity?: boolean;
  goalId?: string;
  goalType?: 'lose_weight' | 'gain_muscle' | 'maintain_weight' | 'improve_consistency' | 'improve_recovery';
  goalProgressPercentage?: number;
  goalTrend?: 'improving' | 'stable' | 'declining';
  goalForecastConfidence?: 'low' | 'medium' | 'high';
  goalMilestoneClose?: boolean;
  goalAchievementReached?: boolean;
  habitConsistencyScore?: number;
  habitTrend?: 'improving' | 'stable' | 'declining';
  habitCurrentStreak?: number;
  habitRiskLevel?: 'low' | 'medium' | 'high';
  habitRiskSignals?: Array<
    | 'inactivity_pattern'
    | 'streak_at_risk'
    | 'declining_consistency'
    | 'dropout_risk'
  >;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
  adaptiveTrainingRecommendationId?: string;
};

export type GoalSourceContext = SourceContextBase & {
  goalType: 'lose_weight' | 'gain_muscle' | 'maintain_weight' | 'improve_consistency' | 'improve_recovery';
  startValue: number;
  currentValue: number;
  targetValue?: number;
  adherenceScore?: number;
  recoveryScore?: number;
  consistencyScore?: number;
  workoutLogsCount?: number;
  checkInsCount?: number;
  recoverySnapshotId?: string;
  adaptiveTrainingRecommendationId?: string;
};
