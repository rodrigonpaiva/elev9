# Tests

## 1. Unit Tests

- calculates Mifflin-St Jeor for male users.
- calculates Mifflin-St Jeor for female users.
- uses neutral offset when gender is missing.
- uses fallback age when birthDate is missing.
- applies activity multiplier by activity level.
- applies calorie adjustment by nutrition goal.
- calculates protein, carbs, and fat consistently.
- returns missing nutrition profile error.
- returns missing fitness profile error.
- rejects invalid height or weight.

## 2. Controller Tests

- uses only authenticated user id.
- maps domain errors to expected HTTP status.
- returns safe payload.

## 3. Acceptance Criteria

- same inputs produce same macro targets.
- fallback reasons are visible.
- no LLM dependency exists.
- no state is persisted.

## 4. Regression Risks

- formula drift without test updates.
- hidden defaults creating misleading targets.
- divergence between calculated targets and plan snapshot targets.
