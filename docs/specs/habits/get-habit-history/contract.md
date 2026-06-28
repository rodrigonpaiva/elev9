# Contract

## Input

- authenticated user context
- optional `limit`

## Output

```ts
{
  habitSnapshots: HabitSnapshot[];
  limit: number;
}
```

## Limits

- default: `14`
- max: `90`
