# Get Current Nutrition Plan

## 1. Overview

```txt
Bounded Context: nutrition
Module: nutrition
Use-case: get-current-nutrition-plan
Canonical name: nutrition.get-current-nutrition-plan
```

## 2. Goal

Return the authenticated user's active weekly nutrition plan.

## 3. MVP Scope

Included:

- active plan lookup
- safe plan response
- user isolation

Not included:

- plan generation
- meal replacement
- adherence calculation

## 4. Preconditions

- Request is authenticated.
- `UserProfile` exists.
- Active `NutritionPlan` exists.

## 5. Postconditions

- No state is modified.
- The current plan is returned for downstream clients and dashboard surfaces.

## 6. Related Entities

- `NutritionPlan`
- `NutritionDay`
- `Meal`

## 7. Summary

This use case is the read surface for the persisted weekly nutrition plan.
