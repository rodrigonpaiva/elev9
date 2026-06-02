# Get Today Nutrition

## 1. Overview

```txt
Bounded Context: nutrition
Module: nutrition
Use-case: get-today-nutrition
Canonical name: nutrition.get-today-nutrition
```

## 2. Goal

Return today's macro targets, planned meals, meal logs, progress, next meal, and nutrition focus.

## 3. MVP Scope

Included:

- current day lookup from active plan
- logs for today
- progress calculation
- next planned meal
- deterministic nutrition focus

Not included:

- real-time meal reminders
- push notifications
- wearable or glucose data

## 4. Preconditions

- Authenticated user exists.
- Active nutrition plan exists.

## 5. Postconditions

- No state is modified.
- Dashboard and mobile clients can render a nutrition day summary.

## 6. Related Entities

- `NutritionPlan`
- `NutritionDay`
- `Meal`
- `NutritionLog`
- `NutritionProgress`

## 7. Summary

This use case is the primary read model for the daily nutrition experience.
