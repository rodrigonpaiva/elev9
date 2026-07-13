import type {
  MealType,
  MealLogStatus,
} from '../../../../../nutrition/domain/entities/meal.entity';
import type { NutritionLog } from '../../../../../nutrition/domain/entities/nutrition-log.entity';
import type { NutritionPlan } from '../../../../../nutrition/domain/entities/nutrition-plan.entity';
import type { MacroTargetsProps } from '../../../../../nutrition/domain/value-objects/macro-targets.value-object';
import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type { UserHealthContext } from '../../context-builder/build-user-health-context.service';

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
  mealType: MealType;
  title: string;
  status: MealAssessmentStatus;
  logStatus?: MealLogStatus;
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
  nutritionProfilePresent: boolean;
  nutritionPlanPresent: boolean;
  todayNutritionPresent: boolean;
  trainingScheduledToday: boolean;
  restrictionConflicts: number;
  allergyConflicts: number;
  dislikedFoodConflicts: number;
  preferredFoodMatches: number;
  readinessLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
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

export type NutritionExpertAnalysis = {
  request: NutritionExpertRequest;
  context: NutritionExpertContext;
  healthContext: UserHealthContext;
  analysis: NutritionAnalysis;
  contribution: NutritionExpertContribution;
  result: CoachExpertResult;
};

export type NutritionMealSnapshot = {
  mealId: string;
  mealType: MealType;
  title: string;
  estimatedMacros: MacroTargetsProps;
  status: MealAssessmentStatus;
  logStatus?: MealLogStatus;
};

export type NutritionMacroSnapshot = {
  consumed: number;
  target: number;
  ratio: number | null;
  status: MacroAssessmentStatus;
};

export type NutritionPlanSnapshot = Pick<
  NutritionPlan,
  'id' | 'weekStartDate' | 'weekEndDate' | 'macroTargets' | 'generatedBy'
> & {
  status: NutritionPlan['status'];
};

export type NutritionGoalSignal = 'fat_loss' | 'muscle_gain' | 'maintenance';
