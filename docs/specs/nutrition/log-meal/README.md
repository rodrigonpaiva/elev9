# Log Meal

## 1. Overview

```txt
Bounded Context: nutrition
Module: nutrition
Use-case: log-meal
Canonical name: nutrition.log-meal
```

## 2. Goal

Record the user's completion status for a planned meal so today nutrition, adherence, dashboard signals, and recommendations can use recent nutrition behavior.

## 3. MVP Scope

Included:

- log status `consumed`, `partial`, or `skipped`
- optional actual macro override
- one log per meal per day
- authenticated ownership

Not included:

- food barcode scanning
- image recognition
- detailed ingredient tracking

## 4. Preconditions

- Active nutrition plan exists.
- Meal belongs to the authenticated user's plan.

## 5. Postconditions

- A `NutritionLog` is persisted or updated.
- Today nutrition can reflect progress.
