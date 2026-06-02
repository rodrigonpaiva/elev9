# Flow

## Main Flow

1. Authenticate request.
2. Resolve `UserProfile`.
3. Load active `NutritionPlan`.
4. Resolve today's UTC date.
5. Find matching `NutritionDay`.
6. Load today's `NutritionLog` records.
7. Calculate macro progress.
8. Calculate meal adherence.
9. Resolve next meal.
10. Build deterministic `nutritionFocus`.
11. Return daily summary.

## Alternative Flow: No Logs

- Return planned meals.
- Progress actual values are zero.
- `nutritionFocus` should prioritize consistency.

## Alternative Flow: All Meals Logged

- `nextMeal` is null.
- `nutritionFocus` can prioritize recovery, performance, or maintenance based on progress and training day.

## Alternative Flow: Day Missing From Plan

- Return `TODAY_NUTRITION_DAY_NOT_FOUND`.
- Do not synthesize a day from scratch in this read use case.
