import { Meal } from '../../domain/entities/meal.entity';
import { NutritionLog } from '../../domain/entities/nutrition-log.entity';
import { calculateNutritionDeterministicState } from './nutrition-deterministic-engine.service';

describe('calculateNutritionDeterministicState', () => {
  const meals = [buildMeal('breakfast'), buildMeal('lunch')];
  const targets = {
    calories: 2_000,
    proteinGrams: 150,
    carbsGrams: 200,
    fatGrams: 60,
  };

  it('builds canonical calorie, macro, meal, focus and insight state', () => {
    const result = calculateNutritionDeterministicState({
      meals,
      macroTargets: targets,
      logs: [buildLog('breakfast', 'consumed', targets)],
    });

    expect(result.calorieProgress).toMatchObject({
      consumed: 2_000,
      target: 2_000,
      remaining: 0,
      excess: 0,
      percentage: 100,
      rawPercentage: 100,
      state: 'target_reached',
    });
    expect(result.adherenceStatus).toBe('within_range');
    expect(result.mealProgress).toMatchObject({
      planned: 2,
      completed: 1,
      pending: 1,
      completionPercentage: 50,
      nextMealId: 'lunch',
    });
    expect(result.focus.action).toEqual({ type: 'log_meal', mealId: 'lunch' });
    expect(result.insight.kind).toBe('next_meal_available');
  });

  it('uses the latest valid log and does not inflate duplicate consumption', () => {
    const result = calculateNutritionDeterministicState({
      meals,
      macroTargets: targets,
      logs: [
        buildLog(
          'breakfast',
          'consumed',
          {
            calories: 500,
            proteinGrams: 30,
            carbsGrams: 40,
            fatGrams: 10,
          },
          '2026-06-02T08:00:00.000Z',
        ),
        buildLog(
          'breakfast',
          'consumed',
          {
            calories: 2_500,
            proteinGrams: 180,
            carbsGrams: 260,
            fatGrams: 80,
          },
          '2026-06-02T09:00:00.000Z',
        ),
        buildLog('lunch', 'consumed', {
          calories: -1,
          proteinGrams: 1,
          carbsGrams: 1,
          fatGrams: 1,
        }),
      ],
    });

    expect(result.consumed.calories).toBe(2_500);
    expect(result.calorieProgress.state).toBe('above_target');
    expect(result.calorieProgress.rawPercentage).toBe(125);
    expect(result.calorieProgress.excess).toBe(500);
    expect(result.mealProgress.completed).toBe(1);
  });

  it('represents absent targets without manufacturing progress', () => {
    const result = calculateNutritionDeterministicState({
      meals,
      macroTargets: null,
      logs: [],
    });

    expect(result.calorieProgress).toMatchObject({
      target: null,
      remaining: null,
      percentage: null,
      rawPercentage: null,
    });
    expect(result.macros.every((macro) => macro.target === null)).toBe(true);
    expect(result.adherenceStatus).toBe('unavailable');
    expect(result.insight.kind).toBe('targets_unavailable');
  });

  it('is idempotent for the same persisted state', () => {
    const input = {
      meals,
      macroTargets: targets,
      logs: [
        buildLog('breakfast', 'partial', {
          calories: 400,
          proteinGrams: 30,
          carbsGrams: 40,
          fatGrams: 10,
        }),
      ],
    } as const;

    expect(calculateNutritionDeterministicState(input)).toEqual(
      calculateNutritionDeterministicState(input),
    );
  });
});

function buildMeal(id: 'breakfast' | 'lunch'): Meal {
  return new Meal({
    id,
    type: id,
    title: id,
    description: `${id} meal`,
    foodItems: [],
    estimatedMacros: {
      calories: 500,
      proteinGrams: 40,
      carbsGrams: 50,
      fatGrams: 15,
    },
    alternatives: [],
    status: 'planned',
  });
}

function buildLog(
  mealId: string,
  status: 'consumed' | 'partial' | 'skipped',
  actualMacros: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  },
  updatedAt = '2026-06-02T10:00:00.000Z',
): NutritionLog {
  const timestamp = new Date(updatedAt);
  return new NutritionLog({
    id: `${mealId}-${updatedAt}`,
    userProfileId: 'profile_123',
    nutritionPlanId: 'plan_123',
    mealId,
    date: '2026-06-02',
    mealType: mealId === 'breakfast' ? 'breakfast' : 'lunch',
    status,
    actualMacros,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
