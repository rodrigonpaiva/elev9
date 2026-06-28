# Flow

## Main Flow

1. Authenticate request.
2. Resolve `UserProfile`.
3. Load active `NutritionPlan`.
4. Find meal by `mealId`.
5. Resolve current date from meal day.
6. Build planned macros from the meal.
7. Resolve actual macros:
   - `consumed`: actual defaults to planned macros.
   - `partial`: actual must be provided or calculated as MVP fallback.
   - `skipped`: actual macros are zero.
8. Persist log with unique meal/date ownership.
9. Return log.

## Alternative Flow: Duplicate Log

- MVP recommendation: upsert existing log for same `mealId` and date.
- Preserve `createdAt`, update `updatedAt`.

## Alternative Flow: Partial Without Actual Macros

- Either reject with `LOG_MEAL_INVALID_INPUT` or use a documented 50% fallback.
- Recommended MVP: reject to avoid misleading progress.
