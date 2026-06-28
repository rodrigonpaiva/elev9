# Rules

## 1. Authentication

- The use case must use only the authenticated user context.
- Client-provided `userProfileId` must be ignored if present.

## 2. Data Ownership

- `UserProfile` owns birth date and gender.
- `FitnessProfile` owns height, weight, and activity level.
- `NutritionProfile` owns nutrition goal and meal preferences.

## 3. Determinism

- The formula must be pure and testable.
- The use case must not call an LLM.
- Randomness is not allowed.

## 4. Fallbacks

- Missing `birthDate` may use a documented MVP fallback age.
- Missing `gender` may use a documented neutral offset.
- Missing `heightCm` or `weightKg` must not use arbitrary defaults.
- Missing `NutritionProfile` must return an error.
- Missing `FitnessProfile` must return an error.

## 5. Rounding

- Calories are rounded to the nearest integer.
- Macro grams are rounded to the nearest integer.
- Carbs are calculated after protein and fat to keep calories coherent.

## 6. Safety

- The response must not be framed as medical advice.
- The response must not diagnose or prescribe clinical nutrition treatment.
