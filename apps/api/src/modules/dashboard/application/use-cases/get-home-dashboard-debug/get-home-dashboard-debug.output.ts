import {
  GoalContract,
  GoalForecastContract,
  GoalMilestoneContract,
  GoalProgressSnapshotContract,
} from '../../../../goals/domain/goals.contract';

export type GetHomeDashboardDebugOutput = {
  generatedAt: string;
  recovery: {
    fatigueLevel: string;
    recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
    recoverySignals: string[];
    readinessScore?: number;
    fatigueScore?: number;
    recoveryInfluences?: Array<{
      code:
        | 'LOW_SLEEP'
        | 'LOW_ENERGY'
        | 'HIGH_MUSCLE_SORENESS'
        | 'HIGH_ADHERENCE'
        | 'LOW_ADHERENCE'
        | 'HIGH_WORKOUT_LOAD'
        | 'RECENT_WORKOUT_COMPLETION'
        | 'LONG_STREAK'
        | 'MISSED_WORKOUTS';
      label: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight?: number;
      value?: number;
    }>;
  };
  goal?: {
    current: GoalContract;
    progressSnapshot?: GoalProgressSnapshotContract;
    forecast?: GoalForecastContract;
    milestones?: GoalMilestoneContract[];
  };
  adaptiveTrainingRecommendation?: {
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
    influences: Array<{
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
    }>;
  };
  nutrition: {
    priority: 'recovery' | 'consistency' | 'performance';
    signals: string[];
  };
};
