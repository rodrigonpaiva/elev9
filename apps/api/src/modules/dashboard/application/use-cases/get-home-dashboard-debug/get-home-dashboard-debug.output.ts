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
  nutrition: {
    priority: 'recovery' | 'consistency' | 'performance';
    signals: string[];
  };
};
