# Contract

## Input

```ts
{
  authUserId: string;
}
```

## Output

```ts
{
  goalId: string;
  userProfileId: string;
  date: string;
  progressPercentage: number;
  currentValue: number;
  targetValue: number;
  trend: "improving" | "stable" | "declining";
  sourceContext: {
    startValue?: number;
    currentValue?: number;
    targetValue?: number;
    workoutAdherence?: number;
    streak?: number;
    checkInAdherence?: number;
    nutritionAdherence?: number;
    recoveryReadiness?: number;
    recoveryFatigue?: number;
    trainingAdherence?: number;
    generatedAt: string;
  };
  formulaVersion: string;
}
```

## Persisted Entity

`GoalProgressSnapshot`

```ts
{
  goalId: string;
  userProfileId: string;
  date: string;
  progressPercentage: number;
  currentValue: number;
  targetValue: number;
  trend: 'improving' | 'stable' | 'declining';
  sourceContext: Record<string, unknown>;
  formulaVersion: string;
}
```
