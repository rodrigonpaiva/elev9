import { Meal } from '../../../domain/entities/meal.entity';
import { MacroTargetsProps } from '../../../domain/value-objects/macro-targets.value-object';

export type TodayNutritionProgressOutput = {
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
    protein: NutritionMacroProgressOutput;
    carbs: NutritionMacroProgressOutput;
    fat: NutritionMacroProgressOutput;
  };
};

export type NutritionMacroProgressOutput = {
  consumed: number;
  target: number;
  percentage: number;
};

export type GetTodayNutritionOutput = {
  todayNutrition: {
    availability: 'available';
    freshness: 'current' | 'stale' | 'legacy' | 'unknown';
    lastUpdatedAt: string | null;
    timezone: 'UTC';
    date: string;
    macroTargets: MacroTargetsProps;
    meals: Meal[];
    progress: TodayNutritionProgressOutput;
    mealProgress: {
      plannedCount: number;
      consumedCount: number;
      completedCount: number;
      remainingCount: number;
    };
    nextMeal: Meal | null;
    nutritionFocus: string;
  };
};
