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
    availability: 'available';
    freshness: 'current' | 'stale' | 'legacy' | 'unknown';
    lastUpdatedAt: string | null;
    timezone: 'UTC';
    date: string;
    macroTargets: MacroTargetsDto;
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
      adherenceStatus: 'on_track' | 'needs_attention' | 'off_track';
      macroProgress: {
        protein: { consumed: number; target: number; percentage: number };
        carbs: { consumed: number; target: number; percentage: number };
        fat: { consumed: number; target: number; percentage: number };
      };
    };
    mealProgress: {
      plannedCount: number;
      consumedCount: number;
      completedCount: number;
      remainingCount: number;
    };
    nextMeal: MealDto | null;
    nutritionFocus: string;
  };
}
