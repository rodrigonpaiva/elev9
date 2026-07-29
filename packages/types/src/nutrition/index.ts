export type NutritionGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';

export type MacroTargets = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealStatus = 'planned' | 'replaced';

export type MealLogStatus = 'consumed' | 'partial' | 'skipped';

export type FoodItem = {
  name: string;
  quantity: string;
  unit?: string;
  estimatedMacros?: MacroTargets;
  tags: string[];
};

export type MealOption = {
  id: string;
  title: string;
  foodItems: FoodItem[];
  estimatedMacros: MacroTargets;
  reason: string;
};

export type Meal = {
  id: string;
  type: MealType;
  title: string;
  description: string;
  foodItems: FoodItem[];
  estimatedMacros: MacroTargets;
  alternatives: MealOption[];
  status: MealStatus;
  replacementHistory?: Array<{
    previousMeal: Omit<Meal, 'replacementHistory'>;
    reason?: string;
    replacedAt: string;
  }>;
};

export type NutritionDay = {
  date: string;
  dayIndex: number;
  meals: Meal[];
  dailyMacroTargets: MacroTargets;
};

export type NutritionPlan = {
  id: string;
  userProfileId: string;
  nutritionProfileId: string;
  fitnessProfileId: string;
  status: 'active' | 'archived' | 'replaced';
  weekStartDate: string;
  weekEndDate: string;
  macroTargets: MacroTargets | null;
  days: NutritionDay[];
  generatedBy: 'deterministic';
  sourceContext?: {
    formulaVersion?: string;
    activityMultiplier?: number;
    goalAdjustment?: number;
  };
  createdAt: string;
  updatedAt?: string;
  replacedAt?: string;
};

export type NutritionProgress = {
  consumedCalories: number;
  consumedProteinGrams: number;
  consumedCarbsGrams: number;
  consumedFatGrams: number;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  adherencePercentage: number;
  /** @deprecated Use adherenceStatus for the neutral canonical status. */
  legacyAdherenceStatus?: 'on_track' | 'needs_attention' | 'off_track';
  adherenceStatus: NutritionAdherenceStatus;
  macroProgress: {
    protein: NutritionMacroProgress;
    carbs: NutritionMacroProgress;
    fat: NutritionMacroProgress;
  };
};

export type NutritionAdherenceStatus =
  | 'unavailable'
  | 'not_started'
  | 'below_range'
  | 'within_range'
  | 'above_range';

export type NutritionMacroProgress = {
  nutrient: 'protein' | 'carbohydrates' | 'fat';
  consumed: number;
  target: number | null;
  remaining: number | null;
  percentage: number | null;
  rawPercentage: number | null;
  unit: 'g';
  state:
    | 'unavailable'
    | 'not_started'
    | 'in_progress'
    | 'near_target'
    | 'target_reached'
    | 'above_target';
};

export type NutritionMealProgress = {
  planned: number;
  available: number;
  completed: number;
  pending: number;
  completionPercentage: number | null;
  nextMealId: string | null;
  additionalLoggedCount: number;
  /** @deprecated Compatibility names retained for current consumers. */
  plannedCount: number;
  consumedCount: number;
  completedCount: number;
  remainingCount: number;
};

export type NutritionCalorieProgress = {
  consumed: number;
  target: number | null;
  remaining: number | null;
  excess: number | null;
  percentage: number | null;
  rawPercentage: number | null;
  state:
    | 'not_started'
    | 'in_progress'
    | 'near_target'
    | 'target_reached'
    | 'above_target';
};

export type NutritionAction =
  | { type: 'open_profile' }
  | { type: 'create_plan' }
  | { type: 'open_today_meals' }
  | { type: 'log_meal'; mealId?: string }
  | { type: 'open_hydration' }
  | { type: 'none' };

export type NutritionFocus = {
  kind:
    | 'configure_profile'
    | 'create_plan'
    | 'log_meal'
    | 'complete_next_meal'
    | 'prioritize_protein'
    | 'maintain_plan'
    | 'review_targets';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action: NutritionAction;
};

