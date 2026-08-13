import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type { CoachNutritionContext } from '../../context-builder/coach-nutrition-context.types';

export type NutritionExplainabilityFact =
  | 'availability'
  | 'freshness'
  | 'calorie_progress'
  | 'macro_progress'
  | 'meal_progress'
  | 'adherence'
  | 'focus'
  | 'insight';

export type NutritionCanonicalResponse = {
  text: string;
  factsUsed: readonly NutritionExplainabilityFact[];
  action: CoachNutritionContext['actions'][number];
};

export type NutritionStatus =
  | 'ON_TRACK'
  | 'PARTIAL'
  | 'MISSED'
  | 'NO_PLAN'
  | 'NO_PROFILE'
  | 'UNKNOWN';

export type NutritionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type NutritionConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type MacroAssessmentStatus =
  | 'LOW'
  | 'PARTIAL'
  | 'ON_TARGET'
  | 'EXCEEDED'
  | 'UNKNOWN';

export type MealAssessmentStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'MISSED'
  | 'PENDING'
  | 'UNKNOWN';

export type MealTimingStatus = 'ON_TRACK' | 'BEHIND' | 'AHEAD' | 'UNKNOWN';

export type NutritionGoalAlignment =
  | 'fat_loss'
  | 'muscle_gain'
  | 'maintenance'
  | 'strength'
  | 'endurance'
  | 'unknown';

export type NutritionRecoverySupportLevel =
  | 'SUPPORTIVE'
  | 'PARTIAL'
  | 'INSUFFICIENT'
  | 'UNKNOWN';

export type NutritionRecommendationCode =
  | 'SET_UP_NUTRITION_PROFILE'
  | 'CREATE_OR_REFRESH_NUTRITION_PLAN'
  | 'FOLLOW_TODAYS_NUTRITION_SCHEDULE'
  | 'MAINTAIN_CURRENT_PLAN'
  | 'COMPLETE_REMAINING_MEALS'
  | 'INCREASE_PROTEIN_INTAKE'
  | 'DISTRIBUTE_PROTEIN_MORE_EVENLY'
  | 'PRIORITIZE_POST_WORKOUT_NUTRITION'
  | 'IMPROVE_HYDRATION'
  | 'AVOID_SKIPPING_BREAKFAST'
  | 'REVIEW_CALORIE_INTAKE'
  | 'RESPECT_DIETARY_RESTRICTIONS'
  | 'ADDRESS_ALLERGY_CONFLICTS'
  | 'SUPPORT_RECOVERY_WITH_MEAL_TIMING';

export type NutritionRecommendation = {
  code: NutritionRecommendationCode;
  summary: string;
  reason: string;
  priority: NutritionPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type MacroTargetAssessment = {
  target: number;
  consumed: number;
  delta: number;
  ratio: number | null;
  status: MacroAssessmentStatus;
  summary: string;
};

export type MacroAssessment = {
  calories: MacroTargetAssessment;
  protein: MacroTargetAssessment;
  carbs: MacroTargetAssessment;
  fat: MacroTargetAssessment;
  overallStatus: NutritionStatus;
  adherencePercentage: number;
  summary: string;
};

export type MealAssessmentItem = {
  mealId: string;
  mealType: string;
  title: string;
  status: MealAssessmentStatus;
  logStatus?: string;
  summary: string;
  metadata: Readonly<Record<string, unknown>>;
};

export type MealAssessment = {
  mealTiming: MealTimingStatus;
  mealStatuses: readonly MealAssessmentItem[];
  completedCount: number;
  partialCount: number;
  missedCount: number;
  pendingCount: number;
  totalMeals: number;
  nextMealId?: string | null;
  summary: string;
};

export type NutritionRiskAssessment = {
  level: NutritionPriority;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type NutritionRecoverySupport = {
  level: NutritionRecoverySupportLevel;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type NutritionAnalysis = {
  nutritionStatus: NutritionStatus;
  macroAssessment: MacroAssessment;
  mealAssessment: MealAssessment;
  goalAlignment: NutritionGoalAlignment;
  recoverySupport: NutritionRecoverySupport;
  riskAssessment: NutritionRiskAssessment;
  recommendations: readonly NutritionRecommendation[];
  confidence: NutritionConfidence;
  priority: NutritionPriority;
  signals: readonly string[];
  trainingScheduledToday: boolean;
  restrictionConflicts: number;
  allergyConflicts: number;
  dislikedFoodConflicts: number;
  preferredFoodMatches: number;
  readinessLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  canonicalAvailability?: CoachNutritionContext['availability'];
  canonicalFreshness?: CoachNutritionContext['freshness'];
  canonicalResponse?: NutritionCanonicalResponse;
};

export type NutritionExpertContribution = {
  expertId: string;
  summary: string;
  analysis: NutritionAnalysis;
  recommendations: readonly NutritionRecommendation[];
  risks: readonly NutritionRiskAssessment[];
  goalAlignment: NutritionGoalAlignment;
  recoverySupport: NutritionRecoverySupport;
  confidence: NutritionConfidence;
  priority: NutritionPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type NutritionExpertRequest = CoachExpertRequest;

export type NutritionExpertContext = CoachExpertContext;
