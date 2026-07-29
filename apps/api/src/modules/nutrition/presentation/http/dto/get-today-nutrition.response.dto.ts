type MacroTargetsDto = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

type FoodItemDto = {
  name: string;
  quantity: string;
  unit?: string;
  estimatedMacros?: MacroTargetsDto;
  tags: string[];
};

type MealOptionDto = {
  id: string;
  title: string;
  foodItems: FoodItemDto[];
  estimatedMacros: MacroTargetsDto;
  reason: string;
};

type MealDto = {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  description: string;
  foodItems: FoodItemDto[];
  estimatedMacros: MacroTargetsDto;
  alternatives: MealOptionDto[];
  status: 'planned' | 'replaced';
};

export class GetTodayNutritionResponseDto {
  todayNutrition!: {
    availability:
      | 'available'
      | 'not_configured'
      | 'insufficient_data'
      | 'not_available'
      | 'processing_failed';
    freshness: 'current' | 'stale' | 'legacy' | 'unknown';
    lastUpdatedAt: string | null;
    timezone: 'UTC';
    date: string;
    macroTargets: MacroTargetsDto | null;
    targets: MacroTargetsDto | null;
    meals: MealDto[];
    progress: {
      consumedCalories: number;
      consumedProteinGrams: number;
      consumedCarbsGrams: number;
      consumedFatGrams: number;
      targetCalories: number;
      targetProteinGrams: number;
      targetCarbsGrams: number;
      targetFatGrams: number;
      adherencePercentage: number;
      adherenceStatus:
        | 'unavailable'
        | 'not_started'
        | 'below_range'
        | 'within_range'
        | 'above_range';
      macroProgress: {
        protein: {
          nutrient: 'protein' | 'carbohydrates' | 'fat';
          consumed: number;
          target: number | null;
          remaining: number | null;
          percentage: number | null;
          rawPercentage: number | null;
          unit: 'g';
          state: string;
        };
        carbs: {
          nutrient: 'protein' | 'carbohydrates' | 'fat';
          consumed: number;
          target: number | null;
          remaining: number | null;
          percentage: number | null;
          rawPercentage: number | null;
          unit: 'g';
          state: string;
        };
        fat: {
          nutrient: 'protein' | 'carbohydrates' | 'fat';
          consumed: number;
          target: number | null;
          remaining: number | null;
          percentage: number | null;
          rawPercentage: number | null;
          unit: 'g';
          state: string;
        };
      };
    } | null;
    calories: {
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
    } | null;
    macros: Array<{
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
    }>;
    mealProgress: {
      planned: number;
      available: number;
      completed: number;
      pending: number;
      completionPercentage: number | null;
      nextMealId: string | null;
      additionalLoggedCount: number;
      plannedCount: number;
      consumedCount: number;
      completedCount: number;
      remainingCount: number;
    } | null;
    nextMeal: MealDto | null;
    focus: {
      kind: string;
      title: string;
      message: string;
      priority: 'low' | 'medium' | 'high';
      action: Record<string, unknown>;
    } | null;
    insight: {
      kind: string;
      title: string;
      message: string;
      action: Record<string, unknown>;
    } | null;
    actions: Array<Record<string, unknown>>;
    nutritionFocus: string | null;
  };
}