export type NutritionInsightKind =
  | 'profile_required'
  | 'plan_required'
  | 'meal_logging_required'
  | 'next_meal_available'
  | 'protein_progress'
  | 'calorie_progress'
  | 'day_on_track'
  | 'targets_unavailable'
  | 'insufficient_data';

export type NutritionInsight = {
  kind: NutritionInsightKind;
  title: string;
  message: string;
  action: NutritionAction;
};

export type NutritionAvailability =
  | 'available'
  | 'insufficient_data'
  | 'not_configured'
  | 'not_available'
  | 'processing_failed';

export type NutritionFreshness = 'current' | 'stale' | 'legacy' | 'unknown';

export type NutritionLog = {
  id: string;
  userProfileId: string;
  nutritionPlanId: string;
  mealId: string;
  date: string;
  mealType: MealType;
  status: MealLogStatus;
  actualMacros?: MacroTargets;
  createdAt: string;
  updatedAt: string;
};

export type NutritionReadModel = {
  availability: NutritionAvailability;
  freshness: NutritionFreshness;
  lastUpdatedAt: string | null;
  timezone: 'UTC';
  date: string;
  macroTargets: MacroTargets | null;
  meals: Meal[];
  progress: NutritionProgress | null;
  targets: MacroTargets | null;
  calories: NutritionCalorieProgress | null;
  macros: NutritionMacroProgress[];
  mealProgress: NutritionMealProgress | null;
  nextMeal: Meal | null;
  focus: NutritionFocus | null;
  insight: NutritionInsight | null;
  /** @deprecated Use focus. */
  nutritionFocus: string | null;
};

/** @deprecated Use NutritionReadModel for the canonical current-day contract. */
export type TodayNutrition = NutritionReadModel;

export type NutritionInfluence =
  | 'LOW_CALORIE_ADHERENCE'
  | 'PROTEIN_TARGET_MISSED'
  | 'SKIPPED_MEALS'
  | 'PARTIAL_MEALS'
  | 'MUSCLE_GAIN_SURPLUS_FOCUS'
  | 'FAT_LOSS_DEFICIT_FOCUS'
  | 'MAINTENANCE_CONSISTENCY_FOCUS'
  | 'NO_LOGS_YET';

export type NutritionContextSnapshot = {
  goal?: NutritionGoal;
  adherenceScore?: number;
  todayNutrition?: {
    mealsLogged: number;
    totalMeals: number;
    caloriesPercent: number;
    proteinPercent: number;
  };
  trainingDay?: {
    hasWorkoutToday: boolean;
    intensity?: 'low' | 'moderate' | 'high';
  };
  recovery?: {
    fatigueLevel?: 'LOW' | 'MODERATE' | 'HIGH';
    latestCheckIn?: {
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
    };
  };
};

export type NutritionRecommendation = {
  id?: string;
  userProfileId?: string;
  message: string;
  recommendations: string[];
  influences: NutritionInfluence[];
  generatorVersion: string;
  contextSnapshot: NutritionContextSnapshot;
  createdAt?: string;
};

export type CreateNutritionProfileRequest = {
  goal: NutritionGoal;
  mealsPerDay: number;
  dietaryRestrictions?: string[];
  allergies?: string[];
  dislikedFoods?: string[];
  preferredFoods?: string[];
};

export type CreateNutritionProfileResponse = {
  nutritionProfile: {
    id: string;
    userProfileId: string;
    goal: NutritionGoal;
    mealsPerDay: number;
    dietaryRestrictions: string[];
    allergies: string[];
    dislikedFoods: string[];
    preferredFoods: string[];
    status: 'active';
    createdAt: string;
    updatedAt: string;
  };
};

export type GetNutritionProfileResponse = CreateNutritionProfileResponse;

