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
  items: Array<{
    type:
      | 'weight_target'
      | 'workout_count'
      | 'streak'
      | 'adherence'
      | 'recovery'
      | 'custom';
    title: string;
    targetValue: number;
    achieved: boolean;
    achievedAt?: string;
  }>;
}
```
