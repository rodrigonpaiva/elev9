import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';

export type ProgressStatus =
  | 'EXCELLENT'
  | 'GOOD'
  | 'STABLE'
  | 'PLATEAU'
  | 'DECLINING'
  | 'REGRESSION'
  | 'UNKNOWN';

export type ProgressTrend =
  | 'STRONGLY_IMPROVING'
  | 'IMPROVING'
  | 'STABLE'
  | 'DECLINING'
  | 'REGRESSING'
  | 'UNKNOWN';

export type ProgressMomentum =
  | 'HIGH'
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'NEGATIVE'
  | 'VERY_NEGATIVE'
  | 'UNKNOWN';

export type ProgressPlateau =
  | 'NONE'
  | 'SHORT'
  | 'MODERATE'
  | 'LONG'
  | 'UNKNOWN';

export type ProgressRegression =
  | 'NONE'
  | 'MINOR'
  | 'MODERATE'
  | 'SEVERE'
  | 'UNKNOWN';

export type ProgressConsistencyLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type ProgressRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProgressConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type ProgressPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProgressRecommendationCode =
  | 'MAINTAIN_CURRENT_PROGRESSION'
  | 'INCREASE_PROGRESSIVE_OVERLOAD'
  | 'REVIEW_TRAINING_PROGRESSION'
  | 'IMPROVE_WEEKLY_CONSISTENCY'
  | 'REDUCE_INACTIVITY'
  | 'BREAK_CURRENT_PLATEAU'
  | 'MAINTAIN_CURRENT_MOMENTUM'
  | 'FOCUS_ON_LONG_TERM_CONSISTENCY'
  | 'IMPROVE_RECOVERY_CONSISTENCY'
  | 'REBUILD_BASELINE_ROUTINE'
  | 'STABILIZE_NUTRITION_AND_RECOVERY';

export type ProgressRecommendation = {
  code: ProgressRecommendationCode;
  summary: string;
  reason: string;
  priority: ProgressPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type ProgressTrendAssessment = {
  trend: ProgressTrend;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type ProgressMomentumAssessment = {
  momentum: ProgressMomentum;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type ProgressPlateauAssessment = {
  plateau: ProgressPlateau;
  durationDays: number | null;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type ProgressRegressionAssessment = {
  regression: ProgressRegression;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type ProgressConsistencyAssessment = {
  weeklyConsistency: ProgressConsistencyLevel;
  monthlyConsistency: ProgressConsistencyLevel;
  historicalConsistency: ProgressConsistencyLevel;
  overallConsistency: ProgressConsistencyLevel;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type ProgressRiskAssessment = {
  level: ProgressRiskLevel;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type ProgressAnalysis = {
  overallProgress: ProgressStatus;
  trend: ProgressTrendAssessment;
  momentum: ProgressMomentumAssessment;
  plateau: ProgressPlateauAssessment;
  regression: ProgressRegressionAssessment;
  consistency: ProgressConsistencyAssessment;
  recommendations: readonly ProgressRecommendation[];
  risks: readonly ProgressRiskAssessment[];
  confidence: ProgressConfidence;
  summary: string;
  recentWorkoutCount: number;
  monthlyWorkoutCount: number;
  weeklyWorkoutAdherence: number | null;
  monthlyWorkoutAdherence: number | null;
  inactivityDays: number | null;
  historyCount: number;
  checkInHistoryCount: number;
  sourceCoverage: Readonly<{
    progressSummaryPresent: boolean;
    workoutHistoryPresent: boolean;
    checkInHistoryPresent: boolean;
    workoutExpertPresent: boolean;
    nutritionExpertPresent: boolean;
    recoveryExpertPresent: boolean;
    goalExpertPresent: boolean;
    habitExpertPresent: boolean;
  }>;
};

export type ProgressExpertContribution = {
  expertId: string;
  summary: string;
  analysis: ProgressAnalysis;
  overallProgress: ProgressStatus;
  trend: ProgressTrendAssessment;
  momentum: ProgressMomentumAssessment;
  plateau: ProgressPlateauAssessment;
  regression: ProgressRegressionAssessment;
  consistency: ProgressConsistencyAssessment;
  recommendations: readonly ProgressRecommendation[];
  risks: readonly ProgressRiskAssessment[];
  confidence: ProgressConfidence;
  metadata: Readonly<Record<string, unknown>>;
};

export type ProgressExpertRequest = CoachExpertRequest;
export type ProgressExpertContext = CoachExpertContext;
export type ProgressExpertResult = CoachExpertResult;

export type ProgressRuntimeExpertSnapshot = {
  expertId: string;
  overallProgress: ProgressStatus;
  trend: ProgressTrend;
  momentum: ProgressMomentum;
  plateau: ProgressPlateau;
  regression: ProgressRegression;
  consistency: ProgressConsistencyLevel;
  riskLevel: ProgressRiskLevel;
  confidence: ProgressConfidence;
  recommendationCodes: readonly ProgressRecommendationCode[];
};
