# Replace Meal

## 1. Overview

```txt
Bounded Context: nutrition
Module: nutrition
Use-case: replace-meal
Canonical name: nutrition.replace-meal
```

## 2. Goal

Replace a planned meal with a compatible alternative while preserving safety constraints and basic replacement history.

## 3. MVP Scope

Included:

- replace by `mealId`
- deterministic alternative selection
- reason capture
- `replacedAt`
- basic replacement history embedded in the meal or plan

Not included:

- user-generated custom meals
- external recipe search
- LLM-generated alternatives

## 4. Preconditions

- Authenticated user owns the active nutrition plan.
- The meal exists in the active plan.
- A compatible alternative exists.

## 5. Postconditions

- The meal is replaced in the active plan.
- The previous meal is retained in replacement history.
- Updated plan or meal is returned.

## 6. Safety

The replacement must never violate allergies or dietary restrictions. Disliked foods must be avoided when possible.
