# Contract - Replay Coach Decision

## Objective

Recompute a stored `CoachDecision` and compare the result with the persisted one.

## Input

- authenticated `authUserId`
- `decisionId`

## Output

```ts
{
  original: CoachDecision;
  recalculated: CoachDecision;
  drift: {
    priorityChanged: boolean;
    headlineChanged: boolean;
    summaryChanged: boolean;
    actionItemsChanged: boolean;
    influencesChanged: boolean;
    formulaVersionChanged: boolean;
  };
}
```

## REST Contract

```txt
GET /ai/coach-decision/debug/:id/replay
```

Optional internal build route:

```txt
POST /ai/coach-decision/build
```

