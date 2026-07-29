import { Meal } from '../../domain/entities/meal.entity';
import { NutritionLog } from '../../domain/entities/nutrition-log.entity';
import { MacroTargetsProps } from '../../domain/value-objects/macro-targets.value-object';

export type NutritionEngineAdherenceStatus =
  | 'unavailable'
  | 'not_started'
  | 'below_range'
  | 'within_range'
  | 'above_range';

export type NutritionEngineMacroProgress = {
  nutrient: 'protein' | 'carbohydrates' | 'fat';
  consumed: number;
  target: number | null;
  remaining: number | null;
  percentage: number | null;
  rawPercentage: number | null;
  unit: 'g';
  state:
    | 'unavailable'
    | 'not_started'
    | 'in_progress'
    | 'near_target'
    | 'target_reached'
    | 'above_target';
};

export type NutritionEngineCalorieProgress = {
  consumed: number;
  target: number | null;
  remaining: number | null;
  excess: number | null;
  percentage: number | null;
  rawPercentage: number | null;
  state:
    | 'not_started'
    | 'in_progress'
    | 'near_target'
    | 'target_reached'
    | 'above_target';
};

export type NutritionEngineMealProgress = {
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
};

export type NutritionEngineAction =
  | { type: 'open_profile' }
  | { type: 'create_plan' }
  | { type: 'open_today_meals' }
  | { type: 'log_meal'; mealId?: string }
  | { type: 'open_hydration' }
  | { type: 'none' };

export type NutritionEngineFocus = {
  kind:
    | 'configure_profile'
    | 'create_plan'
    | 'log_meal'
    | 'complete_next_meal'
    | 'prioritize_protein'
    | 'maintain_plan'
    | 'review_targets';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action: NutritionEngineAction;
};

export type NutritionEngineInsight = {
  kind:
    | 'profile_required'
    | 'plan_required'
    | 'meal_logging_required'
    | 'next_meal_available'
    | 'protein_progress'
    | 'calorie_progress'
    | 'day_on_track'
    | 'targets_unavailable'
    | 'insufficient_data';
  title: string;
  message: string;
  action: NutritionEngineAction;
};

export type NutritionDeterministicEngineInput = {
  meals: readonly Meal[];
  logs: readonly NutritionLog[];
  macroTargets: MacroTargetsProps | null;
};

export type NutritionDeterministicEngineOutput = {
  consumed: MacroTargetsProps;
  calorieProgress: NutritionEngineCalorieProgress;
  macros: NutritionEngineMacroProgress[];
  adherenceStatus: NutritionEngineAdherenceStatus;
  mealProgress: NutritionEngineMealProgress;
  nextMeal: Meal | null;
  focus: NutritionEngineFocus;
  insight: NutritionEngineInsight;
};

/**
 * Pure Nutrition policy engine. It accepts domain entities and returns only
 * deterministic meaning; it has no Nest, persistence, clock, or transport
 * dependency.
 */
export function calculateNutritionDeterministicState(
  input: NutritionDeterministicEngineInput,
): NutritionDeterministicEngineOutput {
  const validLogs = deduplicateLogs(input.logs);
  const consumed = sumConsumedMacros(validLogs);
  const mealIds = new Set(input.meals.map((meal) => meal.id));
  const plannedLogs = validLogs.filter((log) => mealIds.has(log.mealId));
  const completedLogs = plannedLogs.filter((log) => log.status === 'consumed');
  const pendingMeals = input.meals.filter(
    (meal) => !plannedLogs.some((log) => log.mealId === meal.id),
  );
  const nextMeal = pendingMeals[0] ?? null;
  const mealProgress = buildMealProgress({
    planned: input.meals.length,
    available: input.meals.length,
    plannedLogs,
    completedLogs,
    pending: pendingMeals.length,
    additionalLoggedCount: validLogs.filter((log) => !mealIds.has(log.mealId))
      .length,
    nextMeal,
  });
  const calorieProgress = buildCalorieProgress(
    consumed.calories,
    input.macroTargets?.calories ?? null,
  );
  const macros = [
    buildMacroProgress(
      'protein',
      consumed.proteinGrams,
      input.macroTargets?.proteinGrams ?? null,
    ),
    buildMacroProgress(
      'carbohydrates',
      consumed.carbsGrams,
      input.macroTargets?.carbsGrams ?? null,
    ),
    buildMacroProgress(
      'fat',
      consumed.fatGrams,
      input.macroTargets?.fatGrams ?? null,
    ),
  ];
  const adherenceStatus = classifyAdherence({
    calorieProgress,
    hasConsumedLogs: completedLogs.length > 0 || plannedLogs.some((log) => log.status === 'partial'),
  });
  const focus = buildFocus({
    calorieProgress,
    macros,
    mealProgress,
  });

  return {
    consumed,
    calorieProgress,
    macros,
    adherenceStatus,
    mealProgress,
    nextMeal,
    focus,
    insight: buildInsight({
      calorieProgress,
      macros,
      mealProgress,
      nextMeal,
      adherenceStatus,
    }),
  };
}

