# Contract

## 1. Use Case Name

```txt
nutrition.calculate-macro-targets
```

## 2. REST Contract

```txt
POST /nutrition/macro-targets/calculate
Authorization: Bearer <accessToken>
```

The body is optional in the MVP.

```json
{}
```

## 3. Domain Input

```ts
type CalculateMacroTargetsInput = {
  authUserId: string;
};
```

## 4. Domain Output

```ts
type CalculateMacroTargetsOutput = {
  macroTargets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  calculation: {
    method: 'mifflin_st_jeor';
    activityMultiplier: number;
    calorieAdjustment: number;
    fallbackUsed: boolean;
    fallbackReasons: string[];
    source: {
      age?: number;
      gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
      heightCm?: number;
      weightKg?: number;
      goal?: 'fat_loss' | 'maintenance' | 'muscle_gain';
      activityLevel?: 'low' | 'medium' | 'high';
    };
  };
};
```

## 5. Success Response Example

```json
{
  "macroTargets": {
    "calories": 2450,
    "proteinGrams": 152,
    "carbsGrams": 306,
    "fatGrams": 68
  },
  "calculation": {
    "method": "mifflin_st_jeor",
    "activityMultiplier": 1.55,
    "calorieAdjustment": 250,
    "fallbackUsed": false,
    "fallbackReasons": [],
    "source": {
      "age": 32,
      "gender": "male",
      "heightCm": 178,
      "weightKg": 76,
      "goal": "muscle_gain",
      "activityLevel": "medium"
    }
  }
}
```

## 6. Fields That Must Never Be Returned

- `authUserId`
- access token
- raw password fields
- raw internal repository documents

## 7. Error Response Shape

```ts
type CalculateMacroTargetsErrorResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

## 8. HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
USER_PROFILE_NOT_FOUND -> 404
FITNESS_PROFILE_NOT_FOUND -> 404
NUTRITION_PROFILE_NOT_FOUND -> 404
MACRO_TARGETS_INSUFFICIENT_DATA -> 422
MACRO_TARGETS_INTERNAL_ERROR -> 500
```

## 9. Domain Notes

- If required profile data is missing but fallback is allowed, the use case returns targets with `fallbackUsed: true`.
- If the missing data makes the calculation unsafe for MVP, return `MACRO_TARGETS_INSUFFICIENT_DATA`.
- The first implementation should prefer transparent fallback metadata over hidden defaults.
