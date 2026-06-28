export type AdaptiveTrainingInfluenceResponse = {
  code:
    | 'HIGH_READINESS'
    | 'LOW_READINESS'
    | 'HIGH_FATIGUE'
    | 'LOW_FATIGUE'
    | 'RECOVERY_TREND_IMPROVING'
    | 'RECOVERY_TREND_DECLINING'
    | 'HIGH_ADHERENCE'
    | 'LOW_ADHERENCE'
    | 'LONG_STREAK'
    | 'MISSED_WORKOUTS'
    | 'GOOD_NUTRITION_SUPPORT'
    | 'POOR_NUTRITION_SUPPORT'
    | 'RECENT_WORKOUT_LOAD_HIGH'
    | 'RECENT_WORKOUT_LOAD_LOW';
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight?: number;
  value?: number;
};

export type AdaptiveTrainingRecommendationResponse = {
  id: string;
  userProfileId: string;
  trainingPlanId?: string;
  date: string;
  recommendationType:
    | 'increase_intensity'
    | 'decrease_intensity'
    | 'increase_volume'
    | 'decrease_volume'
    | 'recovery_workout'
    | 'rest_day'
    | 'reschedule_workout'
    | 'maintain';
  recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
  volumeAction: 'increase' | 'maintain' | 'decrease';
  reasoning: string;
  influences: AdaptiveTrainingInfluenceResponse[];
  sourceContext: Record<string, unknown>;
  formulaVersion: string;
  generatedBy: 'deterministic';
  createdAt: string;
  updatedAt: string;
};
