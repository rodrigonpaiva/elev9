import type { NutritionReadModel } from '@elev9/types';
import {
  toCoachNutritionContext,
  unavailableCoachNutritionContext,
} from './coach-nutrition-context.types';

describe('Coach Nutrition Context adapter', () => {
  it('projects only canonical, non-persistence fields', () => {
    const readModel = {
      availability: 'available',
      freshness: 'current',
      lastUpdatedAt: '2026-07-07T12:00:00.000Z',
      timezone: 'UTC',
      date: '2026-07-07',
      macroTargets: {
        calories: 2000,
        proteinGrams: 140,
        carbsGrams: 220,
        fatGrams: 70,
      },
      meals: [],
      progress: {
        consumedCalories: 1500,
        consumedProteinGrams: 90,
        consumedCarbsGrams: 160,
        consumedFatGrams: 50,
        targetCalories: 2000,
        targetProteinGrams: 140,
        targetCarbsGrams: 220,
        targetFatGrams: 70,
        adherencePercentage: 75,
        adherenceStatus: 'within_range',
        macroProgress: {
          protein: {
            nutrient: 'protein',
            consumed: 0,
            target: null,
            remaining: null,
            percentage: null,
            rawPercentage: null,
            unit: 'g',
            state: 'unavailable',
          },
          carbs: {
            nutrient: 'carbohydrates',
            consumed: 0,
            target: null,
            remaining: null,
            percentage: null,
            rawPercentage: null,
            unit: 'g',
            state: 'unavailable',
          },
          fat: {
            nutrient: 'fat',
            consumed: 0,
            target: null,
            remaining: null,
            percentage: null,
            rawPercentage: null,
            unit: 'g',
            state: 'unavailable',
          },
        },
      },
      targets: null,
      calories: {
        consumed: 1500,
        target: 2000,
        remaining: 300,
        excess: null,
        percentage: 75,
        rawPercentage: 75,
        state: 'in_progress',
      },
      macros: [],
      mealProgress: {
        planned: 0,
        available: 0,
        completed: 0,
        pending: 0,
        completionPercentage: null,
        nextMealId: null,
        additionalLoggedCount: 0,
        plannedCount: 0,
        consumedCount: 0,
        completedCount: 0,
        remainingCount: 0,
      },
      nextMeal: null,
      focus: {
        kind: 'maintain_plan',
        title: 'Keep going',
        message: 'Maintain your current plan.',
        priority: 'low',
        action: { type: 'none' },
      },
      insight: {
        kind: 'day_on_track',
        title: 'Today’s nutrition',
        message: 'Your logged progress is available.',
        action: { type: 'none' },
      },
      actions: [{ type: 'none' }],
      nutritionFocus: 'Maintain your current plan.',
    } satisfies NutritionReadModel;

    const context = toCoachNutritionContext(readModel);

    expect(context).toMatchObject({
      source: 'nutrition_read_model',
      contractVersion: 'nutrition-read-model-v1',
      availability: 'available',
      calories: { remaining: 300 },
      meals: { planned: 0, completed: 0, pending: 0 },
    });
    expect(context).not.toHaveProperty('meals[0].foodItems');
    expect(context).not.toHaveProperty('macroTargets');
  });

  it('represents missing Nutrition without inventing facts', () => {
    expect(unavailableCoachNutritionContext()).toMatchObject({
      availability: 'not_available',
      freshness: 'unknown',
      calories: null,
      meals: null,
      actions: [],
    });
  });
});
