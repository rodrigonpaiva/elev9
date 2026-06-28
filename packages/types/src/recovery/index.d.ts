export type RecoveryTrend = 'improving' | 'stable' | 'declining';
export type RecommendedIntensity = 'recovery' | 'light' | 'moderate' | 'hard';
export type RecoveryInfluenceCode =
  | 'LOW_SLEEP'
  | 'LOW_ENERGY'
  | 'HIGH_MUSCLE_SORENESS'
  | 'HIGH_ADHERENCE'
  | 'LOW_ADHERENCE'
  | 'HIGH_WORKOUT_LOAD'
  | 'RECENT_WORKOUT_COMPLETION'
  | 'LONG_STREAK'
  | 'MISSED_WORKOUTS';
export type RecoveryInfluence = {
  code: RecoveryInfluenceCode;
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight?: number;
  value?: number;
};
export type RecoverySourceContext = {
  sleepQuality?: number;
  energyLevel?: number;
  muscleSoreness?: number;
  adherenceScore?: number;
  recentWorkoutLoad?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  previousReadinessScores?: number[];
  formulaVersion?: string;
  generatedAt?: string;
};
export type RecoverySnapshot = {
  userProfileId: string;
  date: string;
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: RecoveryTrend;
  recommendedIntensity: RecommendedIntensity;
  influences: RecoveryInfluence[];
  formulaVersion: string;
  sourceContext: RecoverySourceContext;
  createdAt: string;
};
export type BuildRecoverySnapshotInput = {
  authUserId: string;
  date?: string;
  sleepQuality?: number;
  energyLevel?: number;
  muscleSoreness?: number;
  adherenceScore?: number;
  recentWorkoutLoad?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  previousReadinessScores?: number[];
  sourceContext?: RecoverySourceContext;
};
export type BuildRecoverySnapshotOutput = {
  recoverySnapshot: RecoverySnapshot;
};
export type GetTodayRecoveryResponse = {
  recoverySnapshot: RecoverySnapshot;
};
export type GetCurrentRecoveryResponse = {
  recoverySnapshot: RecoverySnapshot;
};
export type GetRecoveryHistoryResponse = {
  recoverySnapshots: RecoverySnapshot[];
};
