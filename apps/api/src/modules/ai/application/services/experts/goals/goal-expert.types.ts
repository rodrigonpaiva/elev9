import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';

export type GoalStatus =
  | 'ON_TRACK'
  | 'SLIGHTLY_BEHIND'
  | 'BEHIND'
  | 'AT_RISK'
  | 'COMPLETED'
  | 'UNKNOWN';

export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type GoalConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type GoalTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'UNKNOWN';

export type GoalForecastStatus =
  | 'LIKELY'
  | 'UNCERTAIN'
  | 'UNLIKELY'
  | 'UNKNOWN';

export type GoalConsistencyLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type GoalRecommendationCode =
  | 'MAINTAIN_CURRENT_STRATEGY'
  | 'INCREASE_WEEKLY_CONSISTENCY'
  | 'IMPROVE_WORKOUT_ADHERENCE'
  | 'IMPROVE_NUTRITION_ADHERENCE'
  | 'PRIORITIZE_RECOVERY'
  | 'FOCUS_ON_NEXT_MILESTONE'
  | 'REVIEW_TRAINING_FREQUENCY'
  | 'REDUCE_INACTIVITY_PERIODS'
  | 'STAY_CONSISTENT_WITH_CURRENT_PLAN';

export type GoalRecommendation = {
  code: GoalRecommendationCode;
  summary: string;
  reason: string;
  priority: GoalPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type GoalProgressAssessment = {
  completionPercentage: number | null;
  currentValue: number | null;
  targetValue: number | null;
  trend: GoalTrend;
  progressDelta: number | null;
  historyCount: number;
  daysSinceLatestProgress: number | null;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type GoalForecast = {
  status: GoalForecastStatus;
  confidence: GoalConfidence;
  predictedCompletionDate?: string | null;
  estimatedDaysRemaining: number | null;
  daysUntilDeadline: number | null;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type GoalMilestoneSnapshot = {
  title: string;
  targetValue: number;
  achieved: boolean;
  achievedAt?: string | null;
};

export type GoalMilestoneAssessment = {
  completedMilestones: readonly GoalMilestoneSnapshot[];
  remainingMilestones: readonly GoalMilestoneSnapshot[];
  blockedMilestones: readonly GoalMilestoneSnapshot[];
  nextMilestone: GoalMilestoneSnapshot | null;
  completionPercentage: number | null;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type GoalConsistencyAssessment = {
  workoutConsistency: GoalConsistencyLevel;
  nutritionConsistency: GoalConsistencyLevel;
  recoveryConsistency: GoalConsistencyLevel;
  overallConsistency: GoalConsistencyLevel;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type GoalRiskAssessment = {
  level: GoalPriority;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type GoalAnalysis = {
  goalStatus: GoalStatus;
  progressAssessment: GoalProgressAssessment;
  forecast: GoalForecast;
  milestoneAssessment: GoalMilestoneAssessment;
  consistency: GoalConsistencyAssessment;
  recommendations: readonly GoalRecommendation[];
  risks: readonly GoalRiskAssessment[];
  confidence: GoalConfidence;
  signals: readonly string[];
  activeGoalPresent: boolean;
  progressSnapshotPresent: boolean;
  historyCount: number;
  milestoneCount: number;
  achievementCount: number;
  goalType?: string;
  goalTargetDate?: string | null;
};

export type GoalExpertContribution = {
  expertId: string;
  summary: string;
  analysis: GoalAnalysis;
  recommendations: readonly GoalRecommendation[];
  risks: readonly GoalRiskAssessment[];
  goalStatus: GoalStatus;
  progressAssessment: GoalProgressAssessment;
  forecast: GoalForecast;
  milestoneAssessment: GoalMilestoneAssessment;
  consistency: GoalConsistencyAssessment;
  confidence: GoalConfidence;
  priority: GoalPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type GoalExpertRequest = CoachExpertRequest;

export type GoalExpertContext = CoachExpertContext;

export type GoalExpertResult = CoachExpertResult;

export type GoalExpertAnalysis = {
  request: GoalExpertRequest;
  context: GoalExpertContext;
  analysis: GoalAnalysis;
  contribution: GoalExpertContribution;
  result: GoalExpertResult;
};

export type GoalGoalSnapshot = {
  progressPercentage: number;
  date: string;
};

export type GoalRuntimeExpertSnapshot = {
  trainingStatus?: string;
  nutritionStatus?: string;
  recoveryStatus?: string;
  goalAlignment?: string;
  confidence?: string;
  riskLevel?: string;
  recommendationCodes?: readonly string[];
};
