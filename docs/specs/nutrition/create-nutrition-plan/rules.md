# Rules

## 1. Ownership

- Nutrition module owns `NutritionPlan`, meals, meal alternatives, and nutrition logs.
- Fitness module remains the source for body metrics and activity level.
- User module remains the source for birth date and gender.

## 2. Meal Count

- The number of meals per day must respect `NutritionProfile.mealsPerDay`.
- `breakfast`, `lunch`, and `dinner` are preferred primary meal types.
- `snack` entries fill additional meal slots.

## 3. Food Safety

- Allergies must never appear in generated meals or alternatives.
- Dietary restrictions must never be violated.
- Disliked foods should be avoided when possible.
- Preferred foods should increase selection priority but must not override safety.

## 4. Macro Targets

- Macro targets are calculated before plan generation.
- The plan stores a snapshot of macro targets.
- Later macro recalculation must not mutate historical plans automatically.

## 5. Persistence

- Only one active nutrition plan should exist per user profile.
- Replaced plans must be retained for history and explainability.

## 6. Deterministic-First

- The meal planner must not use an LLM.
- Meal template ordering and selection must be stable.
