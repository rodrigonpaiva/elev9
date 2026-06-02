# Contract

## REST Contract

```txt
POST /nutrition/logs
Authorization: Bearer <accessToken>
```

```json
{
  "mealId": "meal_123",
  "status": "consumed",
  "actualMacros": {
    "calories": 620,
    "proteinGrams": 42,
    "carbsGrams": 72,
    "fatGrams": 18
  }
}
```

## Domain Input

```ts
type LogMealInput = {
  authUserId: string;
  mealId: string;
  status: 'consumed' | 'partial' | 'skipped';
  actualMacros?: MacroTargets;
};
```

## Domain Output

```ts
type LogMealOutput = {
  nutritionLog: {
    id: string;
    userProfileId: string;
    nutritionPlanId: string;
    mealId: string;
    date: string;
    status: 'consumed' | 'partial' | 'skipped';
    plannedMacros: MacroTargets;
    actualMacros: MacroTargets;
    createdAt: string;
    updatedAt: string;
  };
};
```

## HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
USER_PROFILE_NOT_FOUND -> 404
NUTRITION_PLAN_NOT_FOUND -> 404
MEAL_NOT_FOUND -> 404
LOG_MEAL_INVALID_INPUT -> 400
LOG_MEAL_INTERNAL_ERROR -> 500
```
