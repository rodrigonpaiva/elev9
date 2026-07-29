import type { NutritionReadModel } from '@elev9/types';

import { buildNutritionCardModel } from './todays-nutrition-card-model';

function createNutrition(
  overrides: Partial<NutritionReadModel> = {},
): NutritionReadModel {
  return {
    availability: 'available',
    freshness: 'current',
    lastUpdatedAt: '2026-07-29T08:00:00.000Z',
    timezone: 'UTC',
    date: '2026-07-29',
    macroTargets: {
      calories: 2100,
      proteinGrams: 140,
      carbsGrams: 220,
      fatGrams: 70,
    },
    targets: {
      calories: 2100,
      proteinGrams: 140,
      carbsGrams: 220,
      fatGrams: 70,
    },
    calories: {
      consumed: 1420,
      target: 2100,
      remaining: 800,
      excess: 0,
      percentage: 67,
      rawPercentage: 67.62,
      state: 'in_progress',
    },
    macros: [
      {
        nutrient: 'protein',
        consumed: 92,
        target: 140,
        remaining: 48,
        percentage: 66,
        rawPercentage: 65.71,
        unit: 'g',
        state: 'in_progress',
      },
      {
        nutrient: 'carbohydrates',
        consumed: 160,
        target: 220,
        remaining: 60,
        percentage: 73,
        rawPercentage: 72.72,
        unit: 'g',
        state: 'in_progress',
      },
      {
        nutrient: 'fat',
        consumed: 44,
        target: 70,
        remaining: 26,
        percentage: 63,
        rawPercentage: 62.85,
        unit: 'g',
        state: 'in_progress',
      },
    ],
    progress: {
      consumedCalories: 1420,
      consumedProteinGrams: 92,
      consumedCarbsGrams: 160,
      consumedFatGrams: 44,
      targetCalories: 2100,
      targetProteinGrams: 140,
      targetCarbsGrams: 220,
      targetFatGrams: 70,
      adherencePercentage: 67,
      adherenceStatus: 'within_range',
      macroProgress: {
        protein: {
          nutrient: 'protein',
          consumed: 92,
          target: 140,
          remaining: 48,
          percentage: 66,
          rawPercentage: 65.71,
          unit: 'g',
          state: 'in_progress',
        },
        carbs: {
          nutrient: 'carbohydrates',
          consumed: 160,
          target: 220,
          remaining: 60,
          percentage: 73,
          rawPercentage: 72.72,
          unit: 'g',
          state: 'in_progress',
        },
        fat: {
          nutrient: 'fat',
          consumed: 44,
          target: 70,
          remaining: 26,
          percentage: 63,
          rawPercentage: 62.85,
          unit: 'g',
          state: 'in_progress',
        },
      },
    },
    mealProgress: {
      planned: 5,
      available: 5,
      completed: 3,
      pending: 2,
      completionPercentage: 60,
      nextMealId: 'meal-4',
      additionalLoggedCount: 0,
      plannedCount: 5,
      consumedCount: 3,
      completedCount: 3,
      remainingCount: 2,
    },
    meals: [],
    nextMeal: {
      id: 'meal-4',
      type: 'snack',
      title: 'Afternoon meal',
      description: 'A planned meal',
      foodItems: [],
      estimatedMacros: {
        calories: 300,
        proteinGrams: 25,
        carbsGrams: 30,
        fatGrams: 10,
      },
      alternatives: [],
      status: 'planned',
    },
    focus: {
      kind: 'complete_next_meal',
      title: 'Continue with your plan',
      message: 'Complete your afternoon meal.',
      priority: 'medium',
      action: { type: 'log_meal', mealId: 'meal-4' },
    },
    insight: {
      kind: 'next_meal_available',
      title: 'Next meal available',
      message: 'Your next meal is ready.',
      action: { type: 'open_today_meals' },
    },
    nutritionFocus: 'Complete your afternoon meal.',
    ...overrides,
  };
}

describe('TodaysNutritionCard presentation model', () => {
  it('uses canonical calorie, macro, meal, focus, and action values', () => {
    const model = buildNutritionCardModel(createNutrition());

    expect(model.caloriesLabel).toBe('1,420 / 2,100 kcal');
    expect(model.calorieDetailLabel).toBe('800 kcal remaining');
    expect(model.calorieProgress).toBe(67);
    expect(model.macros).toEqual([
      { label: 'Protein', value: '92 / 140g' },
      { label: 'Carbs', value: '160 / 220g' },
      { label: 'Fat', value: '44 / 70g' },
    ]);
    expect(model.mealsLabel).toBe('3 / 5 completed');
    expect(model.nextMealLabel).toBe('Afternoon meal');
    expect(model.focusMessage).toBe('Complete your afternoon meal.');
    expect(model.action).toEqual({ type: 'log_meal', mealId: 'meal-4' });
  });

  it('preserves above-target semantics while limiting only the visual bar', () => {
    const model = buildNutritionCardModel(
      createNutrition({
        calories: {
          consumed: 2480,
          target: 2100,
          remaining: 0,
          excess: 380,
          percentage: 100,
          rawPercentage: 118.1,
          state: 'above_target',
        },
      }),
    );

    expect(model.caloriesLabel).toBe('2,480 / 2,100 kcal');
    expect(model.calorieDetailLabel).toBe('380 kcal above target');
    expect(model.calorieProgress).toBe(100);
  });

  it('does not manufacture progress when the calorie target is absent', () => {
    const model = buildNutritionCardModel(
      createNutrition({
        calories: {
          consumed: 420,
          target: null,
          remaining: null,
          excess: null,
          percentage: null,
          rawPercentage: null,
          state: 'not_started',
        },
      }),
    );

    expect(model.caloriesLabel).toBe('420 kcal consumed');
    expect(model.calorieDetailLabel).toBe('Daily target unavailable');
    expect(model.calorieProgress).toBeNull();
  });
});
