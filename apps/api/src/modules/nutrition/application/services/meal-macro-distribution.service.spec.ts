import {
  distributeMacrosByMealType,
  resolveMealTypes,
} from './meal-macro-distribution.service';

describe('meal macro distribution', () => {
  const macroTargets = {
    calories: 2400,
    proteinGrams: 160,
    carbsGrams: 280,
    fatGrams: 70,
  };

  it('resolves meal types from mealsPerDay', () => {
    expect(resolveMealTypes(1)).toEqual(['lunch']);
    expect(resolveMealTypes(2)).toEqual(['lunch', 'dinner']);
    expect(resolveMealTypes(3)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(resolveMealTypes(5)).toEqual([
      'breakfast',
      'lunch',
      'dinner',
      'snack',
      'snack',
    ]);
  });

  it('distributes macros across mealsPerDay and preserves totals', () => {
    const distribution = distributeMacrosByMealType({
      macroTargets,
      mealsPerDay: 4,
    });

    expect(distribution).toHaveLength(4);
    expect(sum(distribution.map((meal) => meal.macroTargets.calories))).toBe(
      macroTargets.calories,
    );
    expect(
      sum(distribution.map((meal) => meal.macroTargets.proteinGrams)),
    ).toBe(macroTargets.proteinGrams);
    expect(sum(distribution.map((meal) => meal.macroTargets.carbsGrams))).toBe(
      macroTargets.carbsGrams,
    );
    expect(sum(distribution.map((meal) => meal.macroTargets.fatGrams))).toBe(
      macroTargets.fatGrams,
    );
  });
});

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
