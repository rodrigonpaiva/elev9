import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';

export type MotivationState =
  | 'HIGHLY_ENGAGED'
  | 'ENGAGED'
  | 'STABLE'
  | 'NEEDS_SUPPORT'
  | 'DISENGAGING'
  | 'UNKNOWN';

export type MotivationOpportunity =
  | 'RECENT_ACHIEVEMENT'
  | 'STREAK_EXTENSION'
  | 'MILESTONE_CLOSE'
  | 'GOAL_PROGRESS'
  | 'COMEBACK'
  | 'CONSISTENCY'
  | 'PLATEAU_BREAK'
  | 'RECOVERY_SUCCESS'
  | 'NONE';

export type MotivationStrategy =
  | 'REINFORCE_PROGRESS'
  | 'CELEBRATE_CONSISTENCY'
  | 'FOCUS_NEXT_STEP'
  | 'REBUILD_ROUTINE'
  | 'ENCOURAGE_COMEBACK'
  | 'HIGHLIGHT_IMPROVEMENT'
  | 'PROMOTE_RECOVERY'
  | 'REDUCE_OVERLOAD'
  | 'MAINTAIN_MOMENTUM';

export type MotivationRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MotivationConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type MotivationRecommendationCode =
  | 'ACKNOWLEDGE_RECENT_PROGRESS'
  | 'HIGHLIGHT_NEXT_MILESTONE'
  | 'REINFORCE_DAILY_ROUTINE'
  | 'ENCOURAGE_SMALL_WINS'
  | 'FOCUS_ON_RECOVERY'
  | 'PROMOTE_CONSISTENCY'
  | 'REDUCE_EXPECTATIONS'
  | 'MAINTAIN_CURRENT_PATH'
  | 'REBUILD_FOUNDATION'
  | 'MAINTAIN_CURRENT_MOMENTUM';

export type MotivationRecommendation = {
  code: MotivationRecommendationCode;
  metadata: Readonly<Record<string, unknown>>;
};

export type MotivationEvidenceCode =
  | 'RECENT_ACHIEVEMENT'
  | 'MILESTONE_CLOSE'
  | 'COMEBACK_AFTER_INACTIVITY'
  | 'STREAK_EXTENSION'
  | 'GOAL_PROGRESS_IMPROVING'
  | 'GOAL_PROGRESS_STABLE'
  | 'GOAL_PROGRESS_DECLINING'
  | 'CONSISTENCY_STRONG'
  | 'CONSISTENCY_WEAK'
  | 'PLATEAU_ACTIVE'
  | 'REGRESSION_ACTIVE'
  | 'LONG_INACTIVITY'
  | 'WORKOUT_CONSISTENT'
  | 'WORKOUT_INCONSISTENT'
  | 'NUTRITION_CONSISTENT'
  | 'NUTRITION_INCONSISTENT'
  | 'RECOVERY_IMPROVING'
  | 'RECOVERY_LIMITED'
  | 'HABIT_STRONG'
  | 'HABIT_WEAK'
  | 'CHECKIN_MOTIVATION_HIGH'
  | 'CHECKIN_MOTIVATION_LOW';

export type MotivationSupportingEvidence = {
  code: MotivationEvidenceCode;
  source: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type MotivationRiskAssessment = {
  level: MotivationRisk;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type MotivationAnalysis = {
  summary: string;
  motivationState: MotivationState;
  motivationOpportunity: MotivationOpportunity;
  strategy: MotivationStrategy;
  recommendations: readonly MotivationRecommendation[];
  risk: MotivationRiskAssessment;
  confidence: MotivationConfidence;
  supportingEvidence: readonly MotivationSupportingEvidence[];
  recentAchievementCount: number;
  inactivityDays: number | null;
  currentStreak: number;
  longestStreak: number;
  weeklyAdherence: number | null;
  monthlyAdherence: number | null;
  goalProgressPercentage: number | null;
  goalStatus: string;
  goalForecastStatus: string;
  progressTrend: string;
  progressMomentum: string;
  progressPlateau: string;
  progressRegression: string;
  habitStatus: string;
  workoutStatus: string;
  nutritionStatus: string;
  recoveryStatus: string;
  checkInMotivationLevel: number | null;
  sourceCoverage: Readonly<{
    healthContextPresent: boolean;
    goalContextPresent: boolean;
    progressContextPresent: boolean;
    habitContextPresent: boolean;
    workoutExpertPresent: boolean;
    nutritionExpertPresent: boolean;
    recoveryExpertPresent: boolean;
    goalExpertPresent: boolean;
    habitExpertPresent: boolean;
    progressExpertPresent: boolean;
    latestCheckInPresent: boolean;
  }>;
};

export type MotivationExpertContribution = {
  expertId: string;
  summary: string;
  analysis: MotivationAnalysis;
  motivationState: MotivationState;
  motivationOpportunity: MotivationOpportunity;
  strategy: MotivationStrategy;
  recommendations: readonly MotivationRecommendation[];
  risk: MotivationRiskAssessment;
  confidence: MotivationConfidence;
  supportingEvidence: readonly MotivationSupportingEvidence[];
  metadata: Readonly<Record<string, unknown>>;
};

export type MotivationRuntimeExpertSnapshot = {
  expertId: string;
  motivationState: MotivationState;
  motivationOpportunity: MotivationOpportunity;
  strategy: MotivationStrategy;
  riskLevel: MotivationRisk;
  confidence: MotivationConfidence;
  recommendationCodes: readonly MotivationRecommendationCode[];
  evidenceCodes: readonly MotivationEvidenceCode[];
};

export type MotivationExpertRequest = CoachExpertRequest;

export type MotivationExpertContext = CoachExpertContext;

export type MotivationExpertResult = CoachExpertResult;

export type MotivationExpertAnalysis = {
  request: MotivationExpertRequest;
  context: MotivationExpertContext;
  analysis: MotivationAnalysis;
  contribution: MotivationExpertContribution;
  result: MotivationExpertResult;
};
