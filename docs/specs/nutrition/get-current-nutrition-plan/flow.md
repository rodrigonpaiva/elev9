# Flow

## Main Flow

1. Authenticate request.
2. Resolve `UserProfile`.
3. Query active `NutritionPlan` by `userProfileId`.
4. Return safe plan payload.

## Alternative Flows

### Missing UserProfile

- Return `USER_PROFILE_NOT_FOUND`.

### Missing Active Plan

- Return `NUTRITION_PLAN_NOT_FOUND`.
- Client may redirect user to create a plan.

## Guarantees

- The user can only read their own active plan.
- No plan generation happens in this use case.
