# Flow

## 1. Main Flow

1. Receive an authenticated request.
2. Resolve `UserProfile` from `authUserId`.
3. Load active `FitnessProfile`.
4. Load active `NutritionProfile`.
5. Derive age from `UserProfile.birthDate`.
6. Read gender from `UserProfile.gender`.
7. Read height and weight from `FitnessProfile`.
8. Calculate BMR using Mifflin-St Jeor.
9. Apply activity multiplier.
10. Apply goal calorie adjustment.
11. Calculate protein, fat, and carbs.
12. Return macro targets and calculation snapshot.

## 2. Alternative Flows

### Missing birthDate

- Use deterministic MVP fallback age.
- Mark `fallbackUsed`.
- Add `birthDate_missing` to fallback reasons.

### Missing gender

- Use neutral Mifflin-St Jeor offset.
- Mark `fallbackUsed`.
- Add `gender_missing` to fallback reasons.

### Missing height or weight

- If `FitnessProfile` is absent, return `FITNESS_PROFILE_NOT_FOUND`.
- If profile exists but height or weight is invalid, return `MACRO_TARGETS_INSUFFICIENT_DATA`.

### Missing NutritionProfile

- Return `NUTRITION_PROFILE_NOT_FOUND`.
- Do not infer nutrition goal from fitness goal in this use case.

### Missing FitnessProfile

- Return `FITNESS_PROFILE_NOT_FOUND`.
- Do not calculate macro targets without body metrics.

## 3. Formula

```txt
BMR male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
BMR female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
BMR neutral = 10 * weightKg + 6.25 * heightCm - 5 * age - 78
```

Activity multiplier:

```txt
low -> 1.375
medium -> 1.55
high -> 1.725
```

Goal adjustment:

```txt
fat_loss -> -400 kcal
maintenance -> 0 kcal
muscle_gain -> +250 kcal
```

Macro distribution:

```txt
proteinGrams = round(weightKg * proteinFactor)
fatGrams = round((calories * fatRatio) / 9)
carbsGrams = round((calories - proteinCalories - fatCalories) / 4)
```

Protein factor:

```txt
fat_loss -> 2.0 g/kg
maintenance -> 1.6 g/kg
muscle_gain -> 2.0 g/kg
```

Fat ratio:

```txt
fat_loss -> 0.25
maintenance -> 0.30
muscle_gain -> 0.25
```

## 4. Flow Guarantees

- The same input context produces the same output.
- All fallback reasons are explicit.
- No LLM is used.
