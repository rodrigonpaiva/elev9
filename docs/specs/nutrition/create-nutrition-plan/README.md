# Create Nutrition Plan

## 1. Overview

```txt
Bounded Context: nutrition
Module: nutrition
Use-case: create-nutrition-plan
Canonical name: nutrition.create-nutrition-plan
```

## 2. Goal

Create a deterministic weekly nutrition plan for the authenticated user based on macro targets, nutrition preferences, and fitness context.

## 3. MVP Scope

Included:

- weekly plan persistence
- daily meals for breakfast, lunch, dinner, and snacks
- meal count aligned with `NutritionProfile.mealsPerDay`
- deterministic meal selection from safe templates
- macro target snapshot inside the plan

Not included:

- grocery lists
- real nutrition database integration
- image-based meal recognition
- LLM meal generation
- clinical diet planning

## 4. Preconditions

- Authenticated user exists.
- `UserProfile`, `FitnessProfile`, and `NutritionProfile` exist.
- Macro targets can be calculated.

## 5. Postconditions

- A weekly `NutritionPlan` is persisted.
- The plan stores macro target snapshot used at generation time.
- The active plan can be retrieved by current-plan and today-nutrition use cases.

## 6. Related Entities

- `NutritionPlan`
- `NutritionDay`
- `Meal`
- `MealOption`
- `FoodItem`
- `MacroTargets`

## 7. Important Decisions

- The weekly plan is persisted to preserve stable user experience and explainability.
- Macro targets are recalculable but snapshot into the plan.
- Meal generation must never violate allergies or dietary restrictions.
- Disliked foods should be avoided when possible and reported if unavoidable.

## 8. Summary

This use case creates the persistent weekly nutrition artifact that future nutrition flows depend on.
