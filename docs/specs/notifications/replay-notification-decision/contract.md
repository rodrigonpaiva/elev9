# Contract - Replay Notification Decision

## Objective

Compare a persisted notification decision with a recalculated one.

## Input

- authenticated `authUserId`
- decision `id`

## Output

```ts
{
  persisted: NotificationDecision;
  recalculated: NotificationDecisionRecalculatedResult;
  comparison: NotificationDecisionReplayComparison;
  replayedAt: string;
}
```

## REST Contract

```txt
GET /notifications/debug/:id/replay
```
