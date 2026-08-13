import type { HabitSnapshot } from '../../../../../habits/domain/entities/habit-snapshot.entity';
import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';

export type HabitStatus =
  | 'EXCELLENT'
  | 'GOOD'
  | 'INCONSISTENT'
  | 'POOR'
  | 'BROKEN'
  | 'UNKNOWN';

export type HabitConsistencyLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type HabitPatternCode =
  | 'IMPROVING_CONSISTENCY'
  | 'DECLINING_CONSISTENCY'
  | 'WEEKEND_ONLY_ADHERENCE'
  | 'REPEATED_MISSED_DAYS'
  | 'REPEATED_SKIPPED_WORKOUTS'
  | 'IRREGULAR_RECOVERY'
  | 'IRREGULAR_NUTRITION'
  | 'INACTIVITY_PERIODS'
  | 'BROKEN_STREAKS';

export type HabitTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'UNKNOWN';

export type HabitRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type HabitConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type HabitPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type HabitRecommendationCode =
  | 'MAINTAIN_CURRENT_ROUTINE'
  | 'IMPROVE_DAILY_CONSISTENCY'
  | 'REDUCE_SKIPPED_DAYS'
  | 'REBUILD_WORKOUT_ROUTINE'
  | 'RE_ESTABLISH_NUTRITION_CONSISTENCY'
  | 'FOCUS_ON_ONE_HABIT_AT_A_TIME'
  | 'REDUCE_INACTIVITY_PERIODS'
  | 'MAINTAIN_CURRENT_STREAK'
  | 'RECOVER_CONSISTENCY_BEFORE_INCREASING_WORKLOAD'
  | 'RESTORE_WEEKLY_RHYTHM';

export type HabitRecommendation = {
  code: HabitRecommendationCode;
  summary: string;
  reason: string;
  priority: HabitPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type HabitConsistencyAssessment = {
  dailyConsistency: HabitConsistencyLevel;
  weeklyConsistency: HabitConsistencyLevel;
  monthlyConsistency: HabitConsistencyLevel;
  streakQuality: HabitConsistencyLevel;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type HabitPatternAssessment = {
  patterns: readonly HabitPatternCode[];
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type HabitTrendAssessment = {
  trend: HabitTrend;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type HabitRiskAssessment = {
  level: HabitRiskLevel;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type HabitCrossDomainInterpretation = {
  workoutConsistency: HabitConsistencyLevel;
  nutritionConsistency: HabitConsistencyLevel;
  recoveryConsistency: HabitConsistencyLevel;
  goalConsistency: HabitConsistencyLevel;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type HabitAnalysis = {
  habitStatus: HabitStatus;
  consistency: HabitConsistencyAssessment;
  patterns: HabitPatternAssessment;
  trend: HabitTrendAssessment;
  recommendations: readonly HabitRecommendation[];
  risks: readonly HabitRiskAssessment[];
  confidence: HabitConfidence;
  summary: string;
  activeHabitCount: number;
  completedHabitCount: number;
  missedHabitCount: number;
  skippedHabitCount: number;
  currentStreak: number;
  longestStreak: number;
  weeklyAdherence: number | null;
  monthlyAdherence: number | null;
  inactivityDays: number | null;
  recentHistoryCount: number;
  sourceCoverage: Readonly<{
    currentHabitPresent: boolean;
    habitHistoryPresent: boolean;
    habitSummaryPresent: boolean;
    expertSignalsPresent: boolean;
  }>;
  crossDomain: HabitCrossDomainInterpretation;
};

export type HabitExpertContribution = {
  expertId: string;
  summary: string;
  analysis: HabitAnalysis;
  habitStatus: HabitStatus;
  consistency: HabitConsistencyAssessment;
  patterns: HabitPatternAssessment;
  trend: HabitTrendAssessment;
  recommendations: readonly HabitRecommendation[];
  risks: readonly HabitRiskAssessment[];
  confidence: HabitConfidence;
  metadata: Readonly<Record<string, unknown>>;
};

export type HabitExpertRequest = CoachExpertRequest;

export type HabitExpertContext = CoachExpertContext;

export type HabitExpertResult = CoachExpertResult;

export type HabitExpertAnalysis = {
  request: HabitExpertRequest;
  context: HabitExpertContext;
  analysis: HabitAnalysis;
  contribution: HabitExpertContribution;
  result: CoachExpertResult;
};

export type HabitRuntimeExpertSnapshot = {
  expertId: string;
  habitStatus: HabitStatus;
  consistency: HabitConsistencyLevel;
  trend: HabitTrend;
  riskLevel: HabitRiskLevel;
  confidence: HabitConfidence;
  recommendationCodes: readonly HabitRecommendationCode[];
  patternCodes: readonly HabitPatternCode[];
};

export type HabitHistorySnapshot = HabitSnapshot;
