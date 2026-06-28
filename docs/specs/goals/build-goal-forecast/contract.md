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
  predictedCompletionDate?: string;
  confidence: "low" | "medium" | "high";
  estimatedDaysRemaining: number;
  generatedAt: string;
  formulaVersion: string;
}
```

## Persisted Entity

`GoalForecast`

```ts
{
  goalId: string;
  userProfileId: string;
  predictedCompletionDate?: string;
  confidence: "low" | "medium" | "high";
  estimatedDaysRemaining: number;
  generatedAt: string;
  formulaVersion: string;
}
```
