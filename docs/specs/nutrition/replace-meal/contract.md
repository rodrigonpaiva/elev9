# Contract

## REST Contract

```txt
POST /nutrition/meals/:mealId/replace
Authorization: Bearer <accessToken>
```

```json
{
  "reason": "I want a lighter option"
}
```

## Domain Input

```ts
type ReplaceMealInput = {
  authUserId: string;
  mealId: string;
  reason?: string;
};
```

## Domain Output

```ts
type ReplaceMealOutput = {
  meal: Meal;
  replacement: {
    previousMeal: Meal;
    reason?: string;
    replacedAt: string;
  };
};
```

## HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
USER_PROFILE_NOT_FOUND -> 404
NUTRITION_PLAN_NOT_FOUND -> 404
MEAL_NOT_FOUND -> 404
MEAL_REPLACEMENT_NOT_AVAILABLE -> 422
MEAL_REPLACEMENT_UNSAFE -> 422
REPLACE_MEAL_INTERNAL_ERROR -> 500
```

## Fields That Must Never Be Returned

- raw active plan document
- internal scoring details
- other users' meals
