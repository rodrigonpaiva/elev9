# Contract

## Input

```ts
{
  authUserId: string;
  limit?: number;
}
```

## Output

```ts
{
  items: Array<{
    id: string;
    userProfileId: string;
    type:
      | 'lose_weight'
      | 'gain_muscle'
      | 'maintain_weight'
      | 'improve_consistency'
      | 'improve_recovery';
    status: 'active' | 'achieved' | 'abandoned';
    startDate: string;
    targetDate?: string;
    achievedAt?: string;
    targetValue?: number;
    createdAt: string;
    updatedAt: string;
  }>;
  limit: number;
}
```