export type CalculateMacroTargetsResponse = {
  macroTargets: MacroTargets & {
    formulaVersion: string;
    activityMultiplier: number;
    goalAdjustment: number;
    calculatedAt: string;
  };
};

export type CreateNutritionPlanResponse = {
  nutritionPlan: NutritionPlan;
};

export type GetCurrentNutritionPlanResponse = {
  nutritionPlan: NutritionPlan;
};

export type GetTodayNutritionResponse = {
  todayNutrition: NutritionReadModel;
};

export type ReplaceMealRequest = {
  reason?: string;
};

export type ReplaceMealResponse = {
  meal: Meal;
  replacement: {
    previousMeal: Meal;
    reason?: string;
    replacedAt: string;
  };
};

export type LogMealRequest = {
  mealId: string;
  date?: string;
  status: MealLogStatus;
  actualMacros?: MacroTargets;
};

export type LogMealResponse = {
  nutritionLog: NutritionLog;
};

export type GenerateNutritionRecommendationResponse = {
  nutritionRecommendation: NutritionRecommendation;
};

export type GetNutritionRecommendationsResponse = {
  recommendations: NutritionRecommendation[];
};

export type NutritionHistoryAvailability =
  | 'available'
  | 'partial'
  | 'no_data'
  | 'not_configured'
  | 'legacy'
  | 'not_available'
  | 'processing_failed';

export type NutritionHistoryDataQuality =
  | 'complete'
  | 'partial'
  | 'legacy'
  | 'unknown';

export type NutritionHistorySource =
  | 'snapshot'
  | 'reconstructed'
  | 'legacy_projection';

export type NutritionHistoryDayReadModel = {
  date: string;
  timezone: 'UTC';
  availability: NutritionHistoryAvailability;
  dataQuality: NutritionHistoryDataQuality;
  freshness: NutritionFreshness;
  calories: NutritionCalorieProgress | null;
  macros: NutritionMacroProgress[];
  mealProgress: NutritionMealProgress | null;
  adherenceStatus: NutritionAdherenceStatus;
  focus: NutritionFocus | null;
  insight: NutritionInsight | null;
  source: NutritionHistorySource;
  contractVersion: 'nutrition-history-v1';
};

export type NutritionHistoryDaySummary = Pick<
  NutritionHistoryDayReadModel,
  'date' | 'availability' | 'dataQuality' | 'adherenceStatus'
> & {
  calories: Pick<NutritionCalorieProgress, 'state' | 'percentage'> | null;
  meals: Pick<NutritionMealProgress, 'completed' | 'planned'> | null;
};

export type NutritionHistoryPage = {
  items: NutritionHistoryDaySummary[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
  period: {
    from: string;
    to: string;
    timezone: 'UTC';
  };
  contractVersion: 'nutrition-history-v1';
};

export type NutritionTrendSeriesPoint = {
  date: string;
  value: number | null;
};

export type NutritionTrendSeries = {
  unit: 'percentage' | 'meals';
  points: NutritionTrendSeriesPoint[];
};

export type NutritionAdherenceDistribution = {
  notStarted: number;
  belowRange: number;
  withinRange: number;
  aboveRange: number;
  unavailable: number;
};

export type NutritionTrendReadModel = {
  period: {
    from: string;
    to: string;
    timezone: 'UTC';
  };
  coverage: {
    expectedDays: number;
    availableDays: number;
    partialDays: number;
    missingDays: number;
  };
  calorieProgress: NutritionTrendSeries | null;
  mealProgress: NutritionTrendSeries | null;
  adherenceDistribution: NutritionAdherenceDistribution;
  dataQuality: NutritionHistoryDataQuality;
  contractVersion: 'nutrition-history-v1';
};

export type GetNutritionHistoryResponse = NutritionHistoryPage;

export type GetNutritionHistoryDayResponse = {
  day: NutritionHistoryDayReadModel;
};

export type GetNutritionTrendsResponse = {
  trends: NutritionTrendReadModel;
};
