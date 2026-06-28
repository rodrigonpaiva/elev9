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

If today’s snapshot is missing, the engine may build it using the canonical build flow.
