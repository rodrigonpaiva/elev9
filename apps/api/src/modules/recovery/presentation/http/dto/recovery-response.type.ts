export type RecoveryInfluenceResponse = {
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
};

export type RecoverySnapshotResponse = {
  userProfileId: string;
  date: string;
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: 'improving' | 'stable' | 'declining';
  recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
  influences: RecoveryInfluenceResponse[];
  formulaVersion: string;
  sourceContext: Record<string, unknown>;
  createdAt: string;
};
