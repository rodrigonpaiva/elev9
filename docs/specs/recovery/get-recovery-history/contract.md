## Contract

### REST Contract

`GET /recovery/history?limit=20`

### Response

```ts
{
  recoverySnapshots: Array<{
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
  }>;
}
```

### Domain Contract

The history must be ordered from newest to oldest and must only contain snapshots owned by the authenticated user.
