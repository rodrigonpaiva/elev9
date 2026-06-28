import { generateNutritionPlanFoundation } from './nutrition-plan-generator.service';

describe('generateNutritionPlanFoundation', () => {
  const baseInput = {
    userProfileId: 'profile_123',
    nutritionProfileId: 'nutrition_123',
    fitnessProfileId: 'fitness_123',
    weekStartDate: '2026-06-01',
    macroTargets: {
      calories: 2400,
      proteinGrams: 160,
      carbsGrams: 280,
      fatGrams: 70,
    },
    mealsPerDay: 4,
    goal: 'muscle_gain' as const,
    dietaryRestrictions: [],
    allergies: [],
    dislikedFoods: [],
    preferredFoods: [],
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  it('generates a weekly plan with 7 days', () => {
    const plan = generateNutritionPlanFoundation(baseInput);

    expect(plan.days).toHaveLength(7);
    expect(plan.weekStartDate).toBe('2026-06-01');
    expect(plan.weekEndDate).toBe('2026-06-07');
    expect(plan.macroTargets).toEqual(baseInput.macroTargets);
  });

  it('generates the correct number of meals per day', () => {
    const plan = generateNutritionPlanFoundation({
      ...baseInput,
      mealsPerDay: 5,
    });

    expect(plan.days.every((day) => day.meals.length === 5)).toBe(true);
    expect(plan.days[0].meals.map((meal) => meal.type)).toEqual([
      'breakfast',
      'lunch',
      'dinner',
      'snack',
      'snack',
    ]);
  });

  it('generates stable plan and meal ids', () => {
    const first = generateNutritionPlanFoundation(baseInput);
    const second = generateNutritionPlanFoundation(baseInput);

    expect(first.id).toBe(second.id);
    expect(first.days[0].meals[0].id).toBe(second.days[0].meals[0].id);
    expect(first.days[3].meals[2].id).toBe(second.days[3].meals[2].id);
  });

  it('generates alternatives that do not violate basic allergies', () => {
    const plan = generateNutritionPlanFoundation({
      ...baseInput,
      allergies: ['nuts', 'dairy'],
      mealsPerDay: 4,
    });

    const allAlternativeFoods = plan.days.flatMap((day) =>
      day.meals.flatMap((meal) =>
        meal.alternatives.flatMap((alternative) => alternative.foodItems),
      ),
    );

    expect(
      allAlternativeFoods.some(
        (item) => item.tags.includes('nuts') || item.tags.includes('dairy'),
      ),
    ).toBe(false);
  });

  it('generates meals that respect vegan dietary restrictions', () => {
    const plan = generateNutritionPlanFoundation({
      ...baseInput,
      dietaryRestrictions: ['vegan'],
      mealsPerDay: 3,
    });

    const allFoods = plan.days.flatMap((day) =>
      day.meals.flatMap((meal) => [
        ...meal.foodItems,
        ...meal.alternatives.flatMap((alternative) => alternative.foodItems),
      ]),
    );

    expect(allFoods.every((food) => food.tags.includes('vegan'))).toBe(true);
  });
});
