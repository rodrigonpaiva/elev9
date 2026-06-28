# Flow

## Main Flow

1. Authenticate request.
2. Resolve `UserProfile`.
3. Load active `NutritionPlan`.
4. Find meal by `mealId`.
5. Load `NutritionProfile`.
6. Select compatible alternative.
7. Validate alternative against allergies and restrictions.
8. Avoid disliked foods when possible.
9. Replace meal.
10. Store previous meal, reason, and `replacedAt`.
11. Persist updated plan.
12. Return replacement result.

## Alternative Flow: No Alternative

- Return `MEAL_REPLACEMENT_NOT_AVAILABLE`.
- Do not mutate the plan.

## Alternative Flow: Unsafe Alternative

- Return `MEAL_REPLACEMENT_UNSAFE`.
- Do not mutate the plan.

## Alternative Flow: Meal Already Logged

- MVP recommendation: allow replacement only if the meal has no consumed log.
- If consumed log exists, return `MEAL_ALREADY_LOGGED` if this error is added during implementation.
