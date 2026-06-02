## Contract

### Use Case Input

- `authUserId: string`
- optional `date?: string`
- optional internal source override for replay/debug only

### Use Case Output

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

### REST Contract

No public REST endpoint is required for the builder in MVP.
This use case can be invoked internally by the read use cases or a future scheduler.

### Domain Contract

The use case must be deterministic and idempotent for the same user and date.

