# Flow

## Main Flow

1. Authenticate request.
2. Resolve `UserProfile`.
3. Load `NutritionProfile`.
4. Build today nutrition summary.
5. Load recent nutrition logs.
6. Load active training plan and today's workout, if present.
7. Load recovery/fatigue signals from existing context builder or check-ins.
8. Calculate nutrition adherence.
9. Generate message, recommendations, and influences.
10. Build reduced context snapshot.
11. Persist recommendation if repository is implemented.
12. Return safe response.

## Alternative Flow: No Training Day

- Recommendation should focus on consistency or recovery.
- Do not invent workout context.

## Alternative Flow: High Fatigue

- Prioritize recovery nutrition and hydration.

## Alternative Flow: Low Adherence

- Prioritize next planned meal and simple consistency.

## Alternative Flow: Missing Plan

- Return `NUTRITION_PLAN_NOT_FOUND` or generate profile-only recommendation only if explicitly supported later.
- MVP recommendation: require active plan.
