# Contract

## REST Contract

```txt
GET /nutrition/today
Authorization: Bearer <accessToken>
```

## Domain Input

```ts
type GetTodayNutritionInput = {
  authUserId: string;
};
```

## Domain Output

```ts
type GetTodayNutritionOutput = {
  todayNutrition: {
    date: string;
    macroTargets: MacroTargets;
    meals: Meal[];
    logs: NutritionLog[];
    progress: {
      calories: MacroProgress;
      protein: MacroProgress;
      carbs: MacroProgress;
      fats: MacroProgress;
      mealsLogged: number;
      totalMeals: number;
      adherenceScore: number;
    };
    nextMeal: Meal | null;
    nutritionFocus: {
      priority: 'recovery' | 'consistency' | 'performance';
      message: string;
      signals: string[];
    };
  };
};
```

## Success Response Example

```json
{
  "todayNutrition": {
    "date": "2026-06-02",
    "macroTargets": {
      "calories": 2450,
      "proteinGrams": 152,
      "carbsGrams": 306,
      "fatGrams": 68
    },
    "meals": [],
    "logs": [],
    "progress": {
      "calories": {
        "target": 2450,
        "actual": 0,
        "remaining": 2450,
        "percent": 0
      },
      "protein": { "target": 152, "actual": 0, "remaining": 152, "percent": 0 },
      "carbs": { "target": 306, "actual": 0, "remaining": 306, "percent": 0 },
      "fats": { "target": 68, "actual": 0, "remaining": 68, "percent": 0 },
      "mealsLogged": 0,
      "totalMeals": 4,
      "adherenceScore": 0
    },
    "nextMeal": null,
    "nutritionFocus": {
      "priority": "consistency",
      "message": "Keep your meals consistent today.",
      "signals": ["no_logs_today"]
    }
  }
}
```

## HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
USER_PROFILE_NOT_FOUND -> 404
NUTRITION_PLAN_NOT_FOUND -> 404
TODAY_NUTRITION_DAY_NOT_FOUND -> 404
TODAY_NUTRITION_INTERNAL_ERROR -> 500
```