function deduplicateLogs(logs: readonly NutritionLog[]): NutritionLog[] {
  const byMealId = new Map<string, NutritionLog>();

  for (const log of logs) {
    if (!isValidLog(log)) continue;
    const current = byMealId.get(log.mealId);
    if (!current || getLogTimestamp(log) >= getLogTimestamp(current)) {
      byMealId.set(log.mealId, log);
    }
  }

  return [...byMealId.values()];
}

function isValidLog(log: NutritionLog): boolean {
  if (!log.mealId || !['consumed', 'partial', 'skipped'].includes(log.status)) {
    return false;
  }

  if (!log.actualMacros) return true;
  return Object.values(log.actualMacros).every(
    (value) => Number.isFinite(value) && value >= 0,
  );
}

function getLogTimestamp(log: NutritionLog): number {
  const timestamp = log.updatedAt?.getTime() ?? log.createdAt?.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sumConsumedMacros(logs: readonly NutritionLog[]): MacroTargetsProps {
  return logs.reduce(
    (sum, log) => {
      if (!log.actualMacros || log.status === 'skipped') return sum;
      return {
        calories: sum.calories + log.actualMacros.calories,
        proteinGrams: sum.proteinGrams + log.actualMacros.proteinGrams,
        carbsGrams: sum.carbsGrams + log.actualMacros.carbsGrams,
        fatGrams: sum.fatGrams + log.actualMacros.fatGrams,
      };
    },
    { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );
}

function buildCalorieProgress(
  consumed: number,
  target: number | null,
): NutritionEngineCalorieProgress {
  if (target === null || !Number.isFinite(target) || target <= 0) {
    return {
      consumed,
      target: null,
      remaining: null,
      excess: null,
      percentage: null,
      rawPercentage: null,
      state: 'not_started',
    };
  }

  const rawPercentage = roundPercentage((consumed / target) * 100);
  return {
    consumed,
    target,
    remaining: Math.max(0, target - consumed),
    excess: Math.max(0, consumed - target),
    percentage: Math.min(100, rawPercentage),
    rawPercentage,
    state: classifyProgressState(consumed, target),
  };
}

function buildMacroProgress(
  nutrient: NutritionEngineMacroProgress['nutrient'],
  consumed: number,
  target: number | null,
): NutritionEngineMacroProgress {
  if (target === null || !Number.isFinite(target) || target <= 0) {
    return {
      nutrient,
      consumed,
      target: null,
      remaining: null,
      percentage: null,
      rawPercentage: null,
      unit: 'g',
      state: 'unavailable',
    };
  }

  const rawPercentage = roundPercentage((consumed / target) * 100);
  return {
    nutrient,
    consumed,
    target,
    remaining: Math.max(0, target - consumed),
    percentage: Math.min(100, rawPercentage),
    rawPercentage,
    unit: 'g',
    state: classifyProgressState(consumed, target),
  };
}

function classifyProgressState(
  consumed: number,
  target: number,
): 'not_started' | 'in_progress' | 'near_target' | 'target_reached' | 'above_target' {
  if (consumed <= 0) return 'not_started';
  if (consumed > target) return 'above_target';
  if (consumed === target) return 'target_reached';
  if (consumed / target >= 0.8) return 'near_target';
  return 'in_progress';
}

function classifyAdherence(input: {
  calorieProgress: NutritionEngineCalorieProgress;
  hasConsumedLogs: boolean;
}): NutritionEngineAdherenceStatus {
  if (input.calorieProgress.target === null) return 'unavailable';
  if (!input.hasConsumedLogs) return 'not_started';
  if (input.calorieProgress.state === 'above_target') return 'above_range';
  if (input.calorieProgress.rawPercentage !== null && input.calorieProgress.rawPercentage >= 80) {
    return 'within_range';
  }
  return 'below_range';
}

function buildMealProgress(input: {
  planned: number;
  available: number;
  plannedLogs: readonly NutritionLog[];
  completedLogs: readonly NutritionLog[];
  pending: number;
  additionalLoggedCount: number;
  nextMeal: Meal | null;
}): NutritionEngineMealProgress {
  const completed = input.completedLogs.length;
  return {
    planned: input.planned,
    available: input.available,
    completed,
    pending: Math.max(0, input.pending),
    completionPercentage:
      input.planned > 0 ? roundPercentage((completed / input.planned) * 100) : null,
    nextMealId: input.nextMeal?.id ?? null,
    additionalLoggedCount: input.additionalLoggedCount,
    plannedCount: input.planned,
    consumedCount: input.plannedLogs.filter((log) => log.status !== 'skipped').length,
    completedCount: completed,
    remainingCount: Math.max(0, input.pending),
  };
}

function buildFocus(input: {
  calorieProgress: NutritionEngineCalorieProgress;
  macros: readonly NutritionEngineMacroProgress[];
  mealProgress: NutritionEngineMealProgress;
}): NutritionEngineFocus {
  if (input.calorieProgress.target === null) {
    return {
      kind: 'review_targets',
      title: 'Review your targets',
      message: 'Nutrition targets are not available for today yet.',
      priority: 'high',
      action: { type: 'none' },
    };
  }
  if (input.mealProgress.nextMealId) {
    return {
      kind: input.mealProgress.completed === 0 ? 'log_meal' : 'complete_next_meal',
      title: 'Continue with your plan',
      message: 'Your next planned meal is ready to complete.',
      priority: 'medium',
      action: { type: 'log_meal', mealId: input.mealProgress.nextMealId },
    };
  }
  const protein = input.macros.find((macro) => macro.nutrient === 'protein');
  if (protein?.state === 'in_progress' || protein?.state === 'near_target') {
    return {
      kind: 'prioritize_protein',
      title: 'Keep protein consistent',
      message: 'Continue distributing protein across the plan.',
      priority: 'medium',
      action: { type: 'open_today_meals' },
    };
  }
  return {
    kind: 'maintain_plan',
    title: 'Maintain your plan',
    message: 'Keep following the current nutrition plan today.',
    priority: 'low',
    action: { type: 'open_today_meals' },
  };
}

function buildInsight(input: {
  calorieProgress: NutritionEngineCalorieProgress;
  macros: readonly NutritionEngineMacroProgress[];
  mealProgress: NutritionEngineMealProgress;
  nextMeal: Meal | null;
  adherenceStatus: NutritionEngineAdherenceStatus;
}): NutritionEngineInsight {
  if (input.calorieProgress.target === null) {
    return {
      kind: 'targets_unavailable',
      title: 'Targets unavailable',
      message: 'Nutrition progress will be available when valid targets exist.',
      action: { type: 'none' },
    };
  }
  if (input.nextMeal) {
    return {
      kind: 'next_meal_available',
      title: 'Next meal available',
      message: 'A planned meal is available to log next.',
      action: { type: 'log_meal', mealId: input.nextMeal.id },
    };
  }
  if (input.adherenceStatus === 'within_range') {
    return {
      kind: 'day_on_track',
      title: 'Plan progress is within range',
      message: 'Your recorded intake is within the current calorie range.',
      action: { type: 'open_today_meals' },
    };
  }
  const protein = input.macros.find((macro) => macro.nutrient === 'protein');
  if (protein?.state === 'in_progress') {
    return {
      kind: 'protein_progress',
      title: 'Protein progress',
      message: 'Continue with the planned meals to progress toward protein target.',
      action: { type: 'open_today_meals' },
    };
  }
  return {
    kind: 'calorie_progress',
    title: 'Calorie progress',
    message: 'Review your recorded intake against today’s target.',
    action: { type: 'open_today_meals' },
  };
}

function roundPercentage(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}
