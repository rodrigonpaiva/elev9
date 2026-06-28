# Contract

## Input

- authenticated user context

## Output

```ts
{
  habitSnapshot: HabitSnapshot;
}
```

## Behavior

If no snapshot exists, the engine may build one from the canonical build flow.
