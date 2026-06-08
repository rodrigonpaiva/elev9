type CoachDecisionPriority =
  | 'recovery'
  | 'nutrition'
  | 'training'
  | 'consistency'
  | 'motivation';

export type CoachDecisionInfluenceResponse = {
  code:
    | 'LOW_READINESS'
    | 'HIGH_FATIGUE'
    | 'LOW_NUTRITION_ADHERENCE'
    | 'HIGH_NUTRITION_ADHERENCE'
    | 'REST_DAY_RECOMMENDED'
    | 'RECOVERY_WORKOUT_RECOMMENDED'
  | 'INCREASE_INTENSITY_RECOMMENDED'
  | 'DECREASE_INTENSITY_RECOMMENDED'
  | 'LOW_TRAINING_ADHERENCE'
  | 'LONG_STREAK'
  | 'NO_RECENT_ACTIVITY'
  | 'GOOD_CONSISTENCY'
  | 'GOAL_PROGRESS_DECLINING'
  | 'GOAL_PROGRESS_IMPROVING'
  | 'GOAL_FORECAST_LOW_CONFIDENCE'
  | 'GOAL_MILESTONE_CLOSE'
  | 'GOAL_ACHIEVEMENT_REACHED'
  | 'NOTIFICATION_SUPPRESSED'
  | 'NOTIFICATION_FATIGUE_HIGH'
  | 'NOTIFICATION_DISMISSED_FREQUENTLY'
  | 'NOTIFICATION_HIGH_ENGAGEMENT'
  | 'HABIT_CONSISTENCY_IMPROVING'
  | 'HABIT_CONSISTENCY_DECLINING'
  | 'HABIT_RISK_HIGH'
  | 'HABIT_STREAK_STRONG'
  | 'HABIT_DROPOUT_RISK';
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  source:
    | 'recovery'
    | 'nutrition'
    | 'training'
    | 'progress'
    | 'memory'
    | 'notification'
    | 'habit';
  weight?: number;
  value?: number;
};

export type CoachDecisionResponse = {
  id: string;
  userProfileId: string;
  date: string;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
  adaptiveTrainingRecommendationId?: string;
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluenceResponse[];
  sourceContext: Record<string, unknown>;
  formulaVersion: string;
  generatedBy: 'deterministic' | 'llm_assisted';
  llmMetadata?: {
    provider?: string;
    model?: string;
    used: boolean;
    failed?: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type CoachDecisionRecalculatedResultResponse = {
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluenceResponse[];
  formulaVersion: string;
};

export type CoachDecisionReplayDifferenceResponse = {
  field: string;
  persisted: unknown;
  recalculated: unknown;
};

export type CoachDecisionReplayComparisonResponse = {
  matches: boolean;
  differences: CoachDecisionReplayDifferenceResponse[];
};

export type CoachDecisionReplayResponse = {
  persisted: CoachDecisionResponse;
  recalculated: CoachDecisionRecalculatedResultResponse;
  comparison: CoachDecisionReplayComparisonResponse;
  replayedAt: string;
};
