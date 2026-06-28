# Generate Nutrition Recommendation

## 1. Overview

```txt
Bounded Context: nutrition
Module: nutrition
Use-case: generate-nutrition-recommendation
Canonical name: nutrition.generate-nutrition-recommendation
```

## 2. Goal

Generate a deterministic nutrition recommendation from goal, today nutrition, recent logs, adherence, training day, recovery/fatigue signals, and nutrition profile.

## 3. MVP Scope

Included:

- deterministic recommendation generation
- influences
- generator version
- reduced context snapshot
- optional persistence for history

Not included:

- LLM-first nutrition coaching
- medical diagnosis
- detailed clinical diet advice

## 4. Preconditions

- Authenticated user exists.
- Nutrition profile exists.
- Today nutrition can be resolved.

## 5. Postconditions

- Recommendation is returned.
- Recommendation can be persisted for history and explainability.

## 6. Related Entities

- `NutritionRecommendation`
- `NutritionProfile`
- `NutritionPlan`
- `NutritionLog`
- `TrainingPlan`
- `DailyCheckIn`

## 7. Summary

This use case provides nutrition-specific adaptive coaching while staying deterministic, explainable, and compatible with the existing AI and Dashboard architecture.
