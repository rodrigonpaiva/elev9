import type {
  ConsistencyTrend,
  HabitRiskLevel,
  HabitSourceContext,
  RiskSignalType,
} from './habits.types';

export interface HabitSnapshotContract {
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

export interface ConsistencySummaryContract {
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

export interface HabitRiskSignalContract {
  userProfileId: string;
  type: RiskSignalType;
  level: HabitRiskLevel;
  title: string;
  description: string;
  generatedAt: string;
  formulaVersion: string;
}
