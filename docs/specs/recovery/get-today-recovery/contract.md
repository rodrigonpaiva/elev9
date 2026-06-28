## Contract

### REST Contract

`GET /recovery/today`

### Response

```ts
{
  recoverySnapshot: {
    userProfileId: string;
    date: string;
    readinessScore: number;
    fatigueScore: number;
    recoveryTrend: 'improving' | 'stable' | 'declining';
    recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
    influences: RecoveryInfluence[];
    formulaVersion: string;
    sourceContext: object;
    createdAt: Date;
  };
}
```

### Domain Contract

If today's snapshot is missing, the read path may invoke the deterministic builder once and then persist the result, provided the operation remains idempotent for the same user and date.
