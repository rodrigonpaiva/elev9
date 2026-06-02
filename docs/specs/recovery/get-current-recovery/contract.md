## Contract

### REST Contract

`GET /recovery/current`

### Preconditions

- authenticated session
- at least one recovery snapshot exists for the user, or the caller receives a not-found response

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

Return the latest persisted snapshot for the current user, ordered by date and creation time.

