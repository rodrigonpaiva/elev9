# Contract

## Input

- authenticated user context

## Output

```ts
{
  habitRiskSignals: HabitRiskSignal[];
}
```

## Behavior

The output is deterministic and based on persisted habit state and reduced source context.
