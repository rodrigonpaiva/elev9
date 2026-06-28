# Calculate Macro Targets

## 1. Overview

This spec defines the deterministic macro target calculation use case for the Nutrition bounded context.

```txt
Bounded Context: nutrition
Module: nutrition
Use-case: calculate-macro-targets
Canonical name: nutrition.calculate-macro-targets
```

## 2. Goal

Calculate daily calorie, protein, carbohydrate, and fat targets for the authenticated user from structured profile data.

## 3. MVP Scope

Included:

- deterministic BMR calculation with Mifflin-St Jeor
- activity multiplier from `FitnessProfile.activityLevel`
- calorie adjustment from `NutritionProfile.goal`
- safe fallback behavior for missing profile fields
- explainable calculation snapshot

Not included:

- medical nutrition advice
- body fat based formulas
- wearable integration
- LLM-generated macro targets
- persistence as a standalone collection

## 4. Preconditions

- The request is authenticated.
- A `UserProfile` can be resolved from `authUserId`.
- A `NutritionProfile` should exist for full calculation.
- A `FitnessProfile` should exist for full calculation.

## 5. Postconditions

After success:

- macro targets are returned in a safe payload.
- calculation inputs and fallbacks are exposed as reduced explainability metadata.
- no application state is modified.

## 6. Related Entities

- `UserProfile`
- `FitnessProfile`
- `NutritionProfile`
- `MacroTargets`
- `MacroCalculationSnapshot`

## 7. Business Value

Macro targets are the foundation for weekly meal plans, today nutrition, adherence scoring, and nutrition recommendations. They make the Nutrition Engine concrete without requiring LLM behavior.

## 8. Important Decisions

- Macro targets are calculated deterministically.
- A calculation result can be used directly and can also be snapshot into `NutritionPlan`.
- Missing required data must return explicit fallback metadata instead of silently inventing user facts.
- The use case reads from existing repositories but does not persist state.

## 9. Summary

This use case provides the first nutrition intelligence primitive: reproducible macro targets based on user, fitness, and nutrition context.
