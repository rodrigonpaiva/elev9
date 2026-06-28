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
    goalId: string;
    achievedAt: string;
    completionPercentage: number;
    notes?: string;
  }>;
  limit: number;
}
```
