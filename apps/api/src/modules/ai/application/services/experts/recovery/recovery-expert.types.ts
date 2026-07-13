import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type { RecoverySnapshot } from '../../../../../recovery/domain/entities/recovery-snapshot.entity';
import type { UserHealthContext } from '../../context-builder/build-user-health-context.service';

export type RecoveryStatus =
  | 'OPTIMAL'
  | 'GOOD'
  | 'MODERATE'
  | 'POOR'
  | 'CRITICAL'
  | 'UNKNOWN';

export type RecoveryPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecoveryConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type RecoveryTrendAssessment =
  | 'IMPROVING'
  | 'STABLE'
  | 'DECLINING'
  | 'UNKNOWN';

export type RecoveryTrainingImpact =
  | 'FULL_SESSION'
  | 'REDUCED_VOLUME'
  | 'REDUCED_INTENSITY'
  | 'TECHNIQUE_ONLY'
  | 'ACTIVE_RECOVERY'
  | 'FULL_REST';

export type RecoveryNutritionSupportLevel =
  | 'SUPPORTIVE'
  | 'PARTIAL'
  | 'INSUFFICIENT'
  | 'UNKNOWN';

export type RecoveryGoalAlignment =
  | 'fat_loss'
  | 'muscle_gain'
  | 'maintenance'
  | 'endurance'
  | 'strength'
  | 'unknown';

export type RecoveryRecommendationCode =
  | 'PROCEED_WITH_TODAYS_SESSION'
  | 'REDUCE_TODAYS_VOLUME'
  | 'REDUCE_TODAYS_INTENSITY'
  | 'PRIORITIZE_RECOVERY'
  | 'COMPLETE_MOBILITY_WORK'
  | 'TAKE_FULL_RECOVERY_DAY'
  | 'MAINTAIN_RECOVERY_ROUTINE'
  | 'IMPROVE_SLEEP_CONSISTENCY'
  | 'PRIORITIZE_HYDRATION'
  | 'USE_TECHNIQUE_ONLY';

export type RecoveryRecommendation = {
  code: RecoveryRecommendationCode;
  summary: string;
  reason: string;
  priority: RecoveryPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type RecoveryReadinessAssessment = {
  score: number | null;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  recommendedIntensity: RecoverySnapshot['recommendedIntensity'] | null;
  fatigueScore: number | null;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type RecoveryTrendAssessmentShape = {
  trend: RecoveryTrendAssessment;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type TrainingImpactAssessment = {
  impact: RecoveryTrainingImpact;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type RecoveryRiskAssessment = {
  level: RecoveryPriority;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type RecoveryAnalysis = {
  recoveryStatus: RecoveryStatus;
  readiness: RecoveryReadinessAssessment;
  trend: RecoveryTrendAssessmentShape;
  trainingImpact: TrainingImpactAssessment;
  nutritionSupport: {
    level: RecoveryNutritionSupportLevel;
    summary: string;
    factors: readonly string[];
    metadata: Readonly<Record<string, unknown>>;
  };
  goalAlignment: RecoveryGoalAlignment;
  recommendations: readonly RecoveryRecommendation[];
  risks: readonly RecoveryRiskAssessment[];
  confidence: RecoveryConfidence;
  priority: RecoveryPriority;
  signals: readonly string[];
  recoverySnapshotPresent: boolean;
  recoveryHistoryCount: number;
  recentWorkoutCount: number;
  sleepQuality: number | null;
  muscleSoreness: number | null;
  readinessScore: number | null;
  fatigueScore: number | null;
  recommendedIntensity: RecoverySnapshot['recommendedIntensity'] | null;
};

export type RecoveryExpertContribution = {
  expertId: string;
  summary: string;
  analysis: RecoveryAnalysis;
  recommendations: readonly RecoveryRecommendation[];
  risks: readonly RecoveryRiskAssessment[];
  recoveryStatus: RecoveryStatus;
  readiness: RecoveryReadinessAssessment;
  trend: RecoveryTrendAssessmentShape;
  trainingImpact: TrainingImpactAssessment;
  nutritionSupport: RecoveryAnalysis['nutritionSupport'];
  goalAlignment: RecoveryGoalAlignment;
  confidence: RecoveryConfidence;
  priority: RecoveryPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type RecoveryExpertRequest = CoachExpertRequest;

export type RecoveryExpertContext = CoachExpertContext;

export type RecoveryExpertResult = CoachExpertResult;

export type RecoveryExpertAnalysis = {
  request: RecoveryExpertRequest;
  context: RecoveryExpertContext;
  healthContext: UserHealthContext;
  analysis: RecoveryAnalysis;
  contribution: RecoveryExpertContribution;
  result: RecoveryExpertResult;
};
