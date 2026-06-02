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
};

export type GetTodayNutritionOutput = {
  todayNutrition: {
    date: string;
    macroTargets: MacroTargetsProps;
    meals: Meal[];
    progress: TodayNutritionProgressOutput;
    nextMeal: Meal | null;
    nutritionFocus: string;
  };
};
