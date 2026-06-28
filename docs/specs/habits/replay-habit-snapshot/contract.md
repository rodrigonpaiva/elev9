# Contract

## Input

- authenticated user context
- habit snapshot id

## Output

```ts
{
  persisted: HabitSnapshot;
  recalculated: HabitSnapshotRecalculated;
  comparison: ReplayComparison;
  replayedAt: string;
}
```

## Behavior

Replay uses persisted reduced source context only.
