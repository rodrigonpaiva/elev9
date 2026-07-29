import { Meal } from '../../../domain/entities/meal.entity';
import { MacroTargetsProps } from '../../../domain/value-objects/macro-targets.value-object';
import {
  NutritionEngineAction,
  NutritionEngineAdherenceStatus,
  NutritionEngineCalorieProgress,
  NutritionEngineFocus,
  NutritionEngineInsight,
  NutritionEngineMacroProgress,
} from '../../services/nutrition-deterministic-engine.service';

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
  adherenceStatus: NutritionEngineAdherenceStatus;
  legacyAdherenceStatus?: 'on_track' | 'needs_attention' | 'off_track';
  macroProgress: {
    protein: NutritionMacroProgressOutput;
    carbs: NutritionMacroProgressOutput;
    fat: NutritionMacroProgressOutput;
  };
};

export type NutritionMacroProgressOutput = {
  nutrient: NutritionEngineMacroProgress['nutrient'];
  consumed: number;
  target: number | null;
  remaining: number | null;
  percentage: number | null;
  rawPercentage: number | null;
  unit: 'g';
  state: NutritionEngineMacroProgress['state'];
};

export type GetTodayNutritionOutput = {
  todayNutrition: {
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
    macroTargets: MacroTargetsProps | null;
    meals: Meal[];
    progress: TodayNutritionProgressOutput | null;
    targets: MacroTargetsProps | null;
    calories: NutritionEngineCalorieProgress | null;
    macros: NutritionEngineMacroProgress[];
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
    nextMeal: Meal | null;
    focus: NutritionEngineFocus | null;
    insight: NutritionEngineInsight | null;
    actions: NutritionEngineAction[];
    nutritionFocus: string | null;
  };
};
