import type {
  NutritionAction,
  NutritionAvailability,
  NutritionFreshness,
  NutritionMacroProgress,
  NutritionReadModel,
} from '@elev9/types';

export type NutritionCardModel = {
  adherence: {
    label:
      | 'Unavailable'
      | 'Not Started'
      | 'Below Range'
      | 'Within Range'
      | 'Above Range';
    badgeVariant: 'primary' | 'muted' | 'danger';
  };
  caloriesLabel: string;
  calorieDetailLabel: string;
  calorieProgress: number | null;
  macros: Array<{ label: string; value: string }>;
  mealsLabel: string;
  nextMealLabel: string | null;
  focusLabel: string | null;
  focusMessage: string | null;
  action: NutritionAction;
  freshnessLabel: string | null;
  accessibilityLabel: string;
};

export function buildNutritionCardModel(
  nutrition: NutritionReadModel,
): NutritionCardModel {
  const adherenceStatus = nutrition.progress?.adherenceStatus ?? 'unavailable';
  const adherence = {
    label: {
      unavailable: 'Unavailable',
      not_started: 'Not Started',
      below_range: 'Below Range',
      within_range: 'Within Range',
      above_range: 'Above Range',
    }[
      adherenceStatus
    ] as NutritionCardModel['adherence']['label'],
    badgeVariant: {
      unavailable: 'muted',
      not_started: 'muted',
      below_range: 'danger',
      within_range: 'primary',
      above_range: 'danger',
    }[
      adherenceStatus
    ] as NutritionCardModel['adherence']['badgeVariant'],
  };
  const calories = nutrition.calories;
  const calorieTarget = calories?.target;
  const meals = nutrition.mealProgress;
  const focus = nutrition.focus ?? nutrition.insight;
  const macros = nutrition.macros
    .filter((macro) => macro.target !== null)
    .map(formatMacro);
  const mealsLabel = meals
    ? `${meals.completed} / ${meals.planned} completed`
    : 'Meal progress unavailable';
  const calorieProgress =
    calories?.percentage === null || calories?.percentage === undefined
      ? null
      : clampForVisual(calories.percentage);
  const caloriesLabel = calories
    ? calorieTarget === null || calorieTarget === undefined
      ? `${formatNumber(calories.consumed)} kcal consumed`
      : `${formatNumber(calories.consumed)} / ${formatNumber(calorieTarget)} kcal`
    : 'Calories unavailable';
  const calorieDetailLabel = calories
    ? calorieTarget === null || calorieTarget === undefined
      ? 'Daily target unavailable'
      : calories.state === 'above_target'
        ? `${formatNumber(calories.excess ?? 0)} kcal above target`
        : `${formatNumber(calories.remaining ?? 0)} kcal remaining`
    : 'Daily target unavailable';
  const nextMealLabel = nutrition.nextMeal?.title ?? null;

  return {
    adherence,
    caloriesLabel,
    calorieDetailLabel,
    calorieProgress,
    macros,
    mealsLabel,
    nextMealLabel,
    focusLabel: focus?.title ?? null,
    focusMessage: focus?.message ?? null,
    action: focus?.action ?? { type: 'none' },
    freshnessLabel: formatFreshness(nutrition.freshness),
    accessibilityLabel: buildAccessibilityLabel({
      caloriesLabel,
      calorieDetailLabel,
      macros,
      mealsLabel,
      nextMealLabel,
      focusMessage: focus?.message ?? null,
    }),
  };
}

function formatMacro(macro: NutritionMacroProgress) {
  return {
    label: formatNutrient(macro.nutrient),
    value: `${formatNumber(macro.consumed)} / ${formatNumber(macro.target ?? 0)}${macro.unit}`,
  };
}

function formatNutrient(nutrient: NutritionMacroProgress['nutrient']): string {
  switch (nutrient) {
    case 'protein':
      return 'Protein';
    case 'carbohydrates':
      return 'Carbs';
    case 'fat':
      return 'Fat';
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    value,
  );
}

function clampForVisual(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function formatFreshness(freshness: NutritionFreshness): string | null {
  switch (freshness) {
    case 'stale':
      return 'Nutrition may not be fully up to date';
    case 'legacy':
      return 'Some nutrition information may need to be refreshed';
    case 'unknown':
      return 'Update time unavailable';
    case 'current':
    default:
      return null;
  }
}

export function getAvailabilityTitle(
  availability?: NutritionAvailability,
): string {
  switch (availability) {
    case 'not_configured':
      return 'Set up your nutrition';
    case 'insufficient_data':
      return 'Start tracking today';
    case 'processing_failed':
      return 'Nutrition could not be updated';
    case 'not_available':
    default:
      return 'Nutrition is temporarily unavailable';
  }
}

export function getAvailabilityMessage(
  availability?: NutritionAvailability,
): string {
  switch (availability) {
    case 'not_configured':
      return 'Complete your nutrition setup to receive daily targets and meal guidance.';
    case 'insufficient_data':
      return 'Your nutrition setup is ready. Add today’s information to see progress.';
    case 'processing_failed':
      return 'Some nutrition information could not be updated. Try again in a moment.';
    case 'not_available':
    default:
      return 'Nutrition information is not available right now. Try again in a moment.';
  }
}

export function getActionLabel(action: NutritionAction): string {
  switch (action.type) {
    case 'open_profile':
      return 'Open nutrition profile';
    case 'create_plan':
      return 'Create nutrition plan';
    case 'open_today_meals':
      return 'View today’s meals';
    case 'log_meal':
      return 'Log a meal';
    case 'open_hydration':
      return 'Open hydration';
    case 'none':
    default:
      return 'View nutrition';
  }
}

function buildAccessibilityLabel(input: {
  caloriesLabel: string;
  calorieDetailLabel: string;
  macros: Array<{ label: string; value: string }>;
  mealsLabel: string;
  nextMealLabel: string | null;
  focusMessage: string | null;
}): string {
  const macroLabel = input.macros
    .map((macro) => `${macro.label} ${macro.value}`)
    .join('. ');
  return [
    `Calories: ${input.caloriesLabel}. ${input.calorieDetailLabel}.`,
    macroLabel,
    `Meals: ${input.mealsLabel}.`,
    input.nextMealLabel
      ? `Next meal: ${input.nextMealLabel}.`
      : 'Next meal is not available.',
    input.focusMessage ? `Nutrition focus: ${input.focusMessage}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}
