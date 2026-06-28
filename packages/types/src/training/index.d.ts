export type TrainingPlanGoal = 'lose_weight' | 'gain_muscle' | 'maintain';
export type TrainingPlanActivityLevel = 'low' | 'medium' | 'high';
export type TrainingPlanIntensity = 'low' | 'moderate' | 'high';
export type AdaptiveRecommendationType =
  | 'increase_intensity'
  | 'decrease_intensity'
  | 'increase_volume'
  | 'decrease_volume'
  | 'recovery_workout'
  | 'rest_day'
  | 'reschedule_workout'
  | 'maintain';
export type AdaptiveRecommendedIntensity =
  | 'recovery'
  | 'light'
  | 'moderate'
  | 'hard';
export type AdaptiveVolumeAction = 'increase' | 'maintain' | 'decrease';
export type AdaptiveTrainingInfluenceCode =
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
export type AdaptiveTrainingInfluence = {
  code: AdaptiveTrainingInfluenceCode;
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight?: number;
  value?: number;
};
export type AdaptiveTrainingSourceContext = {
  readinessScore?: number;
  fatigueScore?: number;
  recoveryTrend?: 'improving' | 'stable' | 'declining';
  recoveryRecommendedIntensity?: AdaptiveRecommendedIntensity;
  adherenceScore?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  recentWorkoutLoad?: number;
  nutritionAdherence?: number;
  recentWorkoutLogsCount?: number;
  trainingPlanId?: string;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
  formulaVersion?: string;
  generatedAt?: string;
};
export type AdaptiveTrainingRecommendation = {
  id: string;
  userProfileId: string;
  trainingPlanId?: string;
  date: string;
  recommendationType: AdaptiveRecommendationType;
  recommendedIntensity: AdaptiveRecommendedIntensity;
  volumeAction: AdaptiveVolumeAction;
  reasoning: string;
  influences: AdaptiveTrainingInfluence[];
  sourceContext: AdaptiveTrainingSourceContext;
  formulaVersion: string;
  generatedBy: 'deterministic';
  createdAt: string;
  updatedAt: string;
};
export type BuildAdaptiveTrainingRecommendationInput = {
  authUserId: string;
  date?: string;
  sourceContext?: AdaptiveTrainingSourceContext;
};
export type BuildAdaptiveTrainingRecommendationOutput = {
  adaptiveTrainingRecommendation: AdaptiveTrainingRecommendation;
};
export type GetTodayAdaptiveTrainingResponse = {
  adaptiveTrainingRecommendation: AdaptiveTrainingRecommendation;
};
export type GetCurrentAdaptiveTrainingResponse = {
  adaptiveTrainingRecommendation: AdaptiveTrainingRecommendation;
};
export type GetAdaptiveTrainingHistoryResponse = {
  adaptiveTrainingRecommendations: AdaptiveTrainingRecommendation[];
};
export type TrainingPlanResponse = {
  trainingPlan: {
    id: string;
    fitnessProfileId: string;
    status: 'active';
    goal: TrainingPlanGoal;
    activityLevel: TrainingPlanActivityLevel;
    weeklySchedule: Array<{
      dayIndex: number;
      title: string;
      focus: string;
      format: string;
      intensity: TrainingPlanIntensity;
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      }>;
    }>;
    createdAt: string;
  };
};
