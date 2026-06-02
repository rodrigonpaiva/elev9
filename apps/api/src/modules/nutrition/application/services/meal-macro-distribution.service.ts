import { MealType } from '../../domain/entities/meal.entity';
import { MacroTargetsProps } from '../../domain/value-objects/macro-targets.value-object';

export type MealMacroDistribution = {
  type: MealType;
  order: number;
  macroTargets: MacroTargetsProps;
};

const PRIMARY_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];

export function distributeMacrosByMealType(input: {
  macroTargets: MacroTargetsProps;
  mealsPerDay: number;
}): MealMacroDistribution[] {
  const mealTypes = resolveMealTypes(input.mealsPerDay);
  const weights = resolveMealWeights(mealTypes);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);

  return mealTypes.map((type, index) => ({
    type,
    order: index + 1,
    macroTargets: allocateMacros({
      macroTargets: input.macroTargets,
      weight: weights[index],
      totalWeight,
      isLast: index === mealTypes.length - 1,
      previousAllocations: mealTypes.slice(0, index).map((_, previousIndex) =>
        allocateMacros({
          macroTargets: input.macroTargets,
          weight: weights[previousIndex],
          totalWeight,
          isLast: false,
          previousAllocations: [],
        }),
      ),
    }),
  }));
}

export function resolveMealTypes(mealsPerDay: number): MealType[] {
  const safeMealsPerDay = Math.max(1, Math.min(8, Math.round(mealsPerDay)));

  if (safeMealsPerDay === 1) {
    return ['lunch'];
  }

  if (safeMealsPerDay === 2) {
    return ['lunch', 'dinner'];
  }

  return [
    ...PRIMARY_MEALS,
    ...Array.from({ length: safeMealsPerDay - 3 }, () => 'snack' as const),
  ];
}

function resolveMealWeights(mealTypes: MealType[]): number[] {
  return mealTypes.map((type) => {
    switch (type) {
      case 'breakfast':
        return 0.24;
      case 'lunch':
        return 0.32;
      case 'dinner':
        return 0.32;
      case 'snack':
      default:
        return 0.12;
    }
  });
}

function allocateMacros(input: {
  macroTargets: MacroTargetsProps;
  weight: number;
  totalWeight: number;
  isLast: boolean;
  previousAllocations: MacroTargetsProps[];
}): MacroTargetsProps {
  if (input.isLast) {
    return {
      calories: remaining(
        input.macroTargets.calories,
        input.previousAllocations.map((allocation) => allocation.calories),
      ),
      proteinGrams: remaining(
        input.macroTargets.proteinGrams,
        input.previousAllocations.map((allocation) => allocation.proteinGrams),
      ),
      carbsGrams: remaining(
        input.macroTargets.carbsGrams,
        input.previousAllocations.map((allocation) => allocation.carbsGrams),
      ),
      fatGrams: remaining(
        input.macroTargets.fatGrams,
        input.previousAllocations.map((allocation) => allocation.fatGrams),
      ),
    };
  }

  const ratio = input.weight / input.totalWeight;

  return {
    calories: Math.round(input.macroTargets.calories * ratio),
    proteinGrams: Math.round(input.macroTargets.proteinGrams * ratio),
    carbsGrams: Math.round(input.macroTargets.carbsGrams * ratio),
    fatGrams: Math.round(input.macroTargets.fatGrams * ratio),
  };
}

function remaining(total: number, values: number[]): number {
  return total - values.reduce((sum, value) => sum + value, 0);
}
