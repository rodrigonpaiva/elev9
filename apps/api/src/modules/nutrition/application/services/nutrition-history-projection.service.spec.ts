import { Meal } from '../../domain/entities/meal.entity';
import { NutritionLog } from '../../domain/entities/nutrition-log.entity';
import { NutritionPlan } from '../../domain/entities/nutrition-plan.entity';
import { NutritionHistoryProjectionService } from './nutrition-history-projection.service';

describe('NutritionHistoryProjectionService', () => {
  const service = new NutritionHistoryProjectionService();

  it('reconstructs a historical day from the plan referenced by its logs', () => {
    const day = service.project({
      date: '2026-06-02',
      logs: [buildLog('2026-06-02')],
      plans: [buildPlan()],
    });

    expect(day).toMatchObject({
      availability: 'available',
      dataQuality: 'complete',
      source: 'reconstructed',
      calories: { consumed: 500, target: 2000 },
      mealProgress: { completed: 1, planned: 1 },
      focus: null,
      insight: null,
    });
  });

  it('does not manufacture zero data for a day without historical logs', () => {
    const day = service.project({ date: '2026-06-02', logs: [], plans: [] });

    expect(day).toMatchObject({
      availability: 'no_data',
      calories: null,
      macros: [],
      mealProgress: null,
      adherenceStatus: 'unavailable',
    });
  });

  it('uses valid days as the trend denominator and exposes coverage', () => {
    const available = service.project({
      date: '2026-06-02',
      logs: [buildLog('2026-06-02')],
      plans: [buildPlan()],
    });
    const trends = service.buildTrends({
      from: '2026-06-01',
      to: '2026-06-07',
      days: [available],
    });

    expect(trends.coverage).toEqual({
      expectedDays: 7,
      availableDays: 1,
      partialDays: 0,
      missingDays: 6,
    });
    expect(trends.calorieProgress?.points).toHaveLength(1);
  });
});

function buildMeal(): Meal {
  return new Meal({
    id: 'meal_1',
    type: 'breakfast',
    title: 'Breakfast',
    description: 'Recorded meal',
    foodItems: [],
    estimatedMacros: { calories: 500, proteinGrams: 30, carbsGrams: 50, fatGrams: 10 },
    alternatives: [],
    status: 'planned',
  });
}

function buildPlan(): NutritionPlan {
  return new NutritionPlan({
    id: 'plan_1',
    userProfileId: 'profile_1',
    nutritionProfileId: 'nutrition_profile_1',
    fitnessProfileId: 'fitness_profile_1',
    status: 'replaced',
    weekStartDate: '2026-06-01',
    weekEndDate: '2026-06-07',
    macroTargets: { calories: 2000, proteinGrams: 120, carbsGrams: 220, fatGrams: 60 },
    days: [{
      date: '2026-06-02',
      dayIndex: 1,
      dailyMacroTargets: { calories: 2000, proteinGrams: 120, carbsGrams: 220, fatGrams: 60 },
      meals: [buildMeal()],
    }],
    generatedBy: 'deterministic',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  });
}

function buildLog(date: string): NutritionLog {
  return new NutritionLog({
    id: 'log_1',
    userProfileId: 'profile_1',
    nutritionPlanId: 'plan_1',
    mealId: 'meal_1',
    date,
    mealType: 'breakfast',
    status: 'consumed',
    actualMacros: { calories: 500, proteinGrams: 30, carbsGrams: 50, fatGrams: 10 },
    createdAt: new Date('2026-06-02T08:00:00.000Z'),
    updatedAt: new Date('2026-06-02T08:00:00.000Z'),
  });
}
