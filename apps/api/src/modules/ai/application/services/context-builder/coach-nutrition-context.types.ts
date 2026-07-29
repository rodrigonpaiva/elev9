import type {
  NutritionAction,
  NutritionAdherenceStatus,
  NutritionAvailability,
  NutritionFreshness,
  NutritionFocus,
  NutritionInsight,
  NutritionMacroProgress,
  NutritionReadModel,
} from '@elev9/types';

export type CoachNutritionNextMeal = {
  type: NutritionReadModel['meals'][number]['type'];
  title: string;
};

export type CoachNutritionContext = {
  source: 'nutrition_read_model';
  contractVersion: 'nutrition-read-model-v1';
  availability: NutritionAvailability;
  freshness: NutritionFreshness;
  lastUpdatedAt: string | null;
  timezone: NutritionReadModel['timezone'];
  calories: Pick<
    NonNullable<NutritionReadModel['calories']>,
    'consumed' | 'target' | 'remaining' | 'excess' | 'state'
  > | null;
  macros: Array<
    Pick<
      NutritionMacroProgress,
      'nutrient' | 'consumed' | 'target' | 'remaining' | 'unit' | 'state'
    >
  >;
  meals: {
    planned: number;
    completed: number;
    pending: number;
    nextMeal: CoachNutritionNextMeal | null;
  } | null;
  adherenceStatus: NutritionAdherenceStatus;
  focus: NutritionFocus | null;
  insight: NutritionInsight | null;
  actions: readonly NutritionAction[];
};

export function unavailableCoachNutritionContext(): CoachNutritionContext {
  return {
    source: 'nutrition_read_model',
    contractVersion: 'nutrition-read-model-v1',
    availability: 'not_available',
    freshness: 'unknown',
    lastUpdatedAt: null,
    timezone: 'UTC',
    calories: null,
    macros: [],
    meals: null,
    adherenceStatus: 'unavailable',
    focus: null,
    insight: null,
    actions: [],
  };
}

export function toCoachNutritionContext(
  readModel:
    | (NutritionReadModel & { actions?: readonly NutritionAction[] })
    | null
    | undefined,
): CoachNutritionContext {
  if (!readModel) {
    return unavailableCoachNutritionContext();
  }

  return {
    source: 'nutrition_read_model',
    contractVersion: 'nutrition-read-model-v1',
    availability: readModel.availability,
    freshness: readModel.freshness,
    lastUpdatedAt: readModel.lastUpdatedAt,
    timezone: readModel.timezone,
    calories: readModel.calories
      ? {
          consumed: readModel.calories.consumed,
          target: readModel.calories.target,
          remaining: readModel.calories.remaining,
          excess: readModel.calories.excess,
          state: readModel.calories.state,
        }
      : null,
    macros: readModel.macros.map((macro) => ({
      nutrient: macro.nutrient,
      consumed: macro.consumed,
      target: macro.target,
      remaining: macro.remaining,
      unit: macro.unit,
      state: macro.state,
    })),
    meals: readModel.mealProgress
      ? {
          planned: readModel.mealProgress.planned,
          completed: readModel.mealProgress.completed,
          pending: readModel.mealProgress.pending,
          nextMeal: readModel.nextMeal
            ? {
                type: readModel.nextMeal.type,
                title: readModel.nextMeal.title,
              }
            : null,
        }
      : null,
    adherenceStatus: readModel.progress?.adherenceStatus ?? 'unavailable',
    focus: readModel.focus ?? null,
    insight: readModel.insight ?? null,
    actions: Object.freeze([
      ...(readModel.actions ?? []),
    ]),
  };
}
