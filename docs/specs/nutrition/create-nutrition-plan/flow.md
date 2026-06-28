# Flow

## 1. Main Flow

1. Authenticate request.
2. Resolve `UserProfile`.
3. Load active `FitnessProfile`.
4. Load active `NutritionProfile`.
5. Check for active `NutritionPlan`.
6. Calculate macro targets.
7. Resolve current week range in UTC.
8. Generate seven `NutritionDay` entries.
9. Generate meals for each day.
10. Attach alternatives for replace-meal.
11. Persist plan as active.
12. Return safe response.

## 2. Meal Generation Flow

1. Build required meal slots from `mealsPerDay`.
2. Always include breakfast, lunch, and dinner when `mealsPerDay >= 3`.
3. Add snack slots when `mealsPerDay > 3`.
4. If `mealsPerDay < 3`, prioritize lunch and dinner, then breakfast.
5. Filter meal templates by allergies and dietary restrictions.
6. Prefer foods listed in `preferredFoods`.
7. Avoid `dislikedFoods` when possible.
8. Select deterministic templates by goal, meal type, and day index.

## 3. Alternative Flow: Existing Active Plan

- If `replaceExisting` is false or absent, return `NUTRITION_PLAN_ALREADY_EXISTS`.
- If `replaceExisting` is true, mark current active plan as `replaced` and create a new active plan.

## 4. Alternative Flow: No Safe Meal Template

- Return `NUTRITION_PLAN_UNSAFE_MEAL_TEMPLATE`.
- Do not persist a partial plan.

## 5. Deterministic Guarantee

Given the same profiles, macro targets, week start date, and template catalog, plan generation must produce the same plan structure.
