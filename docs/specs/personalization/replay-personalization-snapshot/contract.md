# Contract

## Input

- authenticated user context
- personalization snapshot id

## Output

```ts
{
  persisted: PersonalizationSnapshot;
  recalculated: PersonalizationSnapshotRecalculated;
  comparison: ReplayComparison;
  replayedAt: string;
}
```

## Behavior

Replay uses persisted reduced source context only.
