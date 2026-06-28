# Contract

## REST Contract

```txt
GET /nutrition/plans/current
Authorization: Bearer <accessToken>
```

## Domain Input

```ts
type GetCurrentNutritionPlanInput = {
  authUserId: string;
};
```

## Domain Output

```ts
type GetCurrentNutritionPlanOutput = {
  nutritionPlan: NutritionPlanResponse;
};
```

## Success Response Example

```json
{
  "nutritionPlan": {
    "id": "plan_123",
    "status": "active",
    "weekStartDate": "2026-06-01",
    "weekEndDate": "2026-06-07",
    "macroTargets": {
      "calories": 2450,
      "proteinGrams": 152,
      "carbsGrams": 306,
      "fatGrams": 68
    },
    "days": []
  }
}
```

## HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
USER_PROFILE_NOT_FOUND -> 404
NUTRITION_PLAN_NOT_FOUND -> 404
NUTRITION_PLAN_INTERNAL_ERROR -> 500
```

## Fields That Must Never Be Returned

- `authUserId`
- raw persistence documents
- internal meal scoring details
