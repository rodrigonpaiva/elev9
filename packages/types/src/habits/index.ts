export type HabitType =
  | 'workout'
  | 'recovery'
  | 'nutrition'
  | 'check_in'
  | 'coaching';

export type HabitStatus = 'active' | 'paused' | 'completed';

export type ConsistencyTrend = 'improving' | 'stable' | 'declining';

export type HabitRiskLevel = 'low' | 'medium' | 'high';

export type RiskSignalType =
  | 'inactivity_pattern'
  | 'streak_at_risk'
  | 'declining_consistency'
  | 'dropout_risk';

export interface HabitSourceContext {
  formulaVersion: string;
  generatedAt: string;
  workoutCompletionRate?: number;
  checkInCompletionRate?: number;
  recoveryAdherence?: number;
  goalProgressScore?: number;
  notificationEngagementScore?: number;
  recentWorkoutLogsCount?: number;
  recentCheckInsCount?: number;
  latestRecoverySnapshotDate?: string;
  latestGoalSnapshotDate?: string;
  latestNotificationDate?: string;
  consecutiveSuccessfulDays?: number;
  inactivityDays?: number;
  previousScore?: number;
  longestStreak?: number;
}

export interface HabitSnapshot {
  userProfileId: string;
  date: string;
  consistencyScore: number;
  streakDays: number;
  adherenceScore: number;
  trend: ConsistencyTrend;
  sourceContext: HabitSourceContext;
  formulaVersion: string;
  generatedAt: string;
}

export interface ConsistencySummary {
  userProfileId: string;
  score: number;
  trend: ConsistencyTrend;
  currentStreak: number;
  longestStreak: number;
  adherenceRate: number;
  riskLevel: HabitRiskLevel;
  updatedAt: string;
  formulaVersion: string;
}

export interface HabitRiskSignal {
  userProfileId: string;
  type: RiskSignalType;
  level: HabitRiskLevel;
  title: string;
  description: string;
  generatedAt: string;
  formulaVersion: string;
}

export interface GetTodayHabitsResponse {
  habitSnapshot: HabitSnapshot;
}

export interface GetCurrentHabitsResponse {
  habitSnapshot: HabitSnapshot;
}

export interface GetHabitHistoryQuery {
  limit?: number;
}

export interface GetHabitHistoryResponse {
  habitSnapshots: HabitSnapshot[];
  limit: number;
}

export interface GetConsistencySummaryResponse {
  consistencySummary: ConsistencySummary;
}

export interface GetHabitRiskSignalsResponse {
  habitRiskSignals: HabitRiskSignal[];
}

export interface HabitReplayDifference {
  field:
    | 'consistencyScore'
    | 'streakDays'
    | 'adherenceScore'
    | 'trend'
    | 'formulaVersion';
  persisted: unknown;
  recalculated: unknown;
}

export interface HabitReplayComparison {
  matches: boolean;
  differences: HabitReplayDifference[];
}

export interface HabitReplayRecalculatedSnapshot {
  consistencyScore: number;
  streakDays: number;
  adherenceScore: number;
  trend: ConsistencyTrend;
  formulaVersion: string;
}

export interface HabitReplayResponse {
  persisted: HabitSnapshot;
  recalculated: HabitReplayRecalculatedSnapshot;
  comparison: HabitReplayComparison;
  replayedAt: string;
}
