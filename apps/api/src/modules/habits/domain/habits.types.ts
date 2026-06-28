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

export const HABIT_ENGINE_CALCULATOR_VERSION = 'habit-engine-v1';
