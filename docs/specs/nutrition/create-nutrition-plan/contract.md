# Contract

## 1. REST Contract

```txt
POST /nutrition/plans
Authorization: Bearer <accessToken>
```

```json
{}
```

## 2. Domain Input

```ts
type CreateNutritionPlanInput = {
  authUserId: string;
  replaceExisting?: boolean;
};
```

## 3. Domain Output

```ts
type CreateNutritionPlanOutput = {
  nutritionPlan: {
    id: string;
    userProfileId: string;
    nutritionProfileId: string;
    fitnessProfileId: string;
    status: 'active';
    weekStartDate: string;
    weekEndDate: string;
    macroTargets: MacroTargets;
    days: NutritionDay[];
    generatedBy: 'deterministic';
    createdAt: string;
  };
};
```

## 4. REST Response Example

```json
{
  "nutritionPlan": {
    "id": "plan_123",
    "userProfileId": "profile_123",
    "nutritionProfileId": "nutrition_123",
    "fitnessProfileId": "fitness_123",
    "status": "active",
    "weekStartDate": "2026-06-01",
    "weekEndDate": "2026-06-07",
    "macroTargets": {
      "calories": 2450,
      "proteinGrams": 152,
      "carbsGrams": 306,
      "fatGrams": 68
    },
    "days": [],
    "generatedBy": "deterministic",
    "createdAt": "2026-06-02T10:00:00.000Z"
  }
}
```

## 5. Domain Types

```ts
type NutritionDay = {
  date: string;
  dayIndex: number;
  meals: Meal[];
  dailyMacroTargets: MacroTargets;
};

type Meal = {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  description: string;
  foodItems: FoodItem[];
  estimatedMacros: MacroTargets;
  alternatives: MealOption[];
  status: 'planned' | 'replaced';
};
```

## 6. HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
USER_PROFILE_NOT_FOUND -> 404
FITNESS_PROFILE_NOT_FOUND -> 404
NUTRITION_PROFILE_NOT_FOUND -> 404
NUTRITION_PLAN_ALREADY_EXISTS -> 409
NUTRITION_PLAN_UNSAFE_MEAL_TEMPLATE -> 422
NUTRITION_PLAN_INTERNAL_ERROR -> 500
```

## 7. Fields That Must Never Be Returned

- `authUserId`
- raw Mongoose documents
- access token
- hidden meal scoring internals
