# Contract

## Input

- authenticated user context or `authUserId`
- optional replay/debug input for historical rebuilds

## Output

```ts
{
  habitSnapshot: HabitSnapshot;
}
```

## Canonical Read Model

`HabitSnapshot` is the daily source of truth for consistency scoring and trend derivation.
