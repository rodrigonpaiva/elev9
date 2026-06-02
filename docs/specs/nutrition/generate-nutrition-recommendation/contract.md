# Contract

## REST Contract

```txt
POST /nutrition/recommendations
Authorization: Bearer <accessToken>
```

```json
{}
```

## Domain Input

```ts
type GenerateNutritionRecommendationInput = {
  authUserId: string;
};
```

## Domain Output

```ts
type GenerateNutritionRecommendationOutput = {
  message: string;
  recommendations: string[];
  influences: string[];
  generatorVersion: string;
  contextSnapshot: {
    goal?: 'fat_loss' | 'maintenance' | 'muscle_gain';
    adherenceScore?: number;
    todayNutrition?: {
      mealsLogged: number;
      totalMeals: number;
      caloriesPercent: number;
      proteinPercent: number;
    };
    trainingDay?: {
      hasWorkoutToday: boolean;
      intensity?: 'low' | 'moderate' | 'high';
    };
    recovery?: {
      fatigueLevel?: 'LOW' | 'MODERATE' | 'HIGH';
      latestCheckIn?: {
        energyLevel: number;
        sleepQuality: number;
        muscleSoreness: number;
        motivationLevel: number;
      };
    };
  };
};
```

## Response Example

```json
{
  "message": "Keep meals consistent today to support your training rhythm.",
  "recommendations": [
    "Prioritize your next planned meal",
    "Include protein in your next meal",
    "Hydrate before your workout"
  ],
  "influences": ["goal:muscle_gain", "adherence:low", "training:today"],
  "generatorVersion": "nutrition-heuristic-v1",
  "contextSnapshot": {
    "goal": "muscle_gain",
    "adherenceScore": 42
  }
}
```

## HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
USER_PROFILE_NOT_FOUND -> 404
NUTRITION_PROFILE_NOT_FOUND -> 404
NUTRITION_PLAN_NOT_FOUND -> 404
NUTRITION_RECOMMENDATION_INTERNAL_ERROR -> 500
```
