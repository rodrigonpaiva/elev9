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
  id: string;
  userProfileId: string;
  type:
    | "lose_weight"
    | "gain_muscle"
    | "maintain_weight"
    | "improve_consistency"
    | "improve_recovery";
  status: "active" | "achieved" | "abandoned";
  startDate: string;
  targetDate?: string;
  achievedAt?: string;
  targetValue?: number;
  createdAt: string;
  updatedAt: string;
}
```
